import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS for API key lookup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/widget/validate-key
 * Validates a Tessra API key and returns the associated org details.
 * Called by the Chrome extension popup during setup.
 *
 * Headers: X-API-Key: tss_...
 * Returns: { orgId, orgName } | 401
 */
export async function GET(request: Request) {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey || !apiKey.trim()) {
    return Response.json({ error: "Missing X-API-Key header" }, { status: 401 });
  }

  // CRITICAL: look up org by api_key — never trust the client's claimed orgId
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("api_key", apiKey.trim())
    .maybeSingle();

  if (error) {
    console.error("[Widget] validate-key DB error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!org) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  return Response.json({ orgId: org.id, orgName: org.name });
}
