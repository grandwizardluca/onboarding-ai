"use client";

import { useState } from "react";
import Sidebar from "@/components/chat/Sidebar";
import { useActivityTracker } from "@/lib/hooks/useActivityTracker";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useActivityTracker();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex flex-1 flex-col min-w-0">
        {/* Mobile header with menu toggle */}
        <div className="flex items-center border-b border-white/[0.08] glass-nav px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-foreground/70 transition-colors duration-300 hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-serif text-sm font-bold ml-3">Socratic.sg</span>
        </div>
        {children}
      </main>
    </div>
  );
}
