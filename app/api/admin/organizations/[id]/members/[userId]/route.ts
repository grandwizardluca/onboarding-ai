import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ id: string; userId: string }> };

/**
 * DELETE /api/admin/organizations/[id]/members/[userId]
 * Remove a member from an org.
 */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id: orgId, userId } = await params;

  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
