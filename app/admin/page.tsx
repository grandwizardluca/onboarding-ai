"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function AdminDashboard() {
  const [chatEnabled, setChatEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadChatSetting();
  }, []);

  async function loadChatSetting() {
    const res = await fetch("/api/admin/settings?key=student_chat_enabled");
    if (res.ok) {
      const data = await res.json();
      setChatEnabled(data.value === true || data.value === "true");
    }
  }

  async function handleToggle() {
    setToggling(true);
    const newValue = !chatEnabled;

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "student_chat_enabled", value: newValue }),
    });

    if (res.ok) {
      setChatEnabled(newValue);
      showToast(
        newValue ? "Student chat enabled" : "Student chat disabled",
        "success"
      );
    } else {
      showToast("Failed to update setting", "error");
    }

    setToggling(false);
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold mb-6">Admin Dashboard</h2>

      {/* Chat toggle */}
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-4 mb-6 flex items-center justify-between transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.14]">
        <div>
          <h3 className="text-sm font-medium">Student Chat</h3>
          <p className="text-xs text-foreground/40 mt-0.5">
            {chatEnabled
              ? "Students can currently send messages"
              : "Chat is disabled — students see a notice"}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
            chatEnabled
              ? "bg-accent shadow-[0_0_10px_rgba(212,160,23,0.4)]"
              : "bg-foreground/20"
          } ${toggling ? "opacity-50" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
              chatEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/prompt"
          className="group rounded-lg border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6 transition-all duration-300 hover:border-accent/50 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(212,160,23,0.08)]"
        >
          <h3 className="font-serif text-lg font-bold mb-2 transition-colors duration-300 group-hover:text-accent">
            Edit Prompt
          </h3>
          <p className="text-sm text-foreground/50">
            Edit the AI system prompt that controls how Socratic tutors students.
          </p>
        </Link>
        <Link
          href="/admin/documents"
          className="group rounded-lg border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6 transition-all duration-300 hover:border-accent/50 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(212,160,23,0.08)]"
        >
          <h3 className="font-serif text-lg font-bold mb-2 transition-colors duration-300 group-hover:text-accent">
            Documents
          </h3>
          <p className="text-sm text-foreground/50">
            Upload syllabus PDFs and notes to the knowledge base.
          </p>
        </Link>
        <Link
          href="/admin/conversations"
          className="group rounded-lg border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6 transition-all duration-300 hover:border-accent/50 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(212,160,23,0.08)]"
        >
          <h3 className="font-serif text-lg font-bold mb-2 transition-colors duration-300 group-hover:text-accent">
            Conversations
          </h3>
          <p className="text-sm text-foreground/50">
            View all student conversations and monitor progress.
          </p>
        </Link>
      </div>
    </div>
  );
}
