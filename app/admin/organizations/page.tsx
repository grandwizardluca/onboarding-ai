"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  doc_count: number;
  session_count: number;
}

const PLAN_LABELS: Record<string, string> = {
  free_pilot: "Free Pilot",
  pro: "Pro",
};

const PLAN_STYLES: Record<string, string> = {
  free_pilot: "bg-amber-50 text-amber-700 border-amber-200",
  pro: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlan, setNewPlan] = useState("free_pilot");
  const [createError, setCreateError] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    setLoading(true);
    const res = await fetch("/api/admin/organizations");
    if (res.ok) {
      const data = await res.json();
      setOrgs(data);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    const res = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, plan: newPlan }),
    });

    if (res.ok) {
      const org = await res.json();
      setShowModal(false);
      setNewName("");
      setNewPlan("free_pilot");
      // Navigate directly to the new org's detail page
      router.push(`/admin/organizations/${org.id}`);
    } else {
      const data = await res.json();
      setCreateError(data.error || "Failed to create organization");
    }

    setCreating(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-bold">Organizations</h2>
          <p className="text-sm text-foreground/50 mt-0.5">
            {orgs.length} {orgs.length === 1 ? "organization" : "organizations"}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-accent/85 hover:shadow-md"
        >
          <span className="text-lg leading-none">+</span>
          New Organization
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div className="rounded-lg border border-ui bg-ui-1 p-12 text-center">
          <p className="text-foreground/40 text-sm">No organizations yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Create your first organization →
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-ui overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ui bg-ui-1 text-left text-xs font-medium text-foreground/50 uppercase tracking-wider">
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3 hidden sm:table-cell">Documents</th>
                <th className="px-5 py-3 hidden md:table-cell">Sessions</th>
                <th className="px-5 py-3 hidden lg:table-cell">Created</th>
                <th className="px-5 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ui">
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  onClick={() => router.push(`/admin/organizations/${org.id}`)}
                  className="bg-background hover:bg-ui-1 cursor-pointer transition-colors duration-150"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-foreground/40 mt-0.5">{org.slug}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        PLAN_STYLES[org.plan] ?? "bg-ui-1 text-foreground/60 border-ui"
                      }`}
                    >
                      {PLAN_LABELS[org.plan] ?? org.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-sm text-foreground/70">
                    {org.doc_count}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-sm text-foreground/70">
                    {org.session_count}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-xs text-foreground/40">
                    {formatDate(org.created_at)}
                  </td>
                  <td className="px-5 py-4 text-foreground/30 text-sm">→</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create org modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowModal(false); setCreateError(""); }}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-md rounded-xl border border-ui bg-background shadow-xl animate-fade-in-up">
            <div className="p-6">
              <h3 className="font-serif text-lg font-bold mb-1">New Organization</h3>
              <p className="text-sm text-foreground/50 mb-5">
                A slug and API key will be generated automatically.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Organization name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                    autoFocus
                    className="w-full rounded-lg border border-ui bg-ui-1 px-3 py-2.5 text-sm outline-none transition-[border-color] duration-200 focus:border-accent placeholder:text-foreground/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Plan</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full rounded-lg border border-ui bg-ui-1 px-3 py-2.5 text-sm outline-none transition-[border-color] duration-200 focus:border-accent"
                  >
                    <option value="free_pilot">Free Pilot</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>

                {createError && (
                  <p className="text-sm text-red-500">{createError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setCreateError(""); }}
                    className="flex-1 rounded-lg border border-ui px-4 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-ui-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-accent/85 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? "Creating..." : "Create Organization"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
