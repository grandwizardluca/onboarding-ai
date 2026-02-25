import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/organizations/[id]
 * Returns org details, metrics, and document list — all fetched in parallel.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const [
    orgResult,
    docCountResult,
    chunkCountResult,
    sessionCountResult,
    memberCountResult,
    docsResult,
  ] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", id).single(),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", id),
    supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("org_id", id),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", id),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("org_id", id),
    supabase
      .from("documents")
      .select("id, title, source, chunk_count, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (orgResult.error || !orgResult.data) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({
    org: orgResult.data,
    doc_count: docCountResult.count ?? 0,
    chunk_count: chunkCountResult.count ?? 0,
    session_count: sessionCountResult.count ?? 0,
    member_count: memberCountResult.count ?? 0,
    documents: docsResult.data ?? [],
  });
}

/**
 * PATCH /api/admin/organizations/[id]
 * Update name and/or plan. Re-slugifies if name changes.
 * Body: { name?: string, plan?: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { name, plan } = await request.json();

  const updates: Record<string, string> = {};
  if (name) {
    updates.name = name.trim();
    updates.slug = slugify(name.trim());
  }
  if (plan) {
    updates.plan = plan;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select("id, name, slug, plan")
    .single();

  if (error) {
    console.error("Failed to update organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/organizations/[id]
 * Deletes the org row. All child data cascades automatically.
 */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete organization:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
