import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { computeSessions } from "@/lib/sessions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const now = new Date();

    // Compute sessions for last 30 days
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const sessions = await computeSessions(user.id, thirtyDaysAgo, now.toISOString());

    // Hours this week (Monday to now)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter(
      (s) => new Date(s.started_at) >= monday
    );
    const hoursThisWeek =
      weekSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60;

    // Hours this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSessions = sessions.filter(
      (s) => new Date(s.started_at) >= monthStart
    );
    const hoursThisMonth =
      monthSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60;

    // Study streak: consecutive days with at least one session (counting back from today)
    const daysWithSessions = new Set<string>();
    for (const session of sessions) {
      const date = new Date(session.started_at).toISOString().split("T")[0];
      daysWithSessions.add(date);
    }

    let streakDays = 0;
    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);

    // Check today first — if no session today, check if yesterday had one (streak is still valid)
    const todayStr = checkDate.toISOString().split("T")[0];
    if (!daysWithSessions.has(todayStr)) {
      // No session today, start counting from yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (daysWithSessions.has(dateStr)) {
        streakDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Total messages sent
    const { count: totalMessages } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", undefined); // We need messages by user, not by conversation

    // Get message count via conversations owned by user
    const { data: userConvos } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("user_id", user.id);

    let messageCount = 0;
    if (userConvos && userConvos.length > 0) {
      const convoIds = userConvos.map((c) => c.id);
      const { count } = await supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convoIds)
        .eq("role", "user");
      messageCount = count || 0;
    }

    // Average session duration
    const avgSessionMinutes =
      sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.duration_minutes, 0) /
          sessions.length
        : 0;

    return NextResponse.json({
      streak_days: streakDays,
      hours_this_week: Math.round(hoursThisWeek * 10) / 10,
      hours_this_month: Math.round(hoursThisMonth * 10) / 10,
      total_sessions: sessions.length,
      total_messages: messageCount,
      avg_session_minutes: Math.round(avgSessionMinutes),
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Failed to compute stats" },
      { status: 500 }
    );
  }
}
