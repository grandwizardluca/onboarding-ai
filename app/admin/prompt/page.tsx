"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { PageLoader } from "@/components/PageLoader";

export default function PromptPage() {
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadPrompt();
  }, []);

  async function loadPrompt() {
    const res = await fetch("/api/admin/prompt");
    if (res.ok) {
      const data = await res.json();
      setContent(data.content);
      setUpdatedAt(data.updated_at);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);

    const res = await fetch("/api/admin/prompt", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      setUpdatedAt(new Date().toISOString());
      showToast("System prompt saved successfully", "success");
    } else {
      showToast("Failed to save system prompt", "error");
    }

    setSaving(false);
  }

  if (loading) {
    return <PageLoader label="Loading prompt" />;
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl font-bold">Edit System Prompt</h2>
        <button
          onClick={handleSave}
          disabled={saving}
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

      {updatedAt && (
        <p className="text-foreground/40 text-xs mb-4">
          Last updated: {new Date(updatedAt).toLocaleString()}
        </p>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded-lg border border-white/[0.12] bg-background px-4 py-3 text-sm text-foreground font-mono leading-relaxed outline-none transition-[border-color,box-shadow] duration-300 focus:border-foreground/40 focus:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] resize-y"
        style={{ minHeight: "400px" }}
      />
    </div>
  );
}
