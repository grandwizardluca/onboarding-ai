import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import anthropic from "@/lib/anthropic";
import { retrieveContext } from "@/lib/rag";
import { generateEmbedding } from "@/lib/openai";
import { extractSubtopics, TOPIC_KEYS, SUBTOPIC_KEYS } from "@/lib/topics";

export const runtime = "nodejs";

// ── Attached-file helpers ─────────────────────────────────────────────────────

interface AttachedFile {
  name: string;
  content: string; // plain text OR base64 string for PDFs
  isPdf: boolean;
}

/** Split text into ~2000-char chunks (no overlap needed — just context, not indexing) */
function chunkAttachedText(text: string): string[] {
  const CHUNK_SIZE = 2000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Chunk the attached file text, embed each chunk and the user query,
 * return the top-3 most relevant chunks as a formatted context block.
 */
async function retrieveAttachedContext(fileText: string, userMessage: string, fileName: string): Promise<string> {
  const chunks = chunkAttachedText(fileText).slice(0, 10); // cap at 10 chunks
  if (chunks.length === 0) return "";

  const [queryEmbedding, ...chunkEmbeddings] = await Promise.all([
    generateEmbedding(userMessage),
    ...chunks.map((c) => generateEmbedding(c)),
  ]);

  const scored = chunks.map((chunk, i) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunkEmbeddings[i]),
  }));

  scored.sort((a, b) => b.score - a.score);
  const top3 = scored.slice(0, 3).map((s, i) => `[Attached: ${fileName} — excerpt ${i + 1}]\n${s.chunk}`);

  return `The student has attached a file (${fileName}) relevant to their question. Use the excerpts below to inform your answer.\n\n${top3.join("\n\n---\n\n")}`;
}

// ─────────────────────────────────────────────────────────────────────────────

function sanitizeMessage(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")        // Smart single quotes → straight
    .replace(/[\u201C\u201D]/g, '"')        // Smart double quotes → straight
    .replace(/[\u2013\u2014]/g, '-')        // Em/en dashes → hyphen
    .replace(/[\u2026]/g, '...')            // Ellipsis → three dots
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width chars → removed
}

// Service role client for DB operations that bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const QUIZ_SYSTEM_PROMPT_FALLBACK = `You are a Socratic tutor in quiz mode. The student has completed study sessions on H2 Economics topics. Your role:

1. Generate ONE comprehension question testing deep understanding — scenario-based application questions, NOT definition recall.
2. After the student answers, evaluate their response 0-100 based on accuracy, depth of reasoning, and application of concepts.
3. Call the record_quiz_score tool with topic_key, subtopic_key, score, and brief feedback explaining your evaluation.
4. Provide encouraging feedback and offer another question.

Make questions challenging but fair. Focus on higher-order thinking: application, analysis, and evaluation.

