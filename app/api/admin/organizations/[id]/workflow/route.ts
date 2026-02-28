import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: org, error } = await supabase
    .from("organizations")
    .select("workflow_config")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[Workflow] GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!org) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  return Response.json({ workflowConfig: org.workflow_config ?? null });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { error } = await supabase
    .from("organizations")
    .update({ workflow_config: body })
    .eq("id", id);

  if (error) {
    console.error("[Workflow] PATCH error:", error);
    return Response.json({ error: "Failed to save workflow" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
