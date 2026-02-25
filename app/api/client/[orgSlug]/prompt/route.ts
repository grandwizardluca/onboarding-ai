import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ orgSlug: string }> };

async function resolveOrg(orgSlug: string, userId: string, orgId: string) {
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (error || !org) return null;
  if (org.id !== orgId) return null;
  return org;
}

/**
 * GET /api/client/[orgSlug]/prompt
 * Returns the system prompt for this org.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { orgSlug } = await params;

  let orgId: string;
  try {
    ({ orgId } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveOrg(orgSlug, "", orgId);
  if (!org) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("system_prompts")
    .select("id, content, updated_at")
    .eq("org_id", org.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to fetch prompt" }, { status: 500 });
  }

  return NextResponse.json(data ?? { content: "", updated_at: null });
}

/**
 * PUT /api/client/[orgSlug]/prompt
 * Updates the system prompt for this org.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { orgSlug } = await params;

  let orgId: string;
  try {
    ({ orgId } = await getAuthContext(request));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveOrg(orgSlug, "", orgId);
  if (!org) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content } = await request.json();

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Prompt content cannot be empty" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("system_prompts")
    .select("id")
    .eq("org_id", org.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("system_prompts")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: "Failed to update prompt" }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("system_prompts")
      .insert({ content, org_id: org.id });

    if (error) {
      return NextResponse.json({ error: "Failed to create prompt" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
