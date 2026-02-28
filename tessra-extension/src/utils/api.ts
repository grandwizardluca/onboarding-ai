// Update this to your deployed Tessra URL (or localhost for dev)
export const BACKEND_URL = "https://tessrai.vercel.app";

export async function validateKey(
  apiKey: string
): Promise<{ orgId: string; orgName: string; workflowConfig: unknown } | { error: string }> {
  const res = await fetch(`${BACKEND_URL}/api/widget/validate-key`, {
    headers: { "X-API-Key": apiKey },
  });
  return res.json();
}

export interface ProgressData {
  currentStep: number;
  completedSteps: number[];
}

export async function getProgress(apiKey: string, deviceId: string): Promise<ProgressData> {
  const res = await fetch(
    `${BACKEND_URL}/api/widget/progress?deviceId=${encodeURIComponent(deviceId)}`,
    { headers: { "X-API-Key": apiKey } }
  );
  if (!res.ok) return { currentStep: 0, completedSteps: [] };
  return res.json();
}

export async function updateProgress(
  apiKey: string,
  deviceId: string,
  patch: { currentStep?: number; completedSteps?: number[] }
): Promise<void> {
  await fetch(`${BACKEND_URL}/api/widget/progress`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ deviceId, ...patch }),
  });
}

export interface WorkflowContextStep {
  id: number;
  title: string;
  instructions: string;
  sites: string;
  completed: boolean;
}

export interface WorkflowContext {
  totalSteps: number;
  currentStep: number;
  completedSteps: number[];
  steps: WorkflowContextStep[];
}

export async function widgetChat(
  apiKey: string,
  message: string,
  messages: { role: "user" | "assistant"; content: string }[],
  pageContext?: { url: string; domain: string; title: string },
  workflowContext?: WorkflowContext
): Promise<Response> {
  return fetch(`${BACKEND_URL}/api/widget/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ message, messages, pageContext, workflowContext }),
  });
}
