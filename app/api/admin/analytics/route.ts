import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get all student profiles
    const { data: students, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, created_at")
      .eq("role", "student");

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const twoWeeksAgo = new Date(
      now.getTime() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();
    const threeDaysAgo = new Date(
      now.getTime() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Get email addresses from auth.users via admin API
    const {
      data: { users: authUsers },
    } = await supabaseAdmin.auth.admin.listUsers();

    const emailMap = new Map<string, string>();
    for (const u of authUsers || []) {
      emailMap.set(u.id, u.email || "unknown");
    }

    const result = [];

    for (const student of students || []) {
      const userId = student.id;

      // Get latest activity event
      const { data: latestActivity } = await supabaseAdmin
        .from("activity_events")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Determine status
      let status: "studying_now" | "active_today" | "active_this_week" | "inactive" =
        "inactive";
      const lastActiveAt = latestActivity?.created_at || null;

      if (lastActiveAt) {
        if (lastActiveAt >= fiveMinAgo) status = "studying_now";
        else if (lastActiveAt >= todayStart.toISOString()) status = "active_today";
        else if (lastActiveAt >= weekAgo) status = "active_this_week";
      }

      // Get study sessions for this week
      const { data: weekSessions } = await supabaseAdmin
        .from("study_sessions")
        .select("duration_minutes")
        .eq("user_id", userId)
        .gte("started_at", weekAgo);

      const hoursThisWeek =
        Math.round(
          ((weekSessions || []).reduce(
            (sum, s) => sum + s.duration_minutes,
            0
          ) /
            60) *
            10
        ) / 10;

      // Get study sessions for last week (for decline detection)
      const { data: lastWeekSessions } = await supabaseAdmin
        .from("study_sessions")
        .select("duration_minutes")
        .eq("user_id", userId)
        .gte("started_at", twoWeeksAgo)
        .lt("started_at", weekAgo);

      const hoursLastWeek =
        (lastWeekSessions || []).reduce(
          (sum, s) => sum + s.duration_minutes,
          0
        ) / 60;

      // Get topic coverage count
      const { data: topicData } = await supabaseAdmin
        .from("conversation_topics")
        .select("topic_key")
        .eq("user_id", userId);

      const uniqueTopics = new Set(
        (topicData || []).map((t) => t.topic_key)
      ).size;

      // Get message count
      const { data: userConvos } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("user_id", userId);

      let totalMessages = 0;
      if (userConvos && userConvos.length > 0) {
        const { count } = await supabaseAdmin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in(
            "conversation_id",
            userConvos.map((c) => c.id)
          )
          .eq("role", "user");
        totalMessages = count || 0;
      }

      // Calculate streak
      const { data: allSessions } = await supabaseAdmin
        .from("study_sessions")
        .select("started_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });

      const daysWithSessions = new Set<string>();
      for (const s of allSessions || []) {
        daysWithSessions.add(
          new Date(s.started_at).toISOString().split("T")[0]
        );
      }

      let streakDays = 0;
      const checkDate = new Date(now);
      checkDate.setHours(0, 0, 0, 0);
      const todayStr = checkDate.toISOString().split("T")[0];
      if (!daysWithSessions.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (daysWithSessions.has(checkDate.toISOString().split("T")[0])) {
        streakDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // Determine alerts
      let alert: "declining" | "inactive_3_days" | null = null;
      if (!lastActiveAt || lastActiveAt < threeDaysAgo) {
        alert = "inactive_3_days";
      } else if (hoursLastWeek > 0 && hoursThisWeek < hoursLastWeek * 0.5) {
        alert = "declining";
      }

      result.push({
        user_id: userId,
        email: emailMap.get(userId) || "unknown",
        status,
        last_active_at: lastActiveAt,
        hours_this_week: hoursThisWeek,
        streak_days: streakDays,
        total_topics: uniqueTopics,
        total_messages: totalMessages,
        alert,
      });
    }

    return NextResponse.json({ students: result });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
