"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { PageLoader } from "@/components/PageLoader";

const DEFAULT_QUIZ_PROMPT =
  "You are a Socratic tutor in quiz mode. RULES: (1) Generate ONE comprehension question testing deep understanding. (2) NEVER ask the same question twice unless the student scored <60% on it previously. After 2-3 similar questions on a subtopic, escalate to harder angles or different subtopics. (3) If student struggles (scores <50%), drill the same concept with simpler phrasing. (4) After evaluating, call record_quiz_score tool with topic_key, subtopic_key, score 0-100, and feedback. (5) Jump straight into questions — NO explanations before asking. The student's learning history: [context will be appended]";

export default function PromptPage() {
  const [content, setContent] = useState("");
  const [quizContent, setQuizContent] = useState("");
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
      setContent(data.content ?? "");
      setQuizContent(data.quiz_system_prompt ?? DEFAULT_QUIZ_PROMPT);
      setUpdatedAt(data.updated_at);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);

    const res = await fetch("/api/admin/prompt", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, quiz_system_prompt: quizContent }),
    });

    if (res.ok) {
      setUpdatedAt(new Date().toISOString());
      showToast("Prompts saved successfully", "success");
    } else {
      showToast("Failed to save prompts", "error");
    }

    setSaving(false);
  }

  if (loading) {
    return <PageLoader label="Loading prompts" />;
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">Edit System Prompts</h2>
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
        <p className="text-foreground/40 text-xs -mt-6">
          Last updated: {new Date(updatedAt).toLocaleString()}
        </p>
      )}

      {/* Chat system prompt */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/70 mb-2">
          Chat Mode System Prompt
        </h3>
        <p className="text-xs text-foreground/40 mb-3">
          Used for all normal tutoring conversations.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg border border-ui bg-background px-4 py-3 text-sm text-foreground font-mono leading-relaxed outline-none transition-[border-color,box-shadow] duration-300 focus:border-foreground/40 resize-y"
          style={{ minHeight: "300px" }}
        />
      </div>

      {/* Quiz system prompt */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/70 mb-2 flex items-center gap-2">
          Quiz Mode System Prompt
          <span className="rounded-full bg-accent/20 border border-accent/40 px-2 py-0.5 text-xs font-semibold text-accent">
            Quiz
          </span>
        </h3>
        <p className="text-xs text-foreground/40 mb-3">
          Used when students enter Quiz Mode. The student&apos;s learning history is appended after this prompt.
        </p>
        <textarea
          value={quizContent}
          onChange={(e) => setQuizContent(e.target.value)}
          className="w-full rounded-lg border border-ui bg-background px-4 py-3 text-sm text-foreground font-mono leading-relaxed outline-none transition-[border-color,box-shadow] duration-300 focus:border-foreground/40 resize-y"
          style={{ minHeight: "240px" }}
        />
      </div>
    </div>
  );
}
