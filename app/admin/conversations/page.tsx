"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";

interface Conversation {
  id: string;
  user_email: string;
  title: string;
  message_count: number;
  updated_at: string;
  org_name: string;
  org_slug: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [orgFilter, setOrgFilter] = useState<string>(""); // "" = all

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const res = await fetch("/api/admin/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
    setLoading(false);
  }

  async function handleSelect(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setMessages([]);
      return;
    }

    setSelectedId(id);
    setLoadingMessages(true);

    const res = await fetch(`/api/admin/conversations?id=${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
    setLoadingMessages(false);
  }

  // Unique orgs for the filter dropdown
  const uniqueOrgs = Array.from(
    new Map(conversations.map((c) => [c.org_slug, c.org_name])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = orgFilter
    ? conversations.filter((c) => c.org_slug === orgFilter)
    : conversations;

  if (loading) {
    return <PageLoader label="Loading conversations" />;
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h2 className="font-serif text-2xl font-bold">User Conversations</h2>

        {uniqueOrgs.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-foreground/50">Org:</label>
            <select
              value={orgFilter}
              onChange={(e) => {
                setOrgFilter(e.target.value);
                setSelectedId(null);
                setMessages([]);
              }}
              className="rounded-lg border border-ui bg-ui-1 px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="">All organizations</option>
              {uniqueOrgs.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <p className="text-sm text-foreground/40 mb-4">
        {filtered.length} {filtered.length === 1 ? "conversation" : "conversations"}
        {orgFilter && ` in ${uniqueOrgs.find(([s]) => s === orgFilter)?.[1]}`}
      </p>

      {filtered.length === 0 ? (
        <p className="text-foreground/40 text-sm">No conversations yet.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((conv) => (
            <div key={conv.id}>
              {/* Conversation row */}
              <button
                onClick={() => handleSelect(conv.id)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-all duration-300 ${
                  selectedId === conv.id
                    ? "border-accent/50 bg-accent/[0.06] shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                    : "border-ui bg-ui-1 hover-border-ui-strong hover-bg-ui-2"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.title || "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-foreground/40">{conv.user_email}</p>
                      <span className="text-foreground/20 text-xs">·</span>
                      <Link
                        href={`/admin/organizations/${conv.org_slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-accent hover:underline"
                      >
                        {conv.org_name}
                      </Link>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-foreground/50">
                      {conv.message_count} messages
                    </p>
                    <p className="text-xs text-foreground/30 mt-0.5">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>

              {/* Expanded message thread */}
              {selectedId === conv.id && (
                <div className="ml-4 mt-2 mb-4 border-l-2 border-accent/30 pl-4 space-y-3">
                  {loadingMessages ? (
                    <div className="py-4">
                      <PageLoader label="Loading messages" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-foreground/40 text-xs">
                      No messages in this conversation.
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id}>
                        <p className="text-xs text-foreground/40 mb-0.5">
                          {msg.role === "user" ? "User" : "Tessra"} —{" "}
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                        <p
                          className={`text-sm whitespace-pre-wrap ${
                            msg.role === "assistant"
                              ? "font-sans text-foreground/80"
                              : "text-foreground/90"
                          }`}
                        >
                          {msg.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
