import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  ProbationReport,
  type SessionRow,
  type RecentSessionActivity,
  type TopicRow,
} from "@/components/pdf/ProbationReport";
import { computeSessions } from "@/lib/sessions";
import { H2_ECONOMICS_TOPICS } from "@/lib/topics";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-SG", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtShortDate(date: Date): string {
  return date.toLocaleDateString("en-SG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Auth check
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

  // Date range — default: last 30 days
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  const from = fromParam || defaultFrom.toISOString();
  const to = toParam || now.toISOString();

  // Fetch everything in parallel
  const [sessions, eventsResult, topicsResult, convosResult] =
    await Promise.all([
      computeSessions(user.id, from, to),

      supabaseAdmin
        .from("activity_events")
        .select("created_at, mouse_active, keyboard_active, message_sent")
        .eq("user_id", user.id)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: true }),

      supabaseAdmin
        .from("conversation_topics")
        .select(
          "topic_key, topic_label, category, mention_count, last_mentioned_at"
        )
        .eq("user_id", user.id),

      supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("user_id", user.id),
    ]);

  const events = eventsResult.data || [];
  const rawTopics = topicsResult.data || [];
  const convos = convosResult.data || [];

  // Total messages sent (questions asked)
  let totalMessages = 0;
  if (convos.length > 0) {
    const { count } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in(
        "conversation_id",
        convos.map((c) => c.id)
      )
      .eq("role", "user");
    totalMessages = count || 0;
  }

  // Active time: each event = 30s of genuine active engagement
  const totalActiveMinutes = Math.round(events.length * 0.5);
  const totalSessionMinutes = sessions.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  );
  const engagementScore =
    totalSessionMinutes > 0
      ? Math.min(100, Math.round((totalActiveMinutes / totalSessionMinutes) * 100))
      : 0;

  // Sort sessions newest first
  const sortedSessions = [...sessions].sort(
    (a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  // Build session rows — match events to sessions by time window
  const sessionRows: SessionRow[] = sortedSessions.map((session) => {
    const sessionStart = new Date(session.started_at).getTime();
    const sessionEnd = new Date(session.ended_at).getTime();

    const sessionEvents = events.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return t >= sessionStart && t <= sessionEnd;
    });

    // Each event = 30s of active time
    const activeMinutes = Math.round(sessionEvents.length * 0.5);

    return {
      date: fmtShortDate(new Date(session.started_at)),
      startTime: fmtTime(new Date(session.started_at)),
      duration: fmtDuration(session.duration_minutes),
      activeMinutes: fmtDuration(activeMinutes),
      mouseEvents: session.mouse_active_count,
      keyboardEvents: session.keyboard_active_count,
      questions: session.messages_sent,
    };
  });

  // Activity patterns for 5 most recent sessions
  const recentSessionActivity: RecentSessionActivity[] = sortedSessions
    .slice(0, 5)
    .map((session) => {
      const sessionStart = new Date(session.started_at).getTime();
      const sessionEnd = new Date(session.ended_at).getTime();

      const sessionEvents = events.filter((e) => {
        const t = new Date(e.created_at).getTime();
        return t >= sessionStart && t <= sessionEnd;
      });

      // Compute active/idle intervals (gap > 60s = idle boundary)
      let activeIntervals = sessionEvents.length > 0 ? 1 : 0;
      let idleIntervals = 0;
      let inActive = true;

      for (let i = 1; i < sessionEvents.length; i++) {
        const gap =
          new Date(sessionEvents[i].created_at).getTime() -
          new Date(sessionEvents[i - 1].created_at).getTime();

        if (gap > 60_000) {
          // > 60s gap = idle period began
          if (inActive) {
            idleIntervals++;
            inActive = false;
          }
        } else if (!inActive) {
          // Gap closed = new active interval
          activeIntervals++;
          inActive = true;
        }
      }

      // Topics: conversation_topics with last_mentioned_at in or near this session
      const topicsInSession = rawTopics
        .filter((t) => {
          const mentionedAt = new Date(t.last_mentioned_at).getTime();
          return (
            mentionedAt >= sessionStart - 60_000 &&
            mentionedAt <= sessionEnd + 30 * 60_000
          );
        })
        .map((t) => t.topic_label);

      return {
        date: fmtShortDate(new Date(session.started_at)),
        startTime: fmtTime(new Date(session.started_at)),
        duration: fmtDuration(session.duration_minutes),
        activeIntervals,
        idleIntervals,
        topics:
          topicsInSession.length > 0
            ? topicsInSession
            : ["No specific topics recorded"],
      };
    });

  // Aggregate topics from DB
  const topicAgg = new Map<
    string,
    {
      topic_label: string;
      category: string;
      total_mentions: number;
      conversation_count: number;
    }
  >();

  for (const row of rawTopics) {
    const existing = topicAgg.get(row.topic_key);
    if (existing) {
      existing.total_mentions += row.mention_count;
      existing.conversation_count += 1;
    } else {
      topicAgg.set(row.topic_key, {
        topic_label: row.topic_label,
        category: row.category,
        total_mentions: row.mention_count,
        conversation_count: 1,
      });
    }
  }

  // Build all-12-topics list from taxonomy, enriched with DB data
  const topics: TopicRow[] = [];
  for (const [, cat] of Object.entries(H2_ECONOMICS_TOPICS)) {
    for (const [topicKey, topic] of Object.entries(cat.topics)) {
      const agg = topicAgg.get(topicKey);
      const mentions = agg?.total_mentions ?? 0;
      const conversations = agg?.conversation_count ?? 0;

      let status: TopicRow["status"];
      if (mentions === 0) status = "Not Started";
      else if (mentions <= 5) status = "Weak";
      else if (mentions <= 15) status = "Developing";
      else status = "Strong";

      topics.push({
        label: topic.label,
        category: cat.label,
        mentions,
        conversations,
        status,
      });
    }
  }

  const topicsCovered = topics.filter((t) => t.mentions > 0).length;

  // Streak calculation
  const daysWithSessions = new Set(
    sessions.map((s) => new Date(s.started_at).toISOString().split("T")[0])
  );
  let streakDays = 0;
  const checkDate = new Date(now);
  checkDate.setHours(0, 0, 0, 0);
  if (!daysWithSessions.has(checkDate.toISOString().split("T")[0])) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (daysWithSessions.has(checkDate.toISOString().split("T")[0])) {
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const generatedAt = now.toLocaleString("en-SG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Singapore",
  }) + " SGT";

  // Render PDF
  const reportData = {
    studentEmail: user.email ?? "Unknown",
    dateFrom: fmtDate(new Date(from)),
    dateTo: fmtDate(new Date(to)),
    generatedAt,
    stats: {
      streakDays,
      totalSessions: sessions.length,
      totalMessages,
      topicsCovered,
      totalActiveMinutes,
      engagementScore,
    },
    sessions: sessionRows,
    recentSessionActivity,
    topics,
    totalActiveMinutes,
    totalSessionMinutes,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(ProbationReport, reportData) as React.ReactElement<any>
  );

  const filename = `socratic-study-report-${now.toISOString().split("T")[0]}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
