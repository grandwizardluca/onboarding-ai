import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = { params: Promise<{ orgSlug: string }> };

async function resolveOrg(orgSlug: string, orgId: string) {
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, workflow_config")
    .eq("slug", orgSlug)
    .single();

  if (error || !org) return null;
  if (org.id !== orgId) return null;
  return org;
}

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

  return NextResponse.json({ workflowConfig: org.workflow_config ?? null });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { error } = await supabase
    .from("organizations")
    .update({ workflow_config: body })
    .eq("id", org.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save workflow" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
