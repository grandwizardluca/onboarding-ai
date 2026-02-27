import React, { useEffect, useState } from "react";
import { getAuth } from "../utils/storage";
import ChatInterface from "./ChatInterface";

export default function Sidebar() {
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    getAuth().then((auth) => {
      if (auth) setOrgName(auth.orgName);
    });
  }, []);

  function handleCollapse() {
    chrome.runtime.sendMessage({ type: "TOGGLE_SIDEBAR" });
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
          {/* Chevron right — collapse icon */}
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

      {/* Chat */}
      <ChatInterface />
    </div>
  );
}
