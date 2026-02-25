import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ orgSlug: string }> };

/**
 * GET /api/client/[orgSlug]/metrics
 * Returns session metrics + recent sessions for the org dashboard.
 * Requires the requesting user to be a member of this org.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { orgSlug } = await params;

  // 1. Validate auth and get the user's org
  let orgId: string;
  try {
    ({ orgId } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify the requested slug matches the user's org
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, plan, api_key")
    .eq("slug", orgSlug)
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Fetch all metrics in parallel
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    sessionCountResult,
    docCountResult,
    memberCountResult,
    recentConvsResult,
    activeSessionsResult,
  ] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("conversations")
      .select("id, user_id, title, created_at, updated_at")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(20),
    // Active sessions = updated within the last 7 days
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("updated_at", sevenDaysAgo),
  ]);

  const conversations = recentConvsResult.data ?? [];
  const totalSessions = sessionCountResult.count ?? 0;
  const activeSessions = activeSessionsResult.count ?? 0;

  // 4. Enrich recent sessions with user email + message count
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const [{ data: userData }, { count }] = await Promise.all([
        supabase.auth.admin.getUserById(conv.user_id),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("role", "user"),
      ]);

      // Duration: difference between last update and creation
      const createdMs = new Date(conv.created_at).getTime();
      const updatedMs = new Date(conv.updated_at).getTime();
      const durationMins = Math.round((updatedMs - createdMs) / 60_000);

      // Status proxy: active if updated within 7 days
      const isActive = conv.updated_at >= sevenDaysAgo;

      // Completion proxy: sessions with >= 5 user messages are "completed"
      const msgCount = count ?? 0;
      const status = msgCount >= 5 ? "completed" : isActive ? "active" : "idle";

      return {
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        user_email: userData?.user?.email ?? "Unknown",
        message_count: msgCount,
        duration_mins: durationMins,
        status,
      };
    })
  );

  // 5. Compute avg messages per session across all enriched sessions
  const totalMessages = enriched.reduce((sum, s) => sum + s.message_count, 0);
  const avgMessages =
    enriched.length > 0 ? Math.round((totalMessages / enriched.length) * 10) / 10 : 0;

  // Completion rate: % of recent sessions with status "completed"
  const completedCount = enriched.filter((s) => s.status === "completed").length;
  const completionRate =
    enriched.length > 0 ? Math.round((completedCount / enriched.length) * 100) : 0;

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      api_key: org.api_key,
    },
    session_count: totalSessions,
    active_sessions: activeSessions,
    doc_count: docCountResult.count ?? 0,
    member_count: memberCountResult.count ?? 0,
    avg_messages: avgMessages,
    completion_rate: completionRate,
    recent_sessions: enriched,
  });
}
