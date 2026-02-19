import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { computeSessions } from "@/lib/sessions";

export async function GET(request: NextRequest) {
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

    // Default: last 30 days
    const from =
      request.nextUrl.searchParams.get("from") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to =
      request.nextUrl.searchParams.get("to") || new Date().toISOString();

    const sessions = await computeSessions(user.id, from, to);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Sessions API error:", error);
    return NextResponse.json(
      { error: "Failed to compute sessions" },
      { status: 500 }
    );
  }
}
