"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Metrics {
  org_count: number;
  doc_count: number;
  chunk_count: number;
  session_count: number;
  recent_sessions: RecentSession[];
}

interface RecentSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_email: string;
  message_count: number;
  org_name: string;
  org_slug: string;
}

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="rounded-lg border border-ui bg-ui-1 px-5 py-4">
      {loading ? (
        <div className="skeleton h-7 w-16 rounded mb-1" />
      ) : (
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      )}
      <p className="text-xs text-foreground/50 mt-0.5">{label}</p>
    </div>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadMetrics();
    loadChatSetting();
  }, []);

  async function loadMetrics() {
    setMetricsLoading(true);
    const res = await fetch("/api/admin/metrics");
    if (res.ok) {
      setMetrics(await res.json());
    }
    setMetricsLoading(false);
  }

  async function loadChatSetting() {
    const res = await fetch("/api/admin/settings?key=student_chat_enabled");
    if (res.ok) {
      const data = await res.json();
      setChatEnabled(data.value === true || data.value === "true");
    }
  }

  async function handleToggle() {
    setToggling(true);
    const newValue = !chatEnabled;

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "student_chat_enabled", value: newValue }),
    });

    if (res.ok) {
      setChatEnabled(newValue);
      showToast(newValue ? "Chat enabled" : "Chat disabled", "success");
    } else {
      showToast("Failed to update setting", "error");
    }

    setToggling(false);
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">Dashboard</h2>
        {/* Chat toggle */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">User Chat</p>
            <p className="text-xs text-foreground/40">
              {chatEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
              chatEnabled
                ? "bg-accent shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                : "bg-foreground/20"
            } ${toggling ? "opacity-50" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                chatEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Organizations" value={metrics?.org_count ?? 0} loading={metricsLoading} />
        <StatCard label="Documents" value={metrics?.doc_count ?? 0} loading={metricsLoading} />
        <StatCard label="Chunks" value={metrics?.chunk_count ?? 0} loading={metricsLoading} />
        <StatCard label="Sessions" value={metrics?.session_count ?? 0} loading={metricsLoading} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/organizations"
          className="group rounded-lg border border-ui bg-ui-1 p-5 transition-colors hover:bg-ui-2"
        >
          <h3 className="font-semibold mb-1">Organizations</h3>
          <p className="text-sm text-foreground/50 group-hover:text-foreground/70 transition-colors">
            Manage clients, plans, and API keys.
          </p>
        </Link>
        <Link
          href="/admin/conversations"
          className="group rounded-lg border border-ui bg-ui-1 p-5 transition-colors hover:bg-ui-2"
        >
          <h3 className="font-semibold mb-1">Conversations</h3>
          <p className="text-sm text-foreground/50 group-hover:text-foreground/70 transition-colors">
            Browse all user sessions and message threads.
          </p>
        </Link>
        <Link
          href="/admin/analytics"
          className="group rounded-lg border border-ui bg-ui-1 p-5 transition-colors hover:bg-ui-2"
        >
          <h3 className="font-semibold mb-1">Analytics</h3>
          <p className="text-sm text-foreground/50 group-hover:text-foreground/70 transition-colors">
            User engagement and activity breakdowns.
          </p>
        </Link>
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Recent Sessions</h3>

        {metricsLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : !metrics?.recent_sessions.length ? (
          <div className="rounded-lg border border-ui bg-ui-1 p-8 text-center">
            <p className="text-sm text-foreground/40">No sessions yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-ui overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ui bg-ui-1 text-left text-xs font-medium text-foreground/50 uppercase tracking-wider">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Organization</th>
                  <th className="px-5 py-3 hidden md:table-cell">Title</th>
                  <th className="px-5 py-3">Messages</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui">
                {metrics.recent_sessions.map((s) => (
                  <tr key={s.id} className="bg-background">
                    <td className="px-5 py-3 text-sm truncate max-w-[160px]">
                      {s.user_email}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <Link
                        href={`/admin/organizations/${s.org_slug}`}
                        className="text-sm text-accent hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.org_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-sm text-foreground/60 truncate max-w-[200px]">
                      {s.title || "Untitled"}
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground/70">
                      {s.message_count}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-foreground/40">
                      {formatRelative(s.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
