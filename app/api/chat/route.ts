import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import anthropic from "@/lib/anthropic";
import { retrieveContext } from "@/lib/rag";
import { generateEmbedding } from "@/lib/openai";
import { getAuthContext } from "@/lib/auth-context";

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

  return `The user has attached a file (${fileName}) relevant to their question. Use the excerpts below to inform your answer.\n\n${top3.join("\n\n---\n\n")}`;
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

export async function POST(request: NextRequest) {
  // 1. Authenticate and get org context
  let orgId: string;
  try {
    ({ orgId } = await getAuthContext(request));
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
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

    console.log("[Chat] orgId:", orgId, "conversationId:", conversationId);

    // 3. Save the user's message to the database
    // CRITICAL: include org_id — messages table has org_id NOT NULL
    const { error: userMsgError } = await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      org_id: orgId,
      role: "user",
      content: message,
    });
    if (userMsgError) console.error("[Chat] Failed to save user message:", userMsgError);

    // 4. Load conversation history (last 20 messages)
    const { data: historyData } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    let conversationHistory = (historyData || [])
      .filter((msg) => msg.content && msg.content.trim().length > 0)
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: sanitizeMessage(msg.content),
      }));

    // Trim long conversations: keep first 2 messages (establish context) +
    // last 8 (recent exchange). Prevents context overflow in long widget sessions.
    if (conversationHistory.length > 10) {
      conversationHistory = [
        ...conversationHistory.slice(0, 2),
        ...conversationHistory.slice(-8),
      ];
    }

    // Continuation detection: if the user just typed "continue", expand it
    // so the model knows exactly what to do rather than guessing.
    const lastMsg = conversationHistory[conversationHistory.length - 1];
    if (lastMsg?.role === "user" && lastMsg.content.trim().toLowerCase() === "continue") {
      lastMsg.content = "Please continue your previous explanation.";
    }

    console.log("[Chat] history length (after trimming):", conversationHistory.length);

    // 5. Load the active system prompt for this organization
    // CRITICAL: filter by org_id so each org gets their own configured prompt
    // maybeSingle() returns null (not an error) when no rows exist
    const { data: promptData, error: promptError } = await supabaseAdmin
      .from("system_prompts")
      .select("content")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (promptError) console.error("[Chat] system_prompts error:", promptError);

    const systemPrompt = promptData?.content || "You are a helpful AI assistant.";

    // 7. Retrieve relevant document chunks via RAG
    // CRITICAL: orgId ensures only this org's documents are searched
    console.log("[Chat] Calling retrieveContext with orgId:", orgId, "message:", message.slice(0, 80));
    const ragResult = await retrieveContext(message, orgId);
    console.log("[Chat] ragContext length:", ragResult.context.length, ragResult.context.length === 0 ? "⚠️ EMPTY" : "✓", "sources:", ragResult.sources.length);

    // 8. If the user attached a file, extract text and find relevant chunks
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

    // Encode sources as base64 JSON for the response header (Unicode-safe via Buffer)
    const sourcesEncoded = Buffer.from(JSON.stringify(ragResult.sources)).toString("base64");

    // 9. Build the full system message
    const contextParts = [ragResult.context, attachedContext].filter(Boolean);
    const fullSystem = contextParts.length > 0
      ? `${systemPrompt}\n\n---\n\n${contextParts.join("\n\n---\n\n")}`
      : systemPrompt;

    // 10. Stream response from Claude
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: fullSystem,
      messages: conversationHistory,
    });

    // Create a ReadableStream that sends tokens to the browser
    // and collects the full response for saving to DB
    let fullResponse = "";

    console.log("[API] Chat: stream starting");
    const readableStream = new ReadableStream({
      async start(controller) {
        console.log("[API] Chat: ReadableStream start() called");
        try {
          const MAX_RESPONSE_LENGTH = 6000;
          const TRUNCATION_WARNING =
            "\n\n⚠️ My response is too long for one message. I'll need to break this into parts. Ask me to continue, or rephrase your question to be more specific.";

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullResponse += text;

              if (fullResponse.length > MAX_RESPONSE_LENGTH) {
                controller.enqueue(
                  new TextEncoder().encode(TRUNCATION_WARNING)
                );
                fullResponse += TRUNCATION_WARNING;
                stream.abort();
                break;
              }

              console.log(`[API] Chat: enqueue chunk, text.length=${text.length}, total=${fullResponse.length}`);
              controller.enqueue(new TextEncoder().encode(text));
            }
          }

          console.log(`[API] Chat: stream done. fullResponse.length=${fullResponse.length}`);

          // Save the complete assistant message BEFORE closing the stream.
          // In serverless (Vercel), the process may be killed once the client
          // receives the final byte — awaiting here ensures the write completes.
          // CRITICAL: include org_id — messages table has org_id NOT NULL
          const { error: assistantMsgError } = await supabaseAdmin.from("messages").insert({
            conversation_id: conversationId,
            org_id: orgId,
            role: "assistant",
            content: fullResponse,
          });
          if (assistantMsgError) console.error("[Chat] Failed to save assistant message:", assistantMsgError);

          // Update conversation timestamp
          await supabaseAdmin
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId)
            .eq("org_id", orgId);

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
                    content: `Generate a concise 3-5 word title for an onboarding support conversation that starts with this user question: "${message}". Return ONLY the title, no quotes, no punctuation at the end.`,
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
                .eq("id", conversationId)
                .eq("org_id", orgId);
            } catch {
              // Title generation is not critical — fail silently
            }
          }

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-RAG-Sources": sourcesEncoded,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
