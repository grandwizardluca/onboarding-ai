"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";

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
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-[260px] flex-shrink-0 flex flex-col border-r border-foreground/10 bg-background transition-transform md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-foreground/10">
          <h2 className="font-serif text-lg font-bold mb-3">Socratic.sg</h2>
          <button
            onClick={handleNewConversation}
            className="w-full rounded-md border border-accent/50 px-3 py-2 text-sm text-accent hover:bg-accent/10 transition-colors"
          >
            + New Conversation
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-foreground/40 text-xs p-2">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="text-foreground/40 text-xs p-2">
              No conversations yet.
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm truncate mb-0.5 transition-colors ${
                  activeId === conv.id
                    ? "bg-user-bubble text-foreground"
                    : "text-foreground/70 hover:bg-user-bubble/50"
                }`}
              >
                {conv.title}
              </button>
            ))
          )}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-foreground/10">
          <button
            onClick={handleLogout}
            className="w-full rounded-md px-3 py-2 text-sm text-foreground/50 hover:text-foreground hover:bg-user-bubble/50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
