import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";

// Service role client — explicit filtering replaces RLS for consistency
// with the rest of the API routes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  let userId: string;
  let orgId: string;
  try {
    ({ userId, orgId } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // CRITICAL: filter by both user_id and org_id — a user in org A cannot
  // see conversations from org B even if they share the same user account
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  let userId: string;
  let orgId: string;
  try {
    ({ userId, orgId } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // CRITICAL: store org_id on creation so this conversation is scoped
  // to the correct organization
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .insert({ user_id: userId, org_id: orgId, title: "New Conversation" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
