import React from "react";

// Phase 1 placeholder — full sidebar UI built in Phase 3
export default function Sidebar() {
  return (
    <div
      style={{
        height: "100vh",
        background: "#0f0f1a",
        color: "#e2e8f0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid #1e1e3a",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #1e1e3a",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>✦</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Tessra Setup Assistant</span>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <p style={{ fontSize: 13, color: "#64748b", textAlign: "center" }}>
          Sidebar loaded successfully.
          <br />
          Chat interface coming in Phase 3.
        </p>
      </div>
    </div>
  );
}
