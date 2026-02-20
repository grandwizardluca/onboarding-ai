"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/chat/Sidebar";
import { useActivityTracker } from "@/lib/hooks/useActivityTracker";
import ThemeToggle from "@/components/ThemeToggle";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bgMode, setBgMode] = useState<"standard" | "image">("standard");
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  useActivityTracker();

  useEffect(() => {
    fetch("/api/ui-settings")
      .then((r) => r.json())
      .then((data) => {
        setBgMode(data.background_mode);
        setBgUrl(data.background_url);
      })
      .catch(() => {});
  }, []);

  const bgStyle =
    bgMode === "image" && bgUrl
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }
      : undefined;

  return (
    <div className="flex h-screen overflow-hidden" style={bgStyle}>
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
          <span className="font-serif text-sm font-bold ml-3 flex-1">Socratic.sg</span>
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
