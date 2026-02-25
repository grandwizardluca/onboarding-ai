import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export interface AuthContext {
  userId: string;
  orgId: string;
  role: string;
}

// Service role client — bypasses RLS so we can look up memberships
// regardless of the user's own RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Extract the authenticated user's identity and organization from a request.
 *
 * Steps:
 *   1. Validate the session cookie (anon client, reads user JWT)
 *   2. Look up the user's membership row (service role, bypasses RLS)
 *   3. Return { userId, orgId, role }
 *
 * Throws an Error if the user is not authenticated or has no org membership.
 * Callers should catch and return a 401/403 response.
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  // 1. Validate session via the anon client (reads the auth cookie)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Not needed in API routes — middleware handles cookie refresh
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Look up the user's org membership (service role bypasses RLS)
  const { data: membership, error } = await supabaseAdmin
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();

  if (error || !membership) {
    throw new Error("No organization membership found");
  }

  return {
    userId: user.id,
    orgId: membership.org_id,
    role: membership.role,
  };
}
