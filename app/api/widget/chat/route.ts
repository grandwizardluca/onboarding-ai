import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";
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
    // 2. Parse body — extension sends history + current message + optional context
    const { message, messages: history, pageContext, workflowContext, conversationId: incomingConvId, deviceId } = (await request.json()) as {
      message: string;
      messages: { role: "user" | "assistant"; content: string }[];
      pageContext?: { url: string; domain: string; title: string };
      workflowContext?: {
        totalSteps: number;
        currentStep: number;
        completedSteps: number[];
        steps: { id: number; title: string; instructions: string; sites: string; completed: boolean }[];
      };
      conversationId?: string;
      deviceId?: string;
    };

    if (!message?.trim()) {
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    // 2b. Get or create a conversation record for persistence
    let convId: string | null = null;
    if (incomingConvId) {
      // Verify this conversation belongs to this org
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", incomingConvId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (existing) convId = existing.id;
    }
    if (!convId) {
      const { data: newConv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          org_id: orgId,
          title: message.trim().slice(0, 80),
          device_id: deviceId ?? null,
          session_status: "in_progress",
        })
        .select("id")
        .single();
      if (convErr) {
        console.error("[Widget Chat] Failed to create conversation:", convErr.message, convErr.details);
      } else if (newConv) {
        console.log("[Widget Chat] Conversation created:", newConv.id);
      }
      convId = newConv?.id ?? null;
    }
    if (incomingConvId && convId) {
      console.log("[Widget Chat] Using existing conversation:", convId);
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

    // Build system prompt — append RAG context, workflow context, and page location
    const contextParts: string[] = [];
    if (ragResult.context) contextParts.push(ragResult.context);

    if (workflowContext?.steps?.length) {
      const completedCount = workflowContext.completedSteps.length;
      const percent = Math.round((completedCount / workflowContext.totalSteps) * 100);
      const currentPageUrl = pageContext?.url ?? "";

      const stepLines = workflowContext.steps.map((step) => {
        const marker = step.completed ? "✓" : step.id === workflowContext.currentStep ? "→" : "○";
        const status = step.completed ? "(COMPLETED)" : step.id === workflowContext.currentStep ? "(CURRENT)" : "(PENDING)";
        const details = step.id === workflowContext.currentStep
          ? `\n   Instructions: ${step.instructions}\n   Expected sites: ${step.sites}`
          : "";
        return `${marker} Step ${step.id}: ${step.title} ${status}${details}`;
      }).join("\n");

      const currentStepSites = workflowContext.steps[workflowContext.currentStep]?.sites ?? "";
      const onCorrectSite = currentStepSites
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .some((s) => currentPageUrl.toLowerCase().includes(s));
      const siteNote = currentPageUrl
        ? onCorrectSite
          ? "✓ User is on the correct site for this step"
          : "⚠️ User may not be on the expected site for this step"
        : "";

      contextParts.push(
        `═══ WORKFLOW CONTEXT ═══\nYou are guiding this user through a ${workflowContext.totalSteps}-step onboarding process.\nProgress: ${completedCount} of ${workflowContext.totalSteps} steps complete (${percent}%)\n\n${stepLines}${siteNote ? `\n\nCurrent page: ${currentPageUrl}\n${siteNote}` : ""}`
      );
    } else if (pageContext) {
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

    // Accumulate full response so after() can persist it once the stream is done
    let fullResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullResponse += event.delta.text;
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

    // after() runs after the response stream closes — keeps the function alive
    // long enough to persist messages even on Vercel serverless
    if (convId) {
      after(async () => {
        if (!fullResponse) return;
        const { error: msgErr } = await supabase.from("messages").insert([
          { conversation_id: convId, org_id: orgId, role: "user", content: message.trim() },
          { conversation_id: convId, org_id: orgId, role: "assistant", content: fullResponse },
        ]);
        if (msgErr) {
          console.error("[Widget Chat] Failed to save messages:", msgErr.message);
        } else {
          console.log("[Widget Chat] Messages saved for conversation:", convId);
        }
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);
      });
    }

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-RAG-Sources": sourcesEncoded,
        ...(convId ? { "X-Conversation-Id": convId } : {}),
      },
    });
  } catch (error) {
    console.error("[Widget Chat] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
