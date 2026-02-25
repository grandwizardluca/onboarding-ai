import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

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
 * GET /api/admin/test-chat/conversations?orgId=xxx
 * Returns test conversations for an org.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request);
    const orgId = new URL(request.url).searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * POST /api/admin/test-chat/conversations
 * Creates a new test conversation for an org.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser(request);
    const { orgId } = await request.json();
    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        org_id: orgId,
        title: "Test Conversation",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
