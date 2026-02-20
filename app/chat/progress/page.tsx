"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StudyStats from "@/components/chat/progress/StudyStats";
import ActivityTimeline from "@/components/chat/progress/ActivityTimeline";
import WeeklyHeatmap from "@/components/chat/progress/WeeklyHeatmap";
import TopicCoverage from "@/components/chat/progress/TopicCoverage";
import RecentConversations from "@/components/chat/progress/RecentConversations";

interface Stats {
  streak_days: number;
  hours_this_week: number;
  hours_this_month: number;
  total_sessions: number;
  total_messages: number;
  avg_session_minutes: number;
}

interface Session {
  started_at: string;
  ended_at: string;
  duration_minutes: number;
}

interface TopicData {
  topic_key: string;
  topic_label: string;
  category: string;
  total_mentions: number;
  conversation_count: number;
}

interface ActivityPoint {
  time: string;
  timestamp: number;
  mouse: number;
  keyboard: number;
  message: number;
  tabFocused: boolean;
}

interface ConversationWithTopics {
  id: string;
  title: string;
  updated_at: string;
  topics: string[];
}

interface QuizScore {
  topic_key: string;
  score: number;
}

interface DayData {
  date: string;
  hours: number;
  dayLabel: string;
}

export default function ProgressPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [activityData, setActivityData] = useState<ActivityPoint[]>([]);
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [recentConvos, setRecentConvos] = useState<ConversationWithTopics[]>([]);
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const supabase = createClient();

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const res = await fetch("/api/progress/export-pdf");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `socratic-study-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate PDF. Please try again.");
    }
    setExportingPdf(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadActivityForDate(selectedDate);
  }, [selectedDate]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadTopics(),
      loadSessions(),
      loadActivityForDate(selectedDate),
      loadRecentConversations(),
      loadQuizScores(),
    ]);
    setLoading(false);
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/progress/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  }

  async function loadTopics() {
    try {
      const res = await fetch("/api/progress/topics");
      if (res.ok) {
        const data = await res.json();
        setTopics(data.topics || []);
      }
    } catch {}
  }

  async function loadSessions() {
    try {
      // Get sessions for this week to build the heatmap
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(monday.getDate() - mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const res = await fetch(
        `/api/progress/sessions?from=${monday.toISOString()}&to=${now.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        const sessions: Session[] = data.sessions || [];

        // Build weekly heatmap data
        const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const week: DayData[] = dayLabels.map((label, i) => {
          const date = new Date(monday);
          date.setDate(date.getDate() + i);
          return {
            date: date.toISOString().split("T")[0],
            hours: 0,
            dayLabel: label,
          };
        });

        for (const session of sessions) {
          const sessionDate = new Date(session.started_at)
            .toISOString()
            .split("T")[0];
          const dayEntry = week.find((d) => d.date === sessionDate);
          if (dayEntry) {
            dayEntry.hours =
              Math.round((dayEntry.hours + session.duration_minutes / 60) * 10) /
              10;
          }
        }

        setWeekData(week);
      }
    } catch {}
  }

  async function loadActivityForDate(date: string) {
    try {
      const from = `${date}T00:00:00.000Z`;
      const to = `${date}T23:59:59.999Z`;

      // Fetch raw activity events for the selected date
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: events } = await supabase
        .from("activity_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: true });

      if (!events) {
        setActivityData([]);
        return;
      }

      const points: ActivityPoint[] = events.map((e) => {
        const d = new Date(e.created_at);
        return {
          time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
          timestamp: d.getTime(),
          mouse: e.mouse_active ? 1 : 0,
          keyboard: e.keyboard_active ? 1 : 0,
          message: e.message_sent ? 1.3 : 0, // Taller spike for messages
          tabFocused: e.tab_focused,
        };
      });

      setActivityData(points);
    } catch {}
  }

  async function loadQuizScores() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("quiz_scores")
        .select("topic_key, score")
        .eq("user_id", user.id);

      if (data) setQuizScores(data);
    } catch {}
  }

  async function loadRecentConversations() {
    try {
      const { data: convos } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5);

      if (!convos) return;

      // For each conversation, get its topics
      const withTopics: ConversationWithTopics[] = [];
      for (const conv of convos) {
        const { data: topicRows } = await supabase
          .from("conversation_topics")
          .select("topic_label")
          .eq("conversation_id", conv.id);

        withTopics.push({
          id: conv.id,
          title: conv.title,
          updated_at: conv.updated_at,
          topics: (topicRows || []).map((t) => t.topic_label),
        });
      }

      setRecentConvos(withTopics);
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-foreground/40 text-sm">Loading progress...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print-hidden">
        <h2 className="font-serif text-2xl font-bold">My Progress</h2>
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportingPdf ? "Generating PDF..." : "Export PDF"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Stats */}
        {stats && (
          <StudyStats
            streakDays={stats.streak_days}
            hoursThisWeek={stats.hours_this_week}
            hoursThisMonth={stats.hours_this_month}
            totalSessions={stats.total_sessions}
            totalMessages={stats.total_messages}
            avgSessionMinutes={stats.avg_session_minutes}
          />
        )}

        {/* Weekly Heatmap */}
        {weekData.length > 0 && <WeeklyHeatmap data={weekData} />}

        {/* Activity Timeline */}
        <div>
          <div className="flex items-center gap-3 mb-2 print-hidden">
            <label className="text-sm text-foreground/50">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-foreground/10 bg-background px-3 py-1 text-sm text-foreground"
            />
          </div>
          <ActivityTimeline data={activityData} />
        </div>

        {/* Topic Coverage */}
        <TopicCoverage topics={topics} quizScores={quizScores} />

        {/* Recent Conversations */}
        <RecentConversations conversations={recentConvos} />
      </div>
    </div>
  );
}
