"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  api_key: string;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_email: string;
  message_count: number;
  duration_mins: number;
  status: "completed" | "active" | "idle";
}

interface Metrics {
  org: OrgInfo;
  session_count: number;
  active_sessions: number;
  doc_count: number;
  member_count: number;
  avg_messages: number;
  completion_rate: number;
  recent_sessions: Session[];
}

interface Document {
  id: string;
  title: string;
  source: string;
  chunk_count: number;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  idle: "bg-ui-1 text-foreground/50 border-ui",
};

const PLAN_LABELS: Record<string, string> = {
  free_pilot: "Free Pilot",
  pro: "Pro",
};

function StatCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-ui bg-ui-1 px-5 py-4">
      {loading ? (
        <div className="skeleton h-7 w-16 rounded mb-1" />
      ) : (
        <p className="text-2xl font-bold">{value}</p>
      )}
      <p className="text-xs text-foreground/50 mt-0.5">{label}</p>
      {sub && !loading && (
        <p className="text-xs text-foreground/40 mt-1">{sub}</p>
      )}
    </div>
  );
}

function formatDuration(mins: number) {
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClientDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [docs, setDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // AI Settings state
  const [promptContent, setPromptContent] = useState("");
  const [promptUpdatedAt, setPromptUpdatedAt] = useState("");
  const [promptLoading, setPromptLoading] = useState(true);
  const [promptSaving, setPromptSaving] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    const res = await fetch(`/api/client/${orgSlug}/metrics`);
    if (res.ok) {
      setMetrics(await res.json());
    }
    setMetricsLoading(false);
  }, [orgSlug]);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    const res = await fetch("/api/documents");
    if (res.ok) {
      setDocs(await res.json());
    }
    setDocsLoading(false);
  }, []);

  const loadPrompt = useCallback(async () => {
    setPromptLoading(true);
    const res = await fetch(`/api/client/${orgSlug}/prompt`);
    if (res.ok) {
      const data = await res.json();
      setPromptContent(data.content ?? "");
      setPromptUpdatedAt(data.updated_at ?? "");
    }
    setPromptLoading(false);
  }, [orgSlug]);

  useEffect(() => {
    loadMetrics();
    loadDocs();
    loadPrompt();
  }, [loadMetrics, loadDocs, loadPrompt]);

  async function handleSavePrompt() {
    setPromptSaving(true);
    const res = await fetch(`/api/client/${orgSlug}/prompt`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: promptContent }),
    });
    if (res.ok) {
      setPromptUpdatedAt(new Date().toISOString());
    }
    setPromptSaving(false);
  }

  async function handleCopyKey() {
    if (!metrics) return;
    await navigator.clipboard.writeText(metrics.org.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const newDoc = await res.json();
      setDocs((prev) => [newDoc, ...prev]);
      if (metrics) {
        setMetrics((m) => m ? { ...m, doc_count: m.doc_count + 1 } : m);
      }
    } else {
      const data = await res.json();
      setUploadError(data.error || "Upload failed");
    }

    setUploading(false);
    // Reset file input so the same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeletingId(docId);

    const res = await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: docId }),
    });

    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      if (metrics) {
        setMetrics((m) => m ? { ...m, doc_count: Math.max(0, m.doc_count - 1) } : m);
      }
    }

    setDeletingId(null);
  }

  if (metricsLoading) {
    return (
      <div className="animate-fade-in-up space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground/40 text-sm">Dashboard unavailable.</p>
      </div>
    );
  }

  const { org, session_count, active_sessions, doc_count, member_count, avg_messages, completion_rate, recent_sessions } = metrics;

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl font-bold">{org.name}</h2>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-ui-1 text-foreground/60 border-ui">
              {PLAN_LABELS[org.plan] ?? org.plan}
            </span>
          </div>
          <p className="text-sm text-foreground/40 mt-0.5">Onboarding Dashboard</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Sessions"
          value={session_count}
          sub={`${active_sessions} active this week`}
          loading={false}
        />
        <StatCard
          label="Completion Rate"
          value={`${completion_rate}%`}
          sub="sessions with ≥ 5 messages"
          loading={false}
        />
        <StatCard
          label="Avg Messages"
          value={avg_messages}
          sub="per session"
          loading={false}
        />
        <StatCard
          label="Documents"
          value={doc_count}
          sub={`${member_count} members`}
          loading={false}
        />
      </div>

      {/* Recent sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">
            Recent Sessions{" "}
            <span className="text-foreground/40 font-normal">({session_count})</span>
          </h3>
          <button
            onClick={() => router.push(`/client/${orgSlug}/conversations`)}
            className="text-xs text-accent hover:underline"
          >
            View all →
          </button>
        </div>

        {recent_sessions.length === 0 ? (
          <div className="rounded-lg border border-ui bg-ui-1 p-8 text-center">
            <p className="text-sm text-foreground/40">No sessions yet.</p>
            <p className="text-xs text-foreground/30 mt-1">
              Sessions appear here when users start conversations.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-ui overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ui bg-ui-1 text-left text-xs font-medium text-foreground/50 uppercase tracking-wider">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Messages</th>
                  <th className="px-5 py-3 hidden md:table-cell">Duration</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui">
                {recent_sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="bg-background hover:bg-ui-1 cursor-pointer transition-colors"
                    onClick={() => router.push(`/client/${orgSlug}/conversations`)}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm truncate max-w-[180px]">{s.user_email}</p>
                      <p className="text-xs text-foreground/40 mt-0.5 truncate max-w-[180px]">
                        {s.title || "Untitled session"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status]}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-sm text-foreground/70">
                      {s.message_count}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-sm text-foreground/60">
                      {formatDuration(s.duration_mins)}
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

      {/* Document management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">
            Knowledge Base{" "}
            <span className="text-foreground/40 font-normal">({doc_count})</span>
          </h3>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:bg-accent/85 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading…
                </>
              ) : (
                <>
                  <span className="text-base leading-none">+</span>
                  Upload Document
                </>
              )}
            </button>
          </div>
        </div>

        {uploadError && (
          <p className="text-sm text-red-500 mb-3">{uploadError}</p>
        )}

        <p className="text-xs text-foreground/40 mb-3">
          Accepts .pdf, .txt, .md — max 50 MB
        </p>

        {docsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-lg border border-ui bg-ui-1 p-8 text-center">
            <p className="text-sm text-foreground/40">No documents yet.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-sm text-accent hover:underline"
            >
              Upload your first document →
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-ui overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ui bg-ui-1 text-left text-xs font-medium text-foreground/50 uppercase tracking-wider">
                  <th className="px-5 py-3">Document</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Chunks</th>
                  <th className="px-5 py-3 hidden md:table-cell">Uploaded</th>
                  <th className="px-5 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ui">
                {docs.map((doc) => (
                  <tr key={doc.id} className="bg-background">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-foreground/40 mt-0.5 font-mono">
                        {doc.source}
                      </p>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-sm text-foreground/70">
                      {doc.chunk_count}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-xs text-foreground/40">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="text-xs text-foreground/30 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {deletingId === doc.id ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API Key */}
      <div className="rounded-lg border border-ui bg-ui-1 p-5">
        <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-3">
          API Key
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono border border-ui truncate">
            {org.api_key}
          </code>
          <button
            onClick={handleCopyKey}
            className="shrink-0 rounded-lg border border-ui px-3 py-2 text-sm font-medium hover:bg-background transition-colors min-w-[64px]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-foreground/40 mt-2">
          Use this key as the <code className="font-mono">X-API-Key</code> header when embedding the chat widget.
        </p>
      </div>

      {/* AI Settings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">AI Settings</h3>
            <p className="text-xs text-foreground/40 mt-0.5">
              Customize how Tessra responds to your users.
            </p>
          </div>
          <button
            onClick={handleSavePrompt}
            disabled={promptSaving || promptLoading}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-background transition-all hover:bg-accent/85 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {promptSaving ? "Saving..." : "Save Prompt"}
          </button>
        </div>

        {promptUpdatedAt && (
          <p className="text-xs text-foreground/40 mb-3">
            Last updated: {new Date(promptUpdatedAt).toLocaleString()}
          </p>
        )}

        {promptLoading ? (
          <div className="skeleton w-full rounded-lg" style={{ minHeight: "200px" }} />
        ) : (
          <textarea
            value={promptContent}
            onChange={(e) => setPromptContent(e.target.value)}
            className="w-full rounded-lg border border-ui bg-background px-4 py-3 text-sm text-foreground font-mono leading-relaxed outline-none transition-[border-color,box-shadow] duration-300 focus:border-foreground/40 resize-y"
            style={{ minHeight: "200px" }}
            placeholder="Enter your AI assistant's system prompt. Describe its persona, what it knows, and how it should respond..."
          />
        )}
      </div>
    </div>
  );
}
