"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StudentRow {
  user_id: string;
  email: string;
  status: "studying_now" | "active_today" | "active_this_week" | "inactive";
  last_active_at: string | null;
  hours_this_week: number;
  streak_days: number;
  total_topics: number;
  total_messages: number;
  alert: "declining" | "inactive_3_days" | null;
}

const statusConfig = {
  studying_now: { label: "Studying Now", color: "bg-green-500" },
  active_today: { label: "Active Today", color: "bg-blue-500" },
  active_this_week: { label: "This Week", color: "bg-amber-500" },
  inactive: { label: "Inactive", color: "bg-foreground/20" },
};

export default function AdminAnalyticsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch {}
    setLoading(false);
  }

  const alerts = students.filter((s) => s.alert);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-foreground/40 text-sm">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold mb-6">Student Analytics</h2>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((student) => (
            <div
              key={student.user_id}
              className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-3"
            >
              <span className="text-red-400 text-lg">!</span>
              <div className="text-sm">
                <span className="font-medium">{student.email}</span>
                {student.alert === "inactive_3_days" ? (
                  <span className="text-foreground/50">
                    {" "}
                    — has not studied in 3+ days
                  </span>
                ) : (
                  <span className="text-foreground/50">
                    {" "}
                    — study time declined significantly this week
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student table */}
      {students.length === 0 ? (
        <p className="text-foreground/40 text-sm">No students found.</p>
      ) : (
        <div className="rounded-lg border border-foreground/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-xs text-foreground/50">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden sm:table-cell">
                  Hours/Week
                </th>
                <th className="px-4 py-3 hidden sm:table-cell">Streak</th>
                <th className="px-4 py-3 hidden md:table-cell">Topics</th>
                <th className="px-4 py-3 hidden md:table-cell">Questions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const statusInfo = statusConfig[student.status];
                return (
                  <tr
                    key={student.user_id}
                    className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/analytics/${student.user_id}`}
                        className="text-sm hover:text-accent transition-colors"
                      >
                        {student.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-sm">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${statusInfo.color}`}
                        />
                        <span className="text-foreground/60">
                          {statusInfo.label}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60 hidden sm:table-cell">
                      {student.hours_this_week}h
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60 hidden sm:table-cell">
                      {student.streak_days}d
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60 hidden md:table-cell">
                      {student.total_topics}/12
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60 hidden md:table-cell">
                      {student.total_messages}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
