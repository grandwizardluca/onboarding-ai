import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Resolve org_id from X-API-Key header
async function resolveOrgId(request: Request): Promise<string | null> {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey?.trim()) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("api_key", apiKey.trim())
    .maybeSingle();

  return org?.id ?? null;
}

/**
 * GET /api/widget/progress?deviceId=xxx
 * Returns current step and completed steps for this device + org.
 */
export async function GET(request: Request) {
  const orgId = await resolveOrgId(request);
  if (!orgId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const deviceId = new URL(request.url).searchParams.get("deviceId");
  if (!deviceId) return Response.json({ error: "Missing deviceId" }, { status: 400 });

  // Upsert so first call always returns a row
  const { data, error } = await supabase
    .from("workflow_progress")
    .upsert(
      { org_id: orgId, device_id: deviceId, updated_at: new Date().toISOString() },
      { onConflict: "org_id,device_id", ignoreDuplicates: true }
    )
    .select("current_step, completed_steps")
    .maybeSingle();

  if (error) {
    console.error("[Progress] GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  // If upsert with ignoreDuplicates returned nothing, fetch separately
  if (!data) {
    const { data: existing } = await supabase
      .from("workflow_progress")
      .select("current_step, completed_steps")
      .eq("org_id", orgId)
      .eq("device_id", deviceId)
      .maybeSingle();

    return Response.json({
      currentStep: existing?.current_step ?? 0,
      completedSteps: existing?.completed_steps ?? [],
    });
  }

  return Response.json({
    currentStep: data.current_step ?? 0,
    completedSteps: data.completed_steps ?? [],
  });
}

/**
 * PATCH /api/widget/progress
 * Body: { deviceId, currentStep?, completedSteps? }
 */
export async function PATCH(request: Request) {
  const orgId = await resolveOrgId(request);
  if (!orgId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    deviceId: string;
    currentStep?: number;
    completedSteps?: number[];
  };

  if (!body.deviceId) return Response.json({ error: "Missing deviceId" }, { status: 400 });

  const patch: Record<string, unknown> = {
    org_id: orgId,
    device_id: body.deviceId,
    updated_at: new Date().toISOString(),
  };
  if (body.currentStep !== undefined) patch.current_step = body.currentStep;
  if (body.completedSteps !== undefined) patch.completed_steps = body.completedSteps;

  const { error } = await supabase
    .from("workflow_progress")
    .upsert(patch, { onConflict: "org_id,device_id" });

  if (error) {
    console.error("[Progress] PATCH error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
