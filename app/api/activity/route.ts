import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session cookie
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

    const { mouse, keyboard, tabFocused } = await request.json();

    await supabaseAdmin.from("activity_events").insert({
      user_id: user.id,
      mouse_active: mouse ?? false,
      keyboard_active: keyboard ?? false,
      tab_focused: tabFocused ?? true,
      message_sent: false,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Activity tracking error:", error);
    return NextResponse.json(
      { error: "Failed to record activity" },
      { status: 500 }
    );
  }
}
