// Update this to your deployed Tessra URL (or localhost for dev)
export const BACKEND_URL = "https://tessrai.dev";

export async function validateKey(
  apiKey: string
): Promise<{ orgId: string; orgName: string } | { error: string }> {
  const res = await fetch(`${BACKEND_URL}/api/widget/validate-key`, {
    headers: { "X-API-Key": apiKey },
  });
  return res.json();
}

export async function widgetChat(
  apiKey: string,
  message: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<Response> {
  return fetch(`${BACKEND_URL}/api/widget/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ message, messages }),
  });
}
