"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoMode, setLogoMode] = useState<"standard" | "image">("standard");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    loadConversations();
    loadUISettings();
  }, []);

  async function loadUISettings() {
    try {
      const res = await fetch("/api/ui-settings");
      if (res.ok) {
        const data = await res.json();
        setLogoMode(data.sidebar_mode);
        setLogoUrl(data.sidebar_url);
      }
    } catch {
      // Non-critical — keep standard logo
    }
  }

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .neq("type", "quiz")
      .order("updated_at", { ascending: false });

    if (data) setConversations(data);
    setLoading(false);
  }

  async function handleNewConversation() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Conversation" })
      .select("id")
      .single();

    if (data && !error) {
      await loadConversations();
      router.push(`/chat/${data.id}`);
      onClose();
    }
  }

  async function handleQuizMode() {
    const res = await fetch("/api/conversations/quiz", { method: "POST" });
    if (!res.ok) return;
    const { conversationId } = await res.json();
    router.push(`/chat/${conversationId}`);
    onClose();
  }

  function handleSelect(id: string) {
    router.push(`/chat/${id}`);
    onClose();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-[260px] flex-shrink-0 flex flex-col border-r border-ui glass-nav transition-transform duration-300 md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-ui">
          <div className="flex items-center justify-between mb-3">
            {logoMode === "image" && logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Socratic.sg"
                style={{ maxHeight: "80px" }}
                className="w-auto object-contain"
              />
            ) : (
              <h2 className="font-serif text-lg font-bold gradient-text">Socratic.sg</h2>
            )}
            <ThemeToggle />
          </div>
          <button
            onClick={handleNewConversation}
            className="group w-full rounded-md border border-accent/40 px-3 py-2 text-sm text-accent transition-all duration-300 hover:bg-accent/10 hover:border-accent/70 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)]"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="transition-transform duration-300 group-hover:rotate-90">+</span>
              New Conversation
            </span>
          </button>
          <Link
            href="/chat/progress"
            onClick={onClose}
            className={`mt-2 block w-full rounded-md px-3 py-2 text-sm transition-all duration-300 ${
              pathname === "/chat/progress"
                ? "bg-ui-2 text-foreground"
                : "text-foreground/50 hover:text-foreground hover-bg-ui-1"
            }`}
          >
            My Progress
          </Link>
          <button
            onClick={handleQuizMode}
            className="mt-1 w-full rounded-md border border-accent/60 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-all duration-300 hover:bg-accent/20 hover:border-accent"
          >
            Quiz Mode
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-2 space-y-2">
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-4/5" />
              <div className="skeleton h-8 w-full" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-foreground/40 text-xs p-2">
              No conversations yet.
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm truncate mb-0.5 transition-all duration-200 ${
                  activeId === conv.id
                    ? "bg-ui-2 text-foreground border-l-2 border-accent/60 pl-2.5"
                    : "text-foreground/70 hover-bg-ui-1 hover:text-foreground"
                }`}
              >
                {conv.title}
              </button>
            ))
          )}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-ui">
          <button
            onClick={handleLogout}
            className="w-full rounded-md px-3 py-2 text-sm text-foreground/50 transition-all duration-300 hover:text-foreground hover-bg-ui-1"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
