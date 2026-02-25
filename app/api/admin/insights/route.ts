import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import anthropic from "@/lib/anthropic";

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
 * Build a cross-org analytics context for the admin insights AI.
 */
async function buildAdminInsightsContext(): Promise<string> {
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, plan")
    .order("created_at", { ascending: false });

  if (!orgs || orgs.length === 0) {
    return "No organizations found in the platform yet.";
  }

  const orgStats = await Promise.all(
    orgs.map(async (org) => {
      const [{ count: sessions }, { count: docs }, { data: recentConvs }] =
        await Promise.all([
          supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("org_id", org.id),
          supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("org_id", org.id),
          supabase
            .from("conversations")
            .select("id, updated_at")
            .eq("org_id", org.id)
            .order("updated_at", { ascending: false })
            .limit(5),
        ]);

      const convIds = (recentConvs ?? []).map((c) => c.id);
      let userMsgs = 0;
      if (convIds.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .eq("role", "user");
        userMsgs = count ?? 0;
      }

      const lastActive =
        recentConvs && recentConvs.length > 0
          ? recentConvs[0].updated_at
          : null;

      return {
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        sessions: sessions ?? 0,
        docs: docs ?? 0,
        recentUserMsgs: userMsgs,
        lastActive,
      };
    })
  );

  const totalSessions = orgStats.reduce((s, o) => s + o.sessions, 0);
  const totalDocs = orgStats.reduce((s, o) => s + o.docs, 0);

  const orgLines = orgStats
    .map(
      (o) =>
        `- **${o.name}** (${o.plan}): ${o.sessions} sessions, ${o.docs} docs${o.lastActive ? `, last active ${new Date(o.lastActive).toLocaleDateString()}` : ", no activity"}`
    )
    .join("\n");

  return `
## Platform-Wide Analytics

**Summary:**
- Total organizations: ${orgs.length}
- Total onboarding sessions: ${totalSessions}
- Total documents indexed: ${totalDocs}

**Per-Organization Breakdown:**
${orgLines}
`.trim();
}

/**
 * GET /api/admin/insights
 * Returns admin insights conversation history.
 */
export async function GET(request: NextRequest) {
  let user: { id: string };
  try {
    user = await getAdminUser(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("insights_conversations")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "admin_insights")
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
 * POST /api/admin/insights
 * Send a message to the admin cross-org insights AI. Streams the response.
 */
export async function POST(request: NextRequest) {
  let user: { id: string };
  try {
    user = await getAdminUser(request);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { message, conversationId: existingConvId } = await request.json();

  if (!message?.trim()) {
    return new Response("Message required", { status: 400 });
  }

  let conversationId = existingConvId;
  if (!conversationId) {
    const { data: newConv, error } = await supabase
      .from("insights_conversations")
      .insert({ user_id: user.id, type: "admin_insights" })
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

  // Load history
  const { data: historyData } = await supabase
    .from("insights_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const history = (historyData ?? [])
    .filter((m) => m.content?.trim())
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Build cross-org context
  const dataContext = await buildAdminInsightsContext();

  const systemPrompt = `You are an AI analytics assistant for the Tessra platform founder.
You have access to cross-organization data and help identify trends, compare org performance, and suggest product improvements.

Be concise, specific, and actionable. Flag orgs that are underperforming or highly engaged.

${dataContext}`;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: history,
  });

  let fullResponse = "";

  const readableStream = new ReadableStream({
    async start(controller) {
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

        await supabase.from("insights_messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: fullResponse,
        });

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
