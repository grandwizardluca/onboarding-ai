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

function generateApiKey(): string {
  // tss_ prefix + 32 hex chars (from UUID without dashes)
  return `tss_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * GET /api/admin/organizations
 * List all organizations with document and session counts.
 */
export async function GET() {
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      slug,
      plan,
      created_at,
      documents(count),
      conversations(count)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }

  // Flatten the nested Supabase count results into simple numbers
  const flattened = (orgs || []).map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    created_at: org.created_at,
    doc_count: (org.documents as unknown as { count: number }[])[0]?.count ?? 0,
    session_count: (org.conversations as unknown as { count: number }[])[0]?.count ?? 0,
  }));

  return NextResponse.json(flattened);
}

/**
 * POST /api/admin/organizations
 * Create a new organization.
 * Body: { name: string, plan?: string }
 */
export async function POST(request: NextRequest) {
  const { name, plan } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Organization name is required" },
      { status: 400 }
    );
  }

  const slug = slugify(name.trim());
  const api_key = generateApiKey();

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: name.trim(),
      slug,
      plan: plan || "free_pilot",
      api_key,
    })
    .select("id, name, slug, plan, api_key, created_at")
    .single();

  if (error) {
    console.error("Failed to create organization:", error);
    // Slug uniqueness conflict
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `An organization with slug "${slug}" already exists` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
