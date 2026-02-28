import React, { useEffect, useState } from "react";
import { getAuth, getDeviceId, type WorkflowConfig } from "../utils/storage";
import { getProgress, updateProgress } from "../utils/api";
import ChatInterface from "./ChatInterface";
import ProgressPanel from "./components/ProgressPanel";

export default function Sidebar() {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const auth = await getAuth();
      if (!auth) return;
      setOrgName(auth.orgName);
      setApiKey(auth.apiKey);
      if (auth.workflowConfig?.steps?.length) {
        setWorkflowConfig(auth.workflowConfig);
      }

      const did = await getDeviceId();
      setDeviceId(did);

      if (auth.workflowConfig?.steps?.length) {
        const progress = await getProgress(auth.apiKey, did);
        setCurrentStep(progress.currentStep);
        setCompletedSteps(progress.completedSteps);
      }
    }
    init();
  }, []);

  function handleCollapse() {
    chrome.runtime.sendMessage({ type: "TOGGLE_SIDEBAR" });
  }

  async function handleMarkComplete() {
    if (!apiKey || !deviceId || !workflowConfig) return;
    const newCompleted = completedSteps.includes(currentStep)
      ? completedSteps
      : [...completedSteps, currentStep];
    const nextStep = Math.min(currentStep + 1, workflowConfig.steps.length - 1);
    const newCurrent = newCompleted.length >= workflowConfig.steps.length
      ? currentStep  // stay at end when all done
      : nextStep;

    setCompletedSteps(newCompleted);
    setCurrentStep(newCurrent);

    await updateProgress(apiKey, deviceId, {
      currentStep: newCurrent,
      completedSteps: newCompleted,
    });

    // Notify content script to refresh the overlay
    chrome.runtime.sendMessage({ type: "STEP_UPDATE", currentStep: newCurrent });
  }

  return (
    <div
      className="flex flex-col bg-sidebar-bg text-gray-200"
      style={{ height: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-accent text-base flex-shrink-0">✦</span>
          <div className="min-w-0">
            <span className="font-semibold text-sm text-gray-100 block">Tessra Assistant</span>
            {orgName && (
              <span className="text-xs text-gray-500 truncate block">{orgName}</span>
            )}
          </div>
        </div>
        <button
          onClick={handleCollapse}
          title="Collapse sidebar"
          className="flex-shrink-0 rounded p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors ml-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Progress panel — only shown when workflow is configured */}
      {workflowConfig && (
        <ProgressPanel
          config={workflowConfig}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onMarkComplete={handleMarkComplete}
        />
      )}

      {/* Chat */}
      <ChatInterface currentStep={currentStep} workflowConfig={workflowConfig} />
    </div>
  );
}
