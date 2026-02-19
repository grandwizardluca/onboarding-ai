"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";

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
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
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
        className={`fixed top-0 left-0 z-40 h-full w-[260px] flex-shrink-0 flex flex-col border-r border-white/[0.08] glass-nav transition-transform duration-300 md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08]">
          <h2 className="font-serif text-lg font-bold mb-3 gradient-text">Socratic.sg</h2>
          <button
            onClick={handleNewConversation}
            className="group w-full rounded-md border border-accent/40 px-3 py-2 text-sm text-accent transition-all duration-300 hover:bg-accent/10 hover:border-accent/70 hover:shadow-[0_0_12px_rgba(212,160,23,0.15)]"
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
                ? "bg-white/[0.08] text-foreground"
                : "text-foreground/50 hover:text-foreground hover:bg-white/[0.05]"
            }`}
          >
            My Progress
          </Link>
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
                    ? "bg-white/[0.08] text-foreground border-l-2 border-accent/60 pl-2.5"
                    : "text-foreground/70 hover:bg-white/[0.05] hover:text-foreground"
                }`}
              >
                {conv.title}
              </button>
            ))
          )}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/[0.08]">
          <button
            onClick={handleLogout}
            className="w-full rounded-md px-3 py-2 text-sm text-foreground/50 transition-all duration-300 hover:text-foreground hover:bg-white/[0.05]"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
