import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("system_prompts")
    .select("id, content, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch system prompt" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const { content } = await request.json();

  if (!content || !content.trim()) {
    return NextResponse.json(
      { error: "Prompt content cannot be empty" },
      { status: 400 }
    );
  }

  // Get the existing prompt ID to update it (not create a new one)
  const { data: existing } = await supabase
    .from("system_prompts")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

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
    const { error } = await supabase
      .from("system_prompts")
      .insert({ content });

    if (error) {
      return NextResponse.json(
        { error: "Failed to create system prompt" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