CRITICAL: Do NOT explain the topic before asking your question. Jump straight into the scenario-based question. Your role is to TEST understanding, not teach.`;

const RECORD_QUIZ_SCORE_TOOL = {
  name: "record_quiz_score",
  description:
    "Record a quiz score for a specific H2 Economics subtopic after evaluating the student's answer",
  input_schema: {
    type: "object" as const,
    properties: {
      topic_key: {
        type: "string",
        enum: TOPIC_KEYS,
        description: "The main H2 Economics topic key (e.g. demand_supply)",
      },
      subtopic_key: {
        type: "string",
        enum: SUBTOPIC_KEYS,
        description: "The specific subtopic being tested (e.g. elasticities)",
      },
      score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description: "Score out of 100 based on answer quality",
      },
      feedback: {
        type: "string",
        description: "Brief explanation of the score (2-3 sentences)",
      },
    },
    required: ["topic_key", "subtopic_key", "score", "feedback"],
  },
};

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
    const { conversationId, message: rawMessage, attachedFile } = await request.json() as {
      conversationId: string;
      message: string;
      attachedFile?: AttachedFile;
    };

    if (!conversationId || (!rawMessage && !attachedFile)) {
      return new Response("Missing conversationId or message", { status: 400 });
    }

    const message = sanitizeMessage(rawMessage ?? "");

    // 3. Fetch the conversation to determine its type
    const { data: convData } = await supabaseAdmin
      .from("conversations")
      .select("type")
      .eq("id", conversationId)
      .single();

    const conversationType = convData?.type ?? "chat";

    // 4. Save the user's message to the database
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    // 4b. Record a message_sent activity event
    await supabaseAdmin.from("activity_events").insert({
      user_id: user.id,
      mouse_active: false,
      keyboard_active: true,
      tab_focused: true,
      message_sent: true,
    });

    // 4c. Extract and upsert subtopic tags (only for normal chat, not quiz)
    if (conversationType !== "quiz") {
      const subtopics = extractSubtopics(message);
      for (const sub of subtopics) {
        const { data: existing } = await supabaseAdmin
          .from("conversation_topics")
          .select("id, mention_count")
          .eq("conversation_id", conversationId)
          .eq("topic_key", sub.topicKey)
          .eq("subtopic_key", sub.subtopicKey)
          .single();

        if (existing) {
          await supabaseAdmin
            .from("conversation_topics")
            .update({
              mention_count: existing.mention_count + sub.matchCount,
              last_mentioned_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabaseAdmin.from("conversation_topics").insert({
            conversation_id: conversationId,
            user_id: user.id,
            topic_key: sub.topicKey,
            topic_label: sub.topicLabel,
            subtopic_key: sub.subtopicKey,
            category: sub.category,
            mention_count: sub.matchCount,
          });
        }
      }
    }

    // 5. Load conversation history (last 20 messages)
    const { data: historyData } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationHistory = (historyData || [])
      .filter((msg) => msg.content && msg.content.trim().length > 0)
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: sanitizeMessage(msg.content),
      }));

    // ──────────────────────────────────────────────────
    // QUIZ MODE BRANCH
    // ──────────────────────────────────────────────────
    if (conversationType === "quiz") {
      // Load quiz system prompt from DB, fall back to hardcoded default
      const { data: promptRow } = await supabaseAdmin
        .from("system_prompts")
        .select("quiz_system_prompt")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      const baseQuizPrompt =
        promptRow?.quiz_system_prompt?.trim() || QUIZ_SYSTEM_PROMPT_FALLBACK;

      // Build context from all non-quiz conversations for this user
      const { data: otherConvos } = await supabaseAdmin
        .from("conversations")
        .select("id, title")
        .eq("user_id", user.id)
        .neq("type", "quiz");

      let learningContext = "";
      if (otherConvos && otherConvos.length > 0) {
        const contextParts: string[] = [];
        for (const conv of otherConvos) {
          const { data: convMessages } = await supabaseAdmin
            .from("messages")
            .select("role, content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (convMessages && convMessages.length > 0) {
            // Reverse to chronological order
            const ordered = [...convMessages].reverse();
            const excerpt = ordered
              .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
              .join("\n");
            contextParts.push(`[Conversation: ${conv.title}]\n${excerpt}`);
          }
        }
        if (contextParts.length > 0) {
          learningContext =
            "\n\n---\n\nStudent's learning history from study sessions:\n\n" +
            contextParts.join("\n\n");
        }
      }

      const quizSystemPrompt = baseQuizPrompt + learningContext;

      // Non-streaming call with tool support
      const response1 = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        system: quizSystemPrompt,
        messages: conversationHistory,
        tools: [RECORD_QUIZ_SCORE_TOOL],
      });

      let finalText = "";

      if (response1.stop_reason === "tool_use") {
        // Extract text and tool-use blocks
        const toolUseBlock = response1.content.find(
          (b): b is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
            b.type === "tool_use"
        );
        const textBeforeTool = response1.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { type: "text"; text: string }).text)
          .join("");

        // Insert quiz score if tool was called correctly
        let toolResultContent = "Score recorded successfully.";
        if (toolUseBlock && toolUseBlock.name === "record_quiz_score") {
          const input = toolUseBlock.input as {
            topic_key: string;
            subtopic_key: string;
            score: number;
            feedback: string;
          };
          const { error: insertError } = await supabaseAdmin
            .from("quiz_scores")
            .insert({
              user_id: user.id,
              conversation_id: conversationId,
              topic_key: input.topic_key,
              subtopic_key: input.subtopic_key,
              score: input.score,
              feedback: input.feedback,
            });

          if (!insertError) {
            toolResultContent = `Score recorded: ${input.topic_key}/${input.subtopic_key} = ${input.score}/100`;
          }
        }

        // Follow-up call with tool result
        const followUpMessages = [
          ...conversationHistory,
          { role: "assistant" as const, content: response1.content },
          {
            role: "user" as const,
            content: [
              {
                type: "tool_result" as const,
                tool_use_id: toolUseBlock?.id ?? "",
                content: toolResultContent,
              },
            ],
          },
        ];

        const response2 = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 2048,
          system: quizSystemPrompt,
          messages: followUpMessages,
          tools: [RECORD_QUIZ_SCORE_TOOL],
        });

        finalText =
          textBeforeTool +
          response2.content
            .filter((b) => b.type === "text")
            .map((b) => (b as { type: "text"; text: string }).text)
            .join("");
      } else {
        finalText = response1.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { type: "text"; text: string }).text)
          .join("");
      }

      // Save assistant message and update conversation timestamp
      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: finalText,
      });

      await supabaseAdmin
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Return final text as a plain stream so the UI handles it identically
      console.log("[API] Quiz mode: finalText length =", finalText.length);
      const readableStream = new ReadableStream({
        start(controller) {
          console.log("[API] Quiz mode: enqueueing, closing");
          controller.enqueue(new TextEncoder().encode(finalText));
          controller.close();
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // ──────────────────────────────────────────────────
    // NORMAL CHAT BRANCH (existing logic)
    // ──────────────────────────────────────────────────

    // Load the active system prompt
    const { data: promptData } = await supabaseAdmin
      .from("system_prompts")
      .select("content")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const systemPrompt = promptData?.content || "You are a helpful AI tutor.";

    // Retrieve relevant document chunks via RAG
    const ragContext = await retrieveContext(message);

    // If the student attached a file, extract text and find relevant chunks
    let attachedContext = "";
    if (attachedFile) {
      let fileText = "";
      if (attachedFile.isPdf) {
        const pdfParse = require("pdf-parse/lib/pdf-parse");
        const buffer = Buffer.from(attachedFile.content, "base64");
        const result = await pdfParse(buffer);
        fileText = result.text as string;
      } else {
        fileText = attachedFile.content;
      }
      if (fileText.trim().length > 0) {
        attachedContext = await retrieveAttachedContext(fileText, message, attachedFile.name);
      }
    }

    // Build the full system message
    const contextParts = [ragContext, attachedContext].filter(Boolean);
    const fullSystem = contextParts.length > 0
      ? `${systemPrompt}\n\n---\n\n${contextParts.join("\n\n---\n\n")}`
      : systemPrompt;

    // Stream response from Claude
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: fullSystem,
      messages: conversationHistory,
    });

    // Create a ReadableStream that sends tokens to the browser
    // and collects the full response for saving to DB
    let fullResponse = "";

    console.log("[API] Normal chat: stream starting");
    const readableStream = new ReadableStream({
      async start(controller) {
        console.log("[API] Normal chat: ReadableStream start() called");
        try {
          const MAX_RESPONSE_LENGTH = 6000;
          const TRUNCATION_WARNING =
            "\n\n⚠️ My response is too long for one message. I'll need to break this into parts. Ask me to continue, or rephrase your question to be more specific.";
          let truncated = false;

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullResponse += text;

              if (fullResponse.length > MAX_RESPONSE_LENGTH) {
                // Send the warning and stop streaming
                controller.enqueue(
                  new TextEncoder().encode(TRUNCATION_WARNING)
                );
                fullResponse += TRUNCATION_WARNING;
                truncated = true;
                stream.abort();
                break;
              }

              const chunkNum = fullResponse.length;
              console.log(`[API] Normal chat: enqueue chunk, text.length=${text.length}, total=${chunkNum}`);
              controller.enqueue(new TextEncoder().encode(text));
            }
          }

          console.log(`[API] Normal chat: stream done, closing. fullResponse.length=${fullResponse.length}`);
          controller.close();

          // Save the complete assistant message to the database
          await supabaseAdmin.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: fullResponse,
          });

          // Update conversation timestamp
          await supabaseAdmin
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);

          // Auto-generate title if this is the first exchange
          const { count } = await supabaseAdmin
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conversationId);

          if (count && count <= 2) {
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
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
