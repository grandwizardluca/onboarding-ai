import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/metrics
 * Platform-wide stats + recent activity feed for the admin dashboard.
 */
export async function GET() {
  const [
    orgCountResult,
    docCountResult,
    chunkCountResult,
    sessionCountResult,
    recentSessionsResult,
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("document_chunks").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase
      .from("conversations")
      .select("id, user_id, title, created_at, updated_at, org_id, organizations(name, slug)")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  // Enrich recent sessions with user email + message count
  const sessions = recentSessionsResult.data ?? [];

  const enriched = await Promise.all(
    sessions.map(async (conv) => {
      const [userResult, { count }] = await Promise.all([
        conv.user_id
          ? supabase.auth.admin.getUserById(conv.user_id)
          : Promise.resolve({ data: null }),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id),
      ]);

      const org = conv.organizations as unknown as { name: string; slug: string } | null;
      const userData = (userResult as { data: { user?: { email?: string } } | null }).data;

      return {
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        user_email: userData?.user?.email ?? "Widget session",
        message_count: count ?? 0,
        org_name: org?.name ?? "Unknown",
        org_slug: org?.slug ?? "",
      };
    })
  );

  return NextResponse.json({
    org_count: orgCountResult.count ?? 0,
    doc_count: docCountResult.count ?? 0,
    chunk_count: chunkCountResult.count ?? 0,
    session_count: sessionCountResult.count ?? 0,
    recent_sessions: enriched,
  });
}
