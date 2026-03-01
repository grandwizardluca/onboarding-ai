import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ orgSlug: string }> };

async function resolveOrg(orgSlug: string, orgId: string) {
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();
  if (!org || org.id !== orgId) return null;
  return org;
}

/**
 * GET /api/client/[orgSlug]/conversations
 * - Without ?id: returns all conversations for the org (with message count)
 * - With ?id=<uuid>: returns the full message thread for that conversation
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { orgSlug } = await params;

  let orgId: string;
  try {
    ({ orgId } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveOrg(orgSlug, orgId);
  if (!org) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conversationId = request.nextUrl.searchParams.get("id");

  // Return full message thread for a single conversation
  if (conversationId) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json(messages ?? []);
  }

  // Return all conversations for this org
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, user_id, title, created_at, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }

  const enriched = await Promise.all(
    (conversations ?? []).map(async (conv) => {
      const [userResult, { count }] = await Promise.all([
        conv.user_id
          ? supabase.auth.admin.getUserById(conv.user_id)
          : Promise.resolve({ data: null }),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id),
      ]);

      const userData = (userResult as { data: { user?: { email?: string } } | null }).data;

      return {
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        user_email: userData?.user?.email ?? "Widget session",
        message_count: count ?? 0,
      };
    })
  );

  return NextResponse.json(enriched);
}
