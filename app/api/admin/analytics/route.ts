import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/analytics
 * Returns per-user engagement stats based on conversations + messages.
 * Replaces the old Socratic implementation that used study_sessions / activity_events.
 */
export async function GET() {
  try {
    // Get all memberships (non-platform-admin) with their org
    const { data: memberships, error: membershipsError } = await supabase
      .from("memberships")
      .select("user_id, role, org_id, organizations(name, slug)")
      .neq("role", "platform_admin");

    if (membershipsError) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Get all auth users for email lookup
    const {
      data: { users: authUsers },
    } = await supabase.auth.admin.listUsers();

    const emailMap = new Map<string, string>();
    for (const u of authUsers || []) {
      emailMap.set(u.id, u.email || "Unknown");
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await Promise.all(
      (memberships || []).map(async (m) => {
        const org = m.organizations as unknown as { name: string; slug: string } | null;

        const [sessionsResult, activeResult] = await Promise.all([
          supabase
            .from("conversations")
            .select("id, updated_at")
            .eq("user_id", m.user_id)
            .eq("org_id", m.org_id),
          supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", m.user_id)
            .eq("org_id", m.org_id)
            .gte("updated_at", sevenDaysAgo),
        ]);

        const convos = sessionsResult.data ?? [];
        const sessionCount = convos.length;
        const activeCount = activeResult.count ?? 0;

        const lastActiveAt =
          convos.length > 0
            ? convos.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0].updated_at
            : null;

        let messageCount = 0;
        if (convos.length > 0) {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("conversation_id", convos.map((c) => c.id))
            .eq("role", "user");
          messageCount = count ?? 0;
        }

        return {
          user_id: m.user_id,
          email: emailMap.get(m.user_id) ?? "Unknown",
          org_name: org?.name ?? "Unknown",
          org_slug: org?.slug ?? "",
          session_count: sessionCount,
          active_sessions: activeCount,
          message_count: messageCount,
          last_active_at: lastActiveAt,
        };
      })
    );

    result.sort((a, b) => {
      if (!a.last_active_at && !b.last_active_at) return 0;
      if (!a.last_active_at) return 1;
      if (!b.last_active_at) return -1;
      return b.last_active_at.localeCompare(a.last_active_at);
    });

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
