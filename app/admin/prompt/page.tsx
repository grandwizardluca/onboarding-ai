"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { PageLoader } from "@/components/PageLoader";

interface Org {
  id: string;
  name: string;
}

export default function PromptPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    loadPrompt(selectedOrgId);
  }, [selectedOrgId]);

  async function loadOrgs() {
    const res = await fetch("/api/admin/organizations");
    if (res.ok) {
      const data = await res.json();
      const list: Org[] = Array.isArray(data) ? data : (data.organizations ?? []);
      setOrgs(list);
      // Default to first org if any
      if (list.length > 0) {
        setSelectedOrgId(list[0].id);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }

  async function loadPrompt(orgId: string) {
    setLoading(true);
    const url = orgId
      ? `/api/admin/prompt?orgId=${orgId}`
      : "/api/admin/prompt";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setContent(data.content ?? "");
      setUpdatedAt(data.updated_at ?? "");
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);

    const res = await fetch("/api/admin/prompt", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, orgId: selectedOrgId || undefined }),
    });

    if (res.ok) {
      setUpdatedAt(new Date().toISOString());
      showToast("Prompt saved successfully", "success");
    } else {
      showToast("Failed to save prompt", "error");
    }

    setSaving(false);
  }

  if (loading && orgs.length === 0) {
    return <PageLoader label="Loading prompts" />;
  }

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">Edit System Prompts</h2>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="group rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-all duration-300 hover:bg-accent/85 hover:shadow-[0_0_14px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-1.5">
            {saving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                Save Changes
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-0.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </>
            )}
          </span>
        </button>
      </div>

      {/* Org selector */}
      {orgs.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-foreground/60 shrink-0">Organization:</label>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="rounded-lg border border-ui bg-ui-1 px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {updatedAt && (
        <p className="text-foreground/40 text-xs -mt-6">
          Last updated: {new Date(updatedAt).toLocaleString()}
        </p>
      )}

      {/* System prompt textarea */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/70 mb-2">
          Chat System Prompt
          {selectedOrg && (
            <span className="ml-2 font-normal text-foreground/40">— {selectedOrg.name}</span>
          )}
        </h3>
        <p className="text-xs text-foreground/40 mb-3">
          Controls how Tessra responds to users during onboarding conversations for this organization.
        </p>
        {loading ? (
          <div className="skeleton w-full rounded-lg" style={{ minHeight: "300px" }} />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-ui bg-background px-4 py-3 text-sm text-foreground font-mono leading-relaxed outline-none transition-[border-color,box-shadow] duration-300 focus:border-foreground/40 resize-y"
            style={{ minHeight: "300px" }}
            placeholder="Enter the system prompt for this organization's AI assistant..."
          />
        )}
      </div>
    </div>
  );
}
