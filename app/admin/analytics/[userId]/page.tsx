"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ComposedChart,
  Bar,
  ReferenceArea,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { H2_ECONOMICS_TOPICS } from "@/lib/topics";

interface Session {
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  mouse_active_count: number;
  keyboard_active_count: number;
  messages_sent: number;
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

interface StudentData {
  user: { id: string; email: string; created_at: string };
  sessions: Session[];
  topics: TopicData[];
  activity: ActivityPoint[];
  comparison: { avg_hours_week: number; avg_topics: number };
  conversations: { id: string; title: string; updated_at: string }[];
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    loadData(selectedDate);
  }, [userId, selectedDate]);

  async function loadData(date: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/analytics/${userId}?date=${date}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
    setLoading(false);
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-foreground/40 text-sm">Loading user data...</p>
      </div>
    );
  }

  // Build daily study time trend (last 30 days)
  const dailyHours: Record<string, number> = {};
  for (const session of data.sessions) {
    const date = new Date(session.started_at).toISOString().split("T")[0];
    dailyHours[date] = (dailyHours[date] || 0) + session.duration_minutes / 60;
  }

  const trendData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    trendData.push({
      date: dateStr,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      hours: Math.round((dailyHours[dateStr] || 0) * 10) / 10,
    });
  }

  // Engagement quality: active vs idle
  let totalActive = 0;
  let totalIdle = 0;
  for (const point of data.activity) {
    if (point.mouse > 0 || point.keyboard > 0 || point.message > 0) {
      totalActive++;
    } else {
      totalIdle++;
    }
  }

  const engagementData = [
    { name: "Active", value: totalActive, color: "#22c55e" },
    { name: "Idle", value: totalIdle, color: "#374151" },
  ];

  // Topic coverage
  const topicMap = new Map(data.topics.map((t) => [t.topic_key, t]));

  // Idle regions for timeline
  const idleRegions: { start: string; end: string }[] = [];
  let idleStart: string | null = null;
  for (const point of data.activity) {
    if (!point.tabFocused && !idleStart) {
      idleStart = point.time;
    } else if (point.tabFocused && idleStart) {
      idleRegions.push({ start: idleStart, end: point.time });
      idleStart = null;
    }
  }
  if (idleStart && data.activity.length > 0) {
    idleRegions.push({
      start: idleStart,
      end: data.activity[data.activity.length - 1].time,
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/analytics"
          className="text-foreground/40 hover:text-foreground text-sm transition-colors"
        >
          &larr; All Users
        </Link>
        <h2 className="font-serif text-2xl font-bold">{data.user.email}</h2>
      </div>

      <div className="space-y-6">
        {/* Study Time Trend */}
        <div className="rounded-lg border border-foreground/10 p-6">
          <h3 className="font-serif text-lg font-bold mb-4">
            Study Time Trend (30 days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <XAxis
                dataKey="label"
                tick={{ fill: "#f0f4ff", fontSize: 10, opacity: 0.5 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#f0f4ff", fontSize: 10, opacity: 0.5 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a2035",
                  border: "1px solid rgba(240,244,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f0f4ff",
                }}
              />
              <ReferenceLine
                y={data.comparison.avg_hours_week / 7}
                stroke="#d4a017"
                strokeDasharray="3 3"
                label={{
                  value: "Avg",
                  fill: "#d4a017",
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Timeline */}
        <div className="rounded-lg border border-foreground/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-bold">Activity Timeline</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-foreground/10 bg-background px-3 py-1 text-sm text-foreground"
            />
          </div>
          <div className="flex gap-4 text-xs text-foreground/50 mb-4">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#22c55e]" />
              Mouse
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#3b82f6]" />
              Keyboard
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-accent" />
              Question
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#374151]" />
              Idle
            </span>
          </div>
          {data.activity.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data.activity} barGap={0} barCategoryGap={1}>
                {idleRegions.map((region, i) => (
                  <ReferenceArea
                    key={i}
                    x1={region.start}
                    x2={region.end}
                    fill="#374151"
                    fillOpacity={0.3}
                  />
                ))}
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#f0f4ff", fontSize: 10, opacity: 0.5 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={[0, 1.5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a2035",
                    border: "1px solid rgba(240,244,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f0f4ff",
                  }}
                />
                <Bar dataKey="mouse" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="keyboard" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="message" fill="#d4a017" radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-foreground/40 text-sm text-center py-8">
              No activity recorded for this date.
            </p>
          )}
        </div>

        {/* Engagement Quality + Syllabus Coverage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Engagement Pie */}
          <div className="rounded-lg border border-foreground/10 p-6">
            <h3 className="font-serif text-lg font-bold mb-4">
              Engagement Quality
            </h3>
            {totalActive + totalIdle > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={engagementData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      innerRadius={30}
                    >
                      {engagementData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-green-500 font-medium">
                      {totalActive + totalIdle > 0
                        ? Math.round(
                            (totalActive / (totalActive + totalIdle)) * 100
                          )
                        : 0}
                      %
                    </span>
                    <span className="text-foreground/50"> active study</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-foreground/40 font-medium">
                      {totalActive + totalIdle > 0
                        ? Math.round(
                            (totalIdle / (totalActive + totalIdle)) * 100
                          )
                        : 0}
                      %
                    </span>
                    <span className="text-foreground/50"> idle tab</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-foreground/40 text-sm">
                No data for this date.
              </p>
            )}
          </div>

          {/* Topic Coverage */}
          <div className="rounded-lg border border-foreground/10 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-lg font-bold">
                Topic Coverage
              </h3>
              <span className="text-sm text-foreground/40">
                vs avg: {data.comparison.avg_topics}
              </span>
            </div>
            <div className="space-y-3">
              {Object.entries(H2_ECONOMICS_TOPICS).map(
                ([categoryKey, category]) => (
                  <div key={categoryKey}>
                    <p className="text-xs text-foreground/50 mb-1">
                      {category.label}
                    </p>
                    <div className="space-y-1">
                      {Object.entries(category.topics).map(
                        ([topicKey, topic]) => {
                          const mentions =
                            topicMap.get(topicKey)?.total_mentions || 0;
                          const strength =
                            mentions === 0
                              ? 0
                              : mentions <= 3
                                ? 25
                                : mentions <= 10
                                  ? 60
                                  : 100;
                          const color =
                            mentions === 0
                              ? "bg-foreground/10"
                              : mentions <= 3
                                ? "bg-red-500"
                                : mentions <= 10
                                  ? "bg-amber-500"
                                  : "bg-green-500";

                          return (
                            <div key={topicKey} className="flex items-center gap-2">
                              <span className="text-xs text-foreground/60 w-28 truncate">
                                {topic.label}
                              </span>
                              <div className="flex-1 h-1.5 rounded-full bg-foreground/5">
                                <div
                                  className={`h-full rounded-full ${color}`}
                                  style={{ width: `${strength}%` }}
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="rounded-lg border border-foreground/10 p-6">
          <h3 className="font-serif text-lg font-bold mb-4">
            Recent Conversations
          </h3>
          {data.conversations.length === 0 ? (
            <p className="text-foreground/40 text-sm">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {data.conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="rounded-md p-3 bg-foreground/5 text-sm"
                >
                  <p className="font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
