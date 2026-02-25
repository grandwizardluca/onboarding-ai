import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/me
 * Returns the current user's role and orgSlug.
 * Used by the sidebar to build the Dashboard link.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabaseAdmin
    .from("memberships")
    .select("role, org_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ role: null, orgSlug: null });
  }

  if (membership.role === "platform_admin") {
    return NextResponse.json({ role: "platform_admin", orgSlug: null });
  }

  // Look up the org's slug for non-admin members
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("slug")
    .eq("id", membership.org_id)
    .single();

  return NextResponse.json({
    role: membership.role,
    orgSlug: org?.slug ?? null,
  });
}
