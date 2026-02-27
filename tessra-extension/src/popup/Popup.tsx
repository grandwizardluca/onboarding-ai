import React from "react";

// Phase 1 placeholder — full auth UI built in Phase 2
export default function Popup() {
  return (
    <div
      style={{
        width: 320,
        padding: "20px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#0f0f1a",
        color: "#e2e8f0",
        minHeight: 120,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Tessra Setup Assistant</span>
      </div>
      <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
        Extension loaded. Auth setup coming in Phase 2.
      </p>
    </div>
  );
}
