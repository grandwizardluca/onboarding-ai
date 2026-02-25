"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  api_key: string;
  created_at: string;
}

interface Document {
  id: string;
  title: string;
  source: string;
  chunk_count: number;
  created_at: string;
}

interface Member {
  user_id: string;
  email: string;
  role: string;
  joined_at: string;
}

interface PageData {
  org: OrgDetail;
  doc_count: number;
  chunk_count: number;
  session_count: number;
  member_count: number;
  documents: Document[];
}

const PLAN_LABELS: Record<string, string> = {
  free_pilot: "Free Pilot",
  pro: "Pro",
};

const PLAN_STYLES: Record<string, string> = {
  free_pilot: "bg-amber-50 text-amber-700 border-amber-200",
  pro: "bg-blue-50 text-blue-700 border-blue-200",
};

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ui bg-ui-1 px-5 py-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-foreground/50 mt-0.5">{label}</p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrgDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("member");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Delete state
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/organizations/${id}`);
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setEditName(d.org.name);
      setEditPlan(d.org.plan);
    }
    setLoading(false);
  }, [id]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    const res = await fetch(`/api/admin/organizations/${id}/members`);
    if (res.ok) setMembers(await res.json());
    setMembersLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    loadMembers();
  }, [load, loadMembers]);

  async function handleCopyKey() {
    if (!data) return;
    await navigator.clipboard.writeText(data.org.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    const res = await fetch(`/api/admin/organizations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, plan: editPlan }),
    });

    if (res.ok) {
      const updated = await res.json();
      setData((prev) =>
        prev ? { ...prev, org: { ...prev.org, ...updated } } : prev
      );
      setEditing(false);
    } else {
      const d = await res.json();
      setSaveError(d.error || "Failed to save changes");
    }

    setSaving(false);
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError("");

    const res = await fetch(`/api/admin/organizations/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail, role: addRole }),
    });

    const body = await res.json();

    if (res.ok) {
      setMembers((prev) => [
        ...prev,
        { user_id: body.user_id, email: body.email, role: body.role, joined_at: new Date().toISOString() },
      ]);
      setAddEmail("");
      setAddRole("member");
    } else {
      setAddError(body.error || "Failed to add member");
    }

    setAdding(false);
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    setRemovingId(userId);

    const res = await fetch(`/api/admin/organizations/${id}/members/${userId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    }

    setRemovingId(null);
  }

  async function handleDelete() {
    if (!data || deleteConfirm !== data.org.name) return;
    setDeleting(true);

    const res = await fetch(`/api/admin/organizations/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.push("/admin/organizations");
    } else {
      setDeleting(false);
      alert("Failed to delete organization");
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-24 w-full rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground/40">Organization not found.</p>
        <Link href="/admin/organizations" className="mt-3 text-sm text-accent hover:underline">
          ← Back to Organizations
        </Link>
      </div>
    );
  }

  const { org, doc_count, chunk_count, session_count, member_count, documents } = data;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/admin/organizations"
          className="text-sm text-foreground/40 hover:text-foreground transition-colors"
        >
          ← Organizations
        </Link>

        <div className="flex items-start justify-between mt-2 gap-4">
          {editing ? (
            <form onSubmit={handleSave} className="flex-1 space-y-3 max-w-sm">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-ui bg-ui-1 px-3 py-2 text-lg font-bold outline-none focus:border-accent"
              />
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="w-full rounded-lg border border-ui bg-ui-1 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="free_pilot">Free Pilot</option>
                <option value="pro">Pro</option>
              </select>
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !editName.trim()}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/85 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditName(org.name);
                    setEditPlan(org.plan);
                    setSaveError("");
                  }}
                  className="rounded-lg border border-ui px-4 py-2 text-sm font-medium hover:bg-ui-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-2xl font-bold">{org.name}</h2>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    PLAN_STYLES[org.plan] ?? "bg-ui-1 text-foreground/60 border-ui"
                  }`}
                >
                  {PLAN_LABELS[org.plan] ?? org.plan}
                </span>
              </div>
              <p className="text-sm text-foreground/40 mt-0.5">
                {org.slug} · Created {formatDate(org.created_at)}
              </p>
            </div>
          )}

          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-lg border border-ui px-3 py-1.5 text-sm font-medium hover:bg-ui-1 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Documents" value={doc_count} />
        <MetricCard label="Chunks" value={chunk_count} />
        <MetricCard label="Sessions" value={session_count} />
        <MetricCard label="Members" value={member_count} />
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
          Clients include this key as the <code className="font-mono">X-API-Key</code> header.
        </p>
      </div>

      {/* Members */}
      <div>
        <h3 className="font-semibold text-sm mb-3">
          Members{" "}
          <span className="text-foreground/40 font-normal">({members.length})</span>
        </h3>

        {/* Add member form */}
        <form onSubmit={handleAddMember} className="flex gap-2 mb-4 flex-wrap">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="flex-1 min-w-[200px] rounded-lg border border-ui bg-ui-1 px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-foreground/30"
          />
          <select
            value={addRole}
            onChange={(e) => setAddRole(e.target.value)}
            className="rounded-lg border border-ui bg-ui-1 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={adding || !addEmail.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? "Adding…" : "Add Member"}
          </button>
        </form>

        {addError && (
          <p className="text-sm text-red-500 mb-3">{addError}</p>
        )}

        <p className="text-xs text-foreground/40 mb-3">
          Users must have an account at <span className="font-mono">/signup</span> before they can be added.
        </p>

        {membersLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-lg border border-ui bg-ui-1 p-6 text-center">
            <p className="text-sm text-foreground/40">No members yet. Add one above.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-ui overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ui bg-ui-1 text-left text-xs font-medium text-foreground/50 uppercase tracking-wider">
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Joined</th>
                  <th className="px-5 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ui">
                {members.map((m) => (
                  <tr key={m.user_id} className="bg-background">
                    <td className="px-5 py-3 text-sm">{m.email}</td>
                    <td className="px-5 py-3 text-sm text-foreground/60 capitalize">
                      {m.role}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-xs text-foreground/40">
                      {formatDate(m.joined_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        disabled={removingId === m.user_id}
                        className="text-xs text-foreground/30 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {removingId === m.user_id ? "…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents */}
      <div>
        <h3 className="font-semibold text-sm mb-3">
          Documents{" "}
          <span className="text-foreground/40 font-normal">({doc_count})</span>
        </h3>

        {documents.length === 0 ? (
          <div className="rounded-lg border border-ui bg-ui-1 p-8 text-center">
            <p className="text-sm text-foreground/40">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-ui overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ui bg-ui-1 text-left text-xs font-medium text-foreground/50 uppercase tracking-wider">
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Source</th>
                  <th className="px-5 py-3 hidden md:table-cell">Chunks</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui">
                {documents.map((doc) => (
                  <tr key={doc.id} className="bg-background">
                    <td className="px-5 py-3 text-sm font-medium">{doc.title}</td>
                    <td className="px-5 py-3 hidden sm:table-cell text-xs text-foreground/40 font-mono truncate max-w-[200px]">
                      {doc.source}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-sm text-foreground/70">
                      {doc.chunk_count}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-foreground/40">
                      {formatDate(doc.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-red-200 dark:border-red-900/40 p-5">
        <h3 className="font-semibold text-sm text-red-600 dark:text-red-400 mb-1">
          Danger Zone
        </h3>
        <p className="text-sm text-foreground/50 mb-4">
          Permanently delete this organization and all associated documents, chunks,
          conversations, and members. This cannot be undone.
        </p>

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Delete Organization
          </button>
        ) : (
          <div className="space-y-3 max-w-sm">
            <p className="text-sm text-foreground/70">
              Type <strong>{org.name}</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={org.name}
              className="w-full rounded-lg border border-ui bg-ui-1 px-3 py-2 text-sm outline-none focus:border-red-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== org.name || deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? "Deleting…" : "Confirm Delete"}
              </button>
              <button
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirm("");
                }}
                className="rounded-lg border border-ui px-4 py-2 text-sm font-medium hover:bg-ui-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
