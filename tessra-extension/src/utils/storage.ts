export interface AuthData {
  apiKey: string;
  orgId: string;
  orgName: string;
}

export function getAuth(): Promise<AuthData | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiKey", "orgId", "orgName"], (result) => {
      if (result.apiKey && result.orgId && result.orgName) {
        resolve({
          apiKey: result.apiKey,
          orgId: result.orgId,
          orgName: result.orgName,
        });
      } else {
        resolve(null);
      }
    });
  });
}

export function setAuth(data: AuthData): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

export function clearAuth(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["apiKey", "orgId", "orgName"], resolve);
  });
}
