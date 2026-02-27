import React, { useEffect, useState } from "react";
import { getAuth, setAuth, clearAuth, type AuthData } from "../utils/storage";
import { validateKey } from "../utils/api";

type Status = "loading" | "unauthenticated" | "authenticated";

export default function Popup() {
  const [status, setStatus] = useState<Status>("loading");
  const [auth, setAuthState] = useState<AuthData | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);

  // On mount, check if already authenticated
  useEffect(() => {
    getAuth().then((data) => {
      if (data) {
        setAuthState(data);
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setValidating(true);
    setError("");

    try {
      const result = await validateKey(apiKeyInput.trim());

      if ("error" in result) {
        setError(result.error === "Invalid API key" ? "Invalid API key. Check your Tessra dashboard." : "Could not connect. Check your internet connection.");
        return;
      }

      const data: AuthData = {
        apiKey: apiKeyInput.trim(),
        orgId: result.orgId,
        orgName: result.orgName,
      };

      await setAuth(data);
      setAuthState(data);
      setStatus("authenticated");

      // Tell the active tab's content script to inject the sidebar
      chrome.runtime.sendMessage({ type: "AUTH_SUCCESS" });
    } catch {
      setError("Could not connect to Tessra. Check your internet connection.");
    } finally {
      setValidating(false);
    }
  }

  async function handleDisconnect() {
    await clearAuth();
    setAuthState(null);
    setStatus("unauthenticated");
    setApiKeyInput("");
    chrome.runtime.sendMessage({ type: "AUTH_CLEARED" });
  }

  const base: React.CSSProperties = {
    width: 300,
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: "#0f0f1a",
    color: "#e2e8f0",
  };

  if (status === "loading") {
    return (
      <div style={{ ...base, padding: "24px 16px", textAlign: "center" }}>
        <span style={{ color: "#64748b", fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  if (status === "authenticated" && auth) {
    return (
      <div style={base}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e1e3a", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>✦</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Tessra Setup Assistant</span>
        </div>

        {/* Connected state */}
        <div style={{ padding: 16 }}>
          <div style={{ background: "#0d2d1a", border: "1px solid #1a4a2a", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#4ade80", fontWeight: 600, letterSpacing: "0.05em" }}>CONNECTED</p>
            <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{auth.orgName}</p>
          </div>

          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px" }}>
            The sidebar is active on all pages. Look for the Tessra panel on the right side.
          </p>

          <button
            onClick={handleDisconnect}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "1px solid #1e1e3a",
              borderRadius: 6,
              color: "#94a3b8",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // Unauthenticated — show API key form
  return (
    <div style={base}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e1e3a", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>✦</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Tessra Setup Assistant</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: 16 }}>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 14px" }}>
          Enter your API key to activate the onboarding assistant.
        </p>

        <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 6 }}>
          API KEY
        </label>
        <input
          type="text"
          value={apiKeyInput}
          onChange={(e) => {
            setApiKeyInput(e.target.value);
            setError("");
          }}
          placeholder="tss_..."
          autoFocus
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#1e1e3a",
            border: `1px solid ${error ? "#ef4444" : "#2e2e4a"}`,
            borderRadius: 6,
            color: "#e2e8f0",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "monospace",
          }}
        />

        {error && (
          <p style={{ fontSize: 12, color: "#ef4444", margin: "6px 0 0" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={validating || !apiKeyInput.trim()}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "9px 12px",
            background: validating || !apiKeyInput.trim() ? "#2e2e4a" : "#6366f1",
            border: "none",
            borderRadius: 6,
            color: validating || !apiKeyInput.trim() ? "#64748b" : "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: validating || !apiKeyInput.trim() ? "not-allowed" : "pointer",
          }}
        >
          {validating ? "Validating…" : "Connect"}
        </button>

        <p style={{ fontSize: 11, color: "#475569", margin: "12px 0 0", textAlign: "center" }}>
          Find your API key in the Tessra dashboard under your organization settings.
        </p>
      </form>
    </div>
  );
}
