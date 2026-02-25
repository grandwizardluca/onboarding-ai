"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";

interface UserRow {
  user_id: string;
  email: string;
  org_name: string;
  org_slug: string;
  session_count: number;
  active_sessions: number;
  message_count: number;
  last_active_at: string | null;
}

function formatRelative(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function AnalyticsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uniqueOrgs = Array.from(
    new Map(users.map((u) => [u.org_slug, u.org_name])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = orgFilter
    ? users.filter((u) => u.org_slug === orgFilter)
    : users;

  if (loading) return <PageLoader label="Loading analytics" />;

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-foreground/40 mt-0.5">
            {filtered.length} {filtered.length === 1 ? "user" : "users"}
          </p>
        </div>

        {uniqueOrgs.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-foreground/50">Org:</label>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="rounded-lg border border-ui bg-ui-1 px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="">All organizations</option>
              {uniqueOrgs.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-ui bg-ui-1 p-12 text-center">
          <p className="text-foreground/40 text-sm">No users found.</p>
          <p className="text-foreground/30 text-xs mt-1">
            Add members to an organization to see them here.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-ui overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ui bg-ui-1 text-left text-xs font-medium text-foreground/50 uppercase tracking-wider">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3 hidden sm:table-cell">Organization</th>
                <th className="px-5 py-3">Sessions</th>
                <th className="px-5 py-3 hidden md:table-cell">Messages</th>
                <th className="px-5 py-3 hidden lg:table-cell">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui">
              {filtered.map((user) => (
                <tr
                  key={user.user_id}
                  className="bg-background hover:bg-ui-1 transition-colors duration-150"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/analytics/${user.user_id}`}
                      className="text-sm hover:text-accent hover:underline transition-colors"
                    >
                      {user.email}
                    </Link>
                    {user.active_sessions > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-green-50 border border-green-200 px-1.5 py-0.5 text-xs text-green-700">
                        active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <Link
                      href={`/admin/organizations/${user.org_slug}`}
                      className="text-sm text-accent hover:underline"
                    >
                      {user.org_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-foreground/70">
                    {user.session_count}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-sm text-foreground/70">
                    {user.message_count}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-xs text-foreground/40">
                    {formatRelative(user.last_active_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
