import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import anthropic from "@/lib/anthropic";
import { retrieveContext } from "@/lib/rag";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAdminUser(request: NextRequest) {
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (!membership) throw new Error("Forbidden");
  return user;
}

/**
 * POST /api/admin/test-chat
 * Admin RAG test: send a message scoped to a specific org's documents.
 * orgId is provided explicitly (not derived from membership).
 */
export async function POST(request: NextRequest) {
  let user: { id: string };
  try {
    user = await getAdminUser(request);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { conversationId, orgId, message } = await request.json() as {
      conversationId: string;
      orgId: string;
      message: string;
    };

    if (!conversationId || !orgId || !message?.trim()) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      org_id: orgId,
      role: "user",
      content: message,
    });

    // Load conversation history
    const { data: historyData } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationHistory = (historyData ?? [])
      .filter((m) => m.content?.trim())
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Load system prompt for this org
    const { data: promptData } = await supabase
      .from("system_prompts")
      .select("content")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const systemPrompt = promptData?.content || "You are a helpful AI assistant.";

    // RAG retrieval scoped to this org
    const ragContext = await retrieveContext(message, orgId);

    const fullSystem = ragContext
      ? `${systemPrompt}\n\n---\n\n${ragContext}`
      : systemPrompt;

    // Stream response
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: fullSystem,
      messages: conversationHistory,
    });

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

          // Save assistant response
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            org_id: orgId,
            role: "assistant",
            content: fullResponse,
          });

          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId)
            .eq("org_id", orgId);
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Test chat error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
