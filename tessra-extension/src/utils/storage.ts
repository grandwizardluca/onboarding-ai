export interface WorkflowStep {
  id: number;
  title: string;
  instructions: string;
  sites: string;            // comma-separated domains
  completion_criteria: string;
}

export interface WorkflowConfig {
  steps: WorkflowStep[];
}

export interface AuthData {
  apiKey: string;
  orgId: string;
  orgName: string;
  workflowConfig?: WorkflowConfig | null;
}

const AUTH_KEYS = ["apiKey", "orgId", "orgName", "workflowConfig"] as const;

export function getAuth(): Promise<AuthData | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(AUTH_KEYS as unknown as string[], (result) => {
      if (result.apiKey && result.orgId && result.orgName) {
        resolve({
          apiKey: result.apiKey,
          orgId: result.orgId,
          orgName: result.orgName,
          workflowConfig: result.workflowConfig ?? null,
        });
      } else {
        resolve(null);
      }
    });
  });
}

export function setAuth(data: AuthData): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        apiKey: data.apiKey,
        orgId: data.orgId,
        orgName: data.orgName,
        workflowConfig: data.workflowConfig ?? null,
      },
      resolve
    );
  });
}

export function clearAuth(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(AUTH_KEYS as unknown as string[], resolve);
  });
}

// ── Device ID (for progress tracking) ─────────────────────────────────────────

export function getDeviceId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["deviceId"], (result) => {
      if (result.deviceId) {
        resolve(result.deviceId as string);
      } else {
        // Generate a UUID and persist it for the lifetime of this device/profile
        const id = crypto.randomUUID();
        chrome.storage.local.set({ deviceId: id }, () => resolve(id));
      }
    });
  });
}
