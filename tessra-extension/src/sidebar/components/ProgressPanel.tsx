import React from "react";
import type { WorkflowConfig } from "../../utils/storage";

interface ProgressPanelProps {
  config: WorkflowConfig;
  currentStep: number;
  completedSteps: number[];
  onMarkComplete: () => void;
  onUndo: () => void;
}

export default function ProgressPanel({
  config,
  currentStep,
  completedSteps,
  onMarkComplete,
  onUndo,
}: ProgressPanelProps) {
  const steps = config.steps;
  if (!steps || steps.length === 0) return null;

  const total = steps.length;
  const doneCount = completedSteps.length;
  const percent = Math.round((doneCount / total) * 100);
  const currentStepData = steps[currentStep] ?? null;
  const allDone = doneCount >= total;
  const canUndo = completedSteps.length > 0;

  return (
    <div className="border-b border-sidebar-border px-4 py-3 space-y-2.5 bg-sidebar-header">
      {/* Progress bar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400 shrink-0">
          {allDone ? "Complete!" : `Step ${currentStep + 1} of ${total}`}
        </span>
        <div className="flex-1 rounded-full bg-gray-800 h-1.5">
          <div
            className="rounded-full bg-accent h-1.5 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 shrink-0">{percent}%</span>
      </div>

      {/* Current step title + actions */}
      {currentStepData && (
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-gray-200 leading-snug">
            {allDone ? "All steps complete" : (currentStepData.title || `Step ${currentStep + 1}`)}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {canUndo && (
              <button
                onClick={onUndo}
                title="Undo last step"
                className="text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors whitespace-nowrap"
              >
                ← Undo
              </button>
            )}
            {!allDone && (
              <button
                onClick={onMarkComplete}
                className="text-xs text-accent hover:text-indigo-300 font-medium transition-colors whitespace-nowrap"
              >
                Mark done ✓
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step list (collapsed — just checkmarks) */}
      <div className="flex gap-1 flex-wrap">
        {steps.map((step, i) => {
          const done = completedSteps.includes(i);
          const isCurrent = i === currentStep && !allDone;
          return (
            <div
              key={step.id}
              title={step.title || `Step ${i + 1}`}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                done
                  ? "bg-accent text-white"
                  : isCurrent
                  ? "border-2 border-accent text-accent bg-transparent"
                  : "border border-gray-700 text-gray-600 bg-transparent"
              }`}
            >
              {done ? "✓" : i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
