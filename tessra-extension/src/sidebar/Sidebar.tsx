import React, { useEffect, useRef, useState } from "react";
import { getAuth, getDeviceId, type WorkflowConfig } from "../utils/storage";
import { getProgress, updateProgress } from "../utils/api";
import ChatInterface from "./ChatInterface";
import ProgressPanel from "./components/ProgressPanel";

// Guard against extension context invalidation (happens when extension is reloaded
// while old sidebar iframes are still alive in existing tabs).
function safeSendMessage(msg: object) {
  try {
    if (chrome?.runtime?.id) {
      chrome.runtime.sendMessage(msg, () => void chrome.runtime.lastError);
    }
  } catch {
    // Extension context invalidated — silently ignore
  }
}

export default function Sidebar() {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [progressLoading, setProgressLoading] = useState(true);

  // Refs so the postMessage listener always sees latest state without re-registering
  const apiKeyRef = useRef<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const workflowConfigRef = useRef<WorkflowConfig | null>(null);
  const currentStepRef = useRef(0);
  const completedStepsRef = useRef<number[]>([]);

  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { deviceIdRef.current = deviceId; }, [deviceId]);
  useEffect(() => { workflowConfigRef.current = workflowConfig; }, [workflowConfig]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { completedStepsRef.current = completedSteps; }, [completedSteps]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

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
        // Sync content.ts's step index — it always starts at 0, so we must tell it
        // the real step on every sidebar load, not just when the user clicks complete
        safeSendMessage({ type: "STEP_UPDATE", currentStep: progress.currentStep, workflowConfig: auth.workflowConfig });
      }
      setProgressLoading(false);
    }
    init();
  }, []);

  // Listen for STEP_COMPLETE posted by the in-page overlay via content.ts postMessage
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "STEP_COMPLETE") {
        markCompleteFromRefs();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []); // register once — reads latest state via refs

  function markCompleteFromRefs() {
    const ak = apiKeyRef.current;
    const did = deviceIdRef.current;
    const config = workflowConfigRef.current;
    const step = currentStepRef.current;
    const done = completedStepsRef.current;
    if (!ak || !did || !config) return;

    const newCompleted = done.includes(step) ? done : [...done, step];
    const nextStep = Math.min(step + 1, config.steps.length - 1);
    const newCurrent = newCompleted.length >= config.steps.length ? step : nextStep;

    setCompletedSteps(newCompleted);
    setCurrentStep(newCurrent);

    updateProgress(ak, did, { currentStep: newCurrent, completedSteps: newCompleted });
    safeSendMessage({ type: "STEP_UPDATE", currentStep: newCurrent });
  }

  async function handleMarkComplete() {
    const config = workflowConfig;
    const ak = apiKey;
    const did = deviceId;
    if (!ak || !did || !config) return;

    const newCompleted = completedSteps.includes(currentStep)
      ? completedSteps
      : [...completedSteps, currentStep];
    const nextStep = Math.min(currentStep + 1, config.steps.length - 1);
    const newCurrent = newCompleted.length >= config.steps.length ? currentStep : nextStep;

    setCompletedSteps(newCompleted);
    setCurrentStep(newCurrent);

    await updateProgress(ak, did, { currentStep: newCurrent, completedSteps: newCompleted });
    safeSendMessage({ type: "STEP_UPDATE", currentStep: newCurrent });
  }

  async function handleUndo() {
    const config = workflowConfig;
    const ak = apiKey;
    const did = deviceId;
    if (!ak || !did || !config || completedSteps.length === 0) return;

    // Determine the step to undo: if all done, undo the last step; otherwise undo currentStep - 1
    const allDone = completedSteps.length >= config.steps.length;
    const stepToUndo = allDone ? currentStep : currentStep - 1;
    if (stepToUndo < 0) return;

    const newCompleted = completedSteps.filter((s) => s !== stepToUndo);
    const newCurrent = stepToUndo;

    setCompletedSteps(newCompleted);
    setCurrentStep(newCurrent);

    await updateProgress(ak, did, { currentStep: newCurrent, completedSteps: newCompleted });
    safeSendMessage({ type: "STEP_UPDATE", currentStep: newCurrent });
  }

  function handleCollapse() {
    safeSendMessage({ type: "TOGGLE_SIDEBAR" });
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
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-gray-100">Tessra Assistant</span>
              {!isOnline && (
                <span className="text-[10px] font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-700/50 rounded px-1.5 py-0.5">
                  offline
                </span>
              )}
            </div>
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

      {/* Progress panel — shown when workflow is configured, skeleton while loading */}
      {workflowConfig && progressLoading && (
        <div className="border-b border-sidebar-border px-4 py-3 space-y-2 bg-sidebar-header">
          <div className="h-2 rounded-full bg-gray-800 animate-pulse w-full" />
          <div className="h-3 rounded bg-gray-800 animate-pulse w-2/3" />
        </div>
      )}
      {workflowConfig && !progressLoading && (
        <ProgressPanel
          config={workflowConfig}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onMarkComplete={handleMarkComplete}
          onUndo={handleUndo}
        />
      )}

      {/* Chat */}
      <ChatInterface currentStep={currentStep} completedSteps={completedSteps} workflowConfig={workflowConfig} />
    </div>
  );
}
