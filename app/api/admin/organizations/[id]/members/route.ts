import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/organizations/[id]/members
 * List all members with their email address and join date.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: orgId } = await params;

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  // Enrich with email from auth
  const enriched = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const { data } = await supabase.auth.admin.getUserById(m.user_id);
      return {
        user_id: m.user_id,
        email: data?.user?.email ?? "Unknown",
        role: m.role,
        joined_at: m.created_at,
      };
    })
  );

  return NextResponse.json(enriched);
}

/**
 * POST /api/admin/organizations/[id]/members
 * Add a member to an org by email address.
 * The user must already have a Supabase Auth account.
 * Body: { email: string, role?: string }
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: orgId } = await params;
  const { email, role = "member" } = await request.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Look up the user by email in auth.users
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers();

  if (listError) {
    return NextResponse.json({ error: "Failed to look up user" }, { status: 500 });
  }

  const authUser = users.find(
    (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
  );

  if (!authUser) {
    return NextResponse.json(
      {
        error: `No account found for "${email}". Ask them to sign up at /signup first.`,
      },
      { status: 404 }
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", authUser.id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "This user is already a member of this organization." },
      { status: 409 }
    );
  }

  const { error: insertError } = await supabase
    .from("memberships")
    .insert({ org_id: orgId, user_id: authUser.id, role });

  if (insertError) {
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }

  return NextResponse.json(
    { user_id: authUser.id, email: authUser.email, role },
    { status: 201 }
  );
}
