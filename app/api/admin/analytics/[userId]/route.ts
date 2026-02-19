import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeSessions } from "@/lib/sessions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const now = new Date();

    // Get user email
    const {
      data: { user: authUser },
    } = await supabaseAdmin.auth.admin.getUserById(userId);

    // Get sessions for last 30 days
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const sessions = await computeSessions(
      userId,
      thirtyDaysAgo,
      now.toISOString()
    );

    // Get topic coverage
    const { data: topics } = await supabaseAdmin
      .from("conversation_topics")
      .select(
        "topic_key, topic_label, category, mention_count, last_mentioned_at"
      )
      .eq("user_id", userId);

    // Aggregate topics
    const topicMap: Record<
      string,
      {
        topic_key: string;
        topic_label: string;
        category: string;
        total_mentions: number;
        conversation_count: number;
      }
    > = {};

    for (const row of topics || []) {
      if (topicMap[row.topic_key]) {
        topicMap[row.topic_key].total_mentions += row.mention_count;
        topicMap[row.topic_key].conversation_count += 1;
      } else {
        topicMap[row.topic_key] = {
          topic_key: row.topic_key,
          topic_label: row.topic_label,
          category: row.category,
          total_mentions: row.mention_count,
          conversation_count: 1,
        };
      }
    }

    // Get activity events for selected date (default: today)
    const date =
      request.nextUrl.searchParams.get("date") ||
      now.toISOString().split("T")[0];
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const { data: activityEvents } = await supabaseAdmin
      .from("activity_events")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .order("created_at", { ascending: true });

    // Format activity for timeline
    const activity = (activityEvents || []).map((e) => {
      const d = new Date(e.created_at);
      return {
        time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
        timestamp: d.getTime(),
        mouse: e.mouse_active ? 1 : 0,
        keyboard: e.keyboard_active ? 1 : 0,
        message: e.message_sent ? 1.3 : 0,
        tabFocused: e.tab_focused,
      };
    });

    // Compute class averages for comparison
    const { data: allStudents } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "student");

    let avgHoursWeek = 0;
    let avgTopics = 0;
    const studentCount = (allStudents || []).length;

    if (studentCount > 0) {
      const weekAgo = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: allWeekSessions } = await supabaseAdmin
        .from("study_sessions")
        .select("duration_minutes")
        .gte("started_at", weekAgo);

      avgHoursWeek =
        Math.round(
          ((allWeekSessions || []).reduce(
            (sum, s) => sum + s.duration_minutes,
            0
          ) /
            60 /
            studentCount) *
            10
        ) / 10;

      const { data: allTopics } = await supabaseAdmin
        .from("conversation_topics")
        .select("user_id, topic_key");

      const topicsPerUser = new Map<string, Set<string>>();
      for (const t of allTopics || []) {
        if (!topicsPerUser.has(t.user_id)) {
          topicsPerUser.set(t.user_id, new Set());
        }
        topicsPerUser.get(t.user_id)!.add(t.topic_key);
      }
      let totalTopics = 0;
      topicsPerUser.forEach((topics) => (totalTopics += topics.size));
      avgTopics = Math.round((totalTopics / studentCount) * 10) / 10;
    }

    // Get recent conversations
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      user: {
        id: userId,
        email: authUser?.email || "unknown",
        created_at: authUser?.created_at,
      },
      sessions,
      topics: Object.values(topicMap),
      activity,
      comparison: {
        avg_hours_week: avgHoursWeek,
        avg_topics: avgTopics,
      },
      conversations: conversations || [],
    });
  } catch (error) {
    console.error("Admin student analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student analytics" },
      { status: 500 }
    );
  }
}
