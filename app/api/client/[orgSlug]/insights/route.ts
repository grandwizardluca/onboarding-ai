import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";
import anthropic from "@/lib/anthropic";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ orgSlug: string }> };

async function resolveOrg(orgSlug: string, userOrgId: string) {
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();
  if (!org || org.id !== userOrgId) return null;
  return org;
}

/**
 * Fetch this org's conversation data and format it as structured context
 * for Claude to analyze.
 */
async function buildInsightsContext(orgId: string): Promise<string> {
  // Get all conversations for this org
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!conversations || conversations.length === 0) {
    return "No conversation data available yet. Users haven't started any onboarding sessions.";
  }

  // Get message counts per conversation + recent messages (sample)
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const [{ count: userMsgs }, { count: allMsgs }, { data: sample }] = await Promise.all([
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("role", "user"),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id),
        supabase
          .from("messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .eq("role", "user")
          .order("created_at", { ascending: true })
          .limit(3),
      ]);

      return {
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        user_messages: userMsgs ?? 0,
        total_messages: allMsgs ?? 0,
        sample_questions: (sample ?? []).map((m) => m.content.slice(0, 200)),
      };
    })
  );

  const totalSessions = enriched.length;
  const totalUserMsgs = enriched.reduce((s, c) => s + c.user_messages, 0);
  const avgMsgs =
    totalSessions > 0 ? (totalUserMsgs / totalSessions).toFixed(1) : "0";
  const completedSessions = enriched.filter((c) => c.user_messages >= 5).length;

  const sampleConvos = enriched.slice(0, 20);
  const questionSamples = sampleConvos
    .flatMap((c) =>
      c.sample_questions.map((q) => `- ${q}`)
    )
    .join("\n");

  return `
## Onboarding Analytics Data

**Summary:**
- Total onboarding sessions: ${totalSessions}
- Avg user messages per session: ${avgMsgs}
- Completed sessions (≥5 messages): ${completedSessions} (${totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%)

**Recent Session Titles:**
${enriched
  .slice(0, 10)
  .map((c) => `- "${c.title}" (${c.user_messages} messages, ${new Date(c.created_at).toLocaleDateString()})`)
  .join("\n")}

**Sample User Questions (from recent sessions):**
${questionSamples || "No questions available yet."}
`.trim();
}

/**
 * GET /api/client/[orgSlug]/insights
 * Returns insights conversation history for this org.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { orgSlug } = await params;

  let userId: string;
  let orgId: string;
  try {
    ({ userId, orgId } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveOrg(orgSlug, orgId);
  if (!org) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get or create the insights conversation for this user+org
  const { data: existing } = await supabase
    .from("insights_conversations")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ conversationId: null, messages: [] });
  }

  const { data: messages } = await supabase
    .from("insights_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", existing.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    conversationId: existing.id,
    messages: messages ?? [],
  });
}

/**
 * POST /api/client/[orgSlug]/insights
 * Send a message to the insights AI. Streams the response.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { orgSlug } = await params;

  let userId: string;
  let orgId: string;
  try {
    ({ userId, orgId } = await getAuthContext(request));
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const org = await resolveOrg(orgSlug, orgId);
  if (!org) {
    return new Response("Forbidden", { status: 403 });
  }

  const { message, conversationId: existingConvId } = await request.json();

  if (!message?.trim()) {
    return new Response("Message required", { status: 400 });
  }

  // Get or create insights conversation
  let conversationId = existingConvId;
  if (!conversationId) {
    const { data: newConv, error } = await supabase
      .from("insights_conversations")
      .insert({ org_id: orgId, user_id: userId, type: "client_insights" })
      .select("id")
      .single();

    if (error || !newConv) {
      return new Response("Failed to create conversation", { status: 500 });
    }
    conversationId = newConv.id;
  }

  // Save user message
  await supabase.from("insights_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: message,
  });

  // Load conversation history
  const { data: historyData } = await supabase
    .from("insights_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const history = (historyData ?? [])
    .filter((m) => m.content?.trim())
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Build org data context
  const dataContext = await buildInsightsContext(orgId);

  const systemPrompt = `You are an AI analytics assistant for ${org.name}'s onboarding platform.
You have access to their onboarding session data and help them understand user behavior, identify friction points, and improve their onboarding experience.

Be concise, actionable, and data-driven. When you don't have enough data, say so clearly.

${dataContext}`;

  // Stream response
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: history,
  });

  let fullResponse = "";

  const readableStream = new ReadableStream({
    async start(controller) {
      // Send conversationId as first line so client knows the ID
      controller.enqueue(
        new TextEncoder().encode(`__CONV_ID__:${conversationId}\n`)
      );

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
        await supabase.from("insights_messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: fullResponse,
        });

        // Update conversation timestamp
        await supabase
          .from("insights_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
