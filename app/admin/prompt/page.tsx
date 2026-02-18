"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

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
    return <p className="text-foreground/40 text-sm">Loading system prompt...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl font-bold">Edit System Prompt</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
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
        className="w-full rounded-lg border border-foreground/20 bg-background px-4 py-3 text-sm text-foreground font-mono leading-relaxed outline-none focus:border-accent resize-y"
        style={{ minHeight: "400px" }}
      />
    </div>
  );
}
