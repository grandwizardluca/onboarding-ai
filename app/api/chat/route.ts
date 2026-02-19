import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import anthropic from "@/lib/anthropic";
import { retrieveContext } from "@/lib/rag";
import { extractTopics } from "@/lib/topics";

export const runtime = "nodejs";

// Service role client for DB operations that bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user via their session cookie
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Parse request body
    const { conversationId, message } = await request.json();

    if (!conversationId || !message) {
      return new Response("Missing conversationId or message", { status: 400 });
    }

    // 3. Save the user's message to the database
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    // 3b. Record a message_sent activity event
    await supabaseAdmin.from("activity_events").insert({
      user_id: user.id,
      mouse_active: false,
      keyboard_active: true,
      tab_focused: true,
      message_sent: true,
    });

    // 3c. Extract and upsert topic tags from the message
    const topics = extractTopics(message);
    for (const topic of topics) {
      // Try to update existing row first, insert if not found
      const { data: existing } = await supabaseAdmin
        .from("conversation_topics")
        .select("id, mention_count")
        .eq("conversation_id", conversationId)
        .eq("topic_key", topic.topicKey)
        .single();

      if (existing) {
        await supabaseAdmin
          .from("conversation_topics")
          .update({
            mention_count: existing.mention_count + topic.matchCount,
            last_mentioned_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("conversation_topics").insert({
          conversation_id: conversationId,
          user_id: user.id,
          topic_key: topic.topicKey,
          topic_label: topic.topicLabel,
          category: topic.category,
          mention_count: topic.matchCount,
        });
      }
    }

    // 4. Load the active system prompt
    const { data: promptData } = await supabaseAdmin
      .from("system_prompts")
      .select("content")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const systemPrompt = promptData?.content || "You are a helpful AI tutor.";

    // 5. Retrieve relevant document chunks via RAG
    const ragContext = await retrieveContext(message);

    // 6. Build the full system message
    const fullSystem = ragContext
      ? `${systemPrompt}\n\n---\n\n${ragContext}`
      : systemPrompt;

    // 7. Load conversation history (last 20 messages)
    const { data: historyData } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationHistory = (historyData || []).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // 8. Stream response from Claude
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: fullSystem,
      messages: conversationHistory,
    });

    // 9. Create a ReadableStream that sends tokens to the browser
    // and collects the full response for saving to DB
    let fullResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(new TextEncoder().encode(text));
            }
          }

          controller.close();

          // 10. Save the complete assistant message to the database
          await supabaseAdmin.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: fullResponse,
          });

          // 11. Update conversation timestamp
          await supabaseAdmin
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);

          // 12. Auto-generate title if this is the first exchange
          const { count } = await supabaseAdmin
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conversationId);

          if (count && count <= 2) {
            // First user message + first assistant response = generate title
            try {
              const titleResponse = await anthropic.messages.create({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 30,
                messages: [
                  {
                    role: "user",
                    content: `Generate a concise 3-5 word title for a tutoring conversation that starts with this student question: "${message}". Return ONLY the title, no quotes, no punctuation at the end.`,
                  },
                ],
              });

              const title =
                titleResponse.content[0].type === "text"
                  ? titleResponse.content[0].text.trim()
                  : "New Conversation";

              await supabaseAdmin
                .from("conversations")
                .update({ title })
                .eq("id", conversationId);
            } catch {
              // Title generation is not critical — fail silently
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
