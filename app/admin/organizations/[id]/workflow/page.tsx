"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface WorkflowStep {
  id: number;
  title: string;
  instructions: string;
  sites: string;         // comma-separated domains, e.g. "godaddy.com, namecheap.com"
  completion_criteria: string;
}

interface WorkflowConfig {
  steps: WorkflowStep[];
}

let nextStepId = Date.now();
function newStep(): WorkflowStep {
  return { id: nextStepId++, title: "", instructions: "", sites: "", completion_criteria: "" };
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function WorkflowPage() {
  const params = useParams();
  const id = params.id as string;

  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/organizations/${id}/workflow`);
    if (res.ok) {
      const data = await res.json();
      const config: WorkflowConfig = data.workflowConfig ?? { steps: [] };
      setSteps(config.steps.length > 0 ? config.steps : []);
      if (config.steps.length > 0) setExpanded(config.steps[0].id);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function updateStep(stepId: number, patch: Partial<WorkflowStep>) {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
    setSaveState("idle");
  }

  function addStep() {
    const step = newStep();
    setSteps((prev) => [...prev, step]);
    setExpanded(step.id);
    setSaveState("idle");
  }

  function deleteStep(stepId: number) {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    setSaveState("idle");
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setSaveState("idle");
  }

  function moveDown(index: number) {
    setSteps((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setSaveState("idle");
  }

  async function handleSave() {
    setSaveState("saving");
    const config: WorkflowConfig = { steps };
    const res = await fetch(`/api/admin/organizations/${id}/workflow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (res.ok) {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } else {
      setSaveState("error");
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href={`/admin/organizations/${id}`}
          className="text-sm text-foreground/40 hover:text-foreground transition-colors"
        >
          ← Organization
        </Link>
        <div className="flex items-center justify-between mt-2 gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold">Onboarding Workflow</h2>
            <p className="text-sm text-foreground/40 mt-0.5">
              Define the steps your customers follow to get set up.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/85 disabled:opacity-50 transition-colors"
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save"}
          </button>
        </div>
        {saveState === "error" && (
          <p className="text-sm text-red-500 mt-2">Failed to save. Please try again.</p>
        )}
      </div>

      {/* Steps list */}
      {steps.length === 0 ? (
        <div className="rounded-lg border border-ui bg-ui-1 p-10 text-center">
          <p className="text-sm text-foreground/40 mb-4">No steps yet. Add your first step below.</p>
          <button
            onClick={addStep}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/85 transition-colors"
          >
            + Add First Step
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="rounded-lg border border-ui bg-ui-1 overflow-hidden">
              {/* Step header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-mono text-foreground/30 w-5 text-center shrink-0">
                  {index + 1}
                </span>
                <button
                  onClick={() => setExpanded(expanded === step.id ? null : step.id)}
                  className="flex-1 text-left text-sm font-medium truncate hover:text-accent transition-colors"
                >
                  {step.title || <span className="text-foreground/30 italic">Untitled step</span>}
                </button>
                {/* Move buttons */}
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  title="Move up"
                  className="text-foreground/30 hover:text-foreground disabled:opacity-20 transition-colors px-1"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === steps.length - 1}
                  title="Move down"
                  className="text-foreground/30 hover:text-foreground disabled:opacity-20 transition-colors px-1"
                >
                  ↓
                </button>
                <button
                  onClick={() => deleteStep(step.id)}
                  title="Delete step"
                  className="text-foreground/20 hover:text-red-500 transition-colors text-xs px-1"
                >
                  ✕
                </button>
              </div>

              {/* Expanded fields */}
              {expanded === step.id && (
                <div className="border-t border-ui px-4 pb-4 pt-3 space-y-3 bg-background">
                  <div>
                    <label className="block text-xs font-medium text-foreground/50 uppercase tracking-wider mb-1">
                      Step Title
                    </label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(step.id, { title: e.target.value })}
                      placeholder="e.g. Configure DNS settings"
                      className="w-full rounded-lg border border-ui bg-ui-1 px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-foreground/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground/50 uppercase tracking-wider mb-1">
                      Instructions
                    </label>
                    <textarea
                      value={step.instructions}
                      onChange={(e) => updateStep(step.id, { instructions: e.target.value })}
                      placeholder="What should the customer do on this step?"
                      rows={3}
                      className="w-full rounded-lg border border-ui bg-ui-1 px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-foreground/30 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground/50 uppercase tracking-wider mb-1">
                      Expected Sites
                    </label>
                    <input
                      type="text"
                      value={step.sites}
                      onChange={(e) => updateStep(step.id, { sites: e.target.value })}
                      placeholder="godaddy.com, namecheap.com, cloudflare.com"
                      className="w-full rounded-lg border border-ui bg-ui-1 px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-foreground/30 font-mono"
                    />
                    <p className="text-xs text-foreground/30 mt-1">
                      Comma-separated domains. The overlay shows when the user is on one of these sites.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground/50 uppercase tracking-wider mb-1">
                      Completion Criteria
                    </label>
                    <input
                      type="text"
                      value={step.completion_criteria}
                      onChange={(e) => updateStep(step.id, { completion_criteria: e.target.value })}
                      placeholder="e.g. DNS records added and verified"
                      className="w-full rounded-lg border border-ui bg-ui-1 px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-foreground/30"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {steps.length > 0 && (
        <button
          onClick={addStep}
          className="w-full rounded-lg border border-dashed border-ui py-3 text-sm text-foreground/40 hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          + Add Step
        </button>
      )}
    </div>
  );
}
