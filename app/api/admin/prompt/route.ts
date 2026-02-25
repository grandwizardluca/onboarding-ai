import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  let query = supabase
    .from("system_prompts")
    .select("id, content, updated_at");

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch system prompt" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? { content: "", updated_at: null });
}

export async function PUT(request: NextRequest) {
  const { content, orgId } = await request.json();

  if (!content || !content.trim()) {
    return NextResponse.json(
      { error: "Prompt content cannot be empty" },
      { status: 400 }
    );
  }

  // Get the existing prompt for this org
  let existingQuery = supabase
    .from("system_prompts")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (orgId) {
    existingQuery = existingQuery.eq("org_id", orgId);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("system_prompts")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update system prompt" },
        { status: 500 }
      );
    }
  } else {
    const insertPayload: Record<string, unknown> = {
      content,
    };
    if (orgId) insertPayload.org_id = orgId;

    const { error } = await supabase
      .from("system_prompts")
      .insert(insertPayload);

    if (error) {
      return NextResponse.json(
        { error: "Failed to create system prompt" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
