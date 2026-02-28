import { createClient } from "@supabase/supabase-js";
import anthropic from "@/lib/anthropic";
import { retrieveContext } from "@/lib/rag";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // 1. Auth — look up org from X-API-Key header
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey?.trim()) {
    return Response.json({ error: "Missing X-API-Key header" }, { status: 401 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("api_key", apiKey.trim())
    .maybeSingle();

  if (!org) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const orgId = org.id;

  try {
    // 2. Parse body — extension sends history + current message + optional page context
    const { message, messages: history, pageContext } = (await request.json()) as {
      message: string;
      messages: { role: "user" | "assistant"; content: string }[];
      pageContext?: { url: string; domain: string; title: string };
    };

    if (!message?.trim()) {
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    // 3. Build full conversation for Claude (history + current user message)
    const conversationMessages: { role: "user" | "assistant"; content: string }[] = [
      ...(history || []),
      { role: "user", content: message.trim() },
    ];

    // 4. Load system prompt for this org
    const { data: promptData } = await supabase
      .from("system_prompts")
      .select("content")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const systemPrompt = promptData?.content || "You are a helpful AI onboarding assistant.";

    // 5. Retrieve relevant document chunks (CRITICAL: filtered by orgId)
    const ragResult = await retrieveContext(message.trim(), orgId);

    // Build system prompt — append RAG context and current page location if available
    const contextParts: string[] = [];
    if (ragResult.context) contextParts.push(ragResult.context);
    if (pageContext) {
      contextParts.push(
        `Current page: "${pageContext.title}" — ${pageContext.url}\nDomain: ${pageContext.domain}`
      );
    }
    const fullSystem = contextParts.length > 0
      ? `${systemPrompt}\n\n---\n\n${contextParts.join("\n\n---\n\n")}`
      : systemPrompt;

    // Encode sources for response header (Unicode-safe via Buffer)
    const sourcesEncoded = Buffer.from(JSON.stringify(ragResult.sources)).toString("base64");

    // 6. Stream Claude response
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: fullSystem,
      messages: conversationMessages,
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text));
            }
          }
          controller.close();
        } catch (error) {
          console.error("[Widget Chat] Stream error:", error);
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
    console.error("[Widget Chat] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
