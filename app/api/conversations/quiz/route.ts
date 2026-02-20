import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for existing quiz conversation (singleton per user)
    const { data: existing } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "quiz")
      .single();

    if (existing) {
      return NextResponse.json({ conversationId: existing.id });
    }

    // Create a new quiz conversation
    const { data: newConv, error } = await supabaseAdmin
      .from("conversations")
      .insert({ user_id: user.id, title: "Quiz Mode", type: "quiz" })
      .select("id")
      .single();

    if (error || !newConv) {
      return NextResponse.json(
        { error: "Failed to create quiz conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversationId: newConv.id });
  } catch (error) {
    console.error("Quiz conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
