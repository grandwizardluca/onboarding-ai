"use client";

import { useEffect, useState, useRef } from "react";
import MessageList, { Message } from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import { createClient } from "@/lib/supabase/client";

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function TestChatPage() {
  const supabase = createClient();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [sending, setSending] = useState(false);

  const [orgsLoading, setOrgsLoading] = useState(true);
  const [convsLoading, setConvsLoading] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);

  // Load orgs
  useEffect(() => {
    fetch("/api/admin/organizations")
      .then((r) => r.json())
      .then((data) => {
        const list: Org[] = Array.isArray(data) ? data : (data.organizations ?? []);
        setOrgs(list);
        if (list.length > 0) setSelectedOrgId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setOrgsLoading(false));
  }, []);

  // Load conversations when org changes
  useEffect(() => {
    if (!selectedOrgId) return;
    setConvsLoading(true);
    setSelectedConvId(null);
    setMessages([]);
    fetch(`/api/admin/test-chat/conversations?orgId=${selectedOrgId}`)
      .then((r) => r.json())
      .then((data: Conversation[]) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]))
      .finally(() => setConvsLoading(false));
  }, [selectedOrgId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!selectedConvId) return;
    setMsgsLoading(true);
    setMessages([]);
    supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", selectedConvId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setMsgsLoading(false);
      });
  }, [selectedConvId]);

  async function handleNewConversation() {
    if (!selectedOrgId) return;
    const res = await fetch("/api/admin/test-chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: selectedOrgId }),
    });
    if (res.ok) {
      const { id } = await res.json();
      const newConv: Conversation = {
        id,
        title: "Test Conversation",
        updated_at: new Date().toISOString(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setSelectedConvId(id);
    }
  }

  async function handleSend(content: string) {
    if (!selectedConvId || !selectedOrgId || !content.trim()) return;
    setSending(true);
    setStreamingContent("");

    // Optimistic user message
    const tempMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/admin/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConvId,
          orgId: selectedOrgId,
          message: content,
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setStreamingContent(full);
        }
      }

      setStreamingContent("");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: full,
          created_at: new Date().toISOString(),
        },
      ]);

      // Update conversation title in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId ? { ...c, updated_at: new Date().toISOString() } : c
        )
      );
    } catch {
      setStreamingContent("");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Error: could not get response.",
          created_at: new Date().toISOString(),
        },
      ]);
    }

    setSending(false);
  }

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  return (
    <div className="animate-fade-in-up">
      {/* RAG Testing Banner */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <span className="text-lg">🧪</span>
        <div>
          <p className="text-sm font-semibold text-amber-900">RAG Testing Interface</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Test how the AI retrieves documents and responds for any organization.
            Conversations created here are real and stored in the database.
          </p>
        </div>
      </div>

      {/* Org selector */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-foreground/60 shrink-0">Testing org:</label>
        {orgsLoading ? (
          <div className="skeleton h-8 w-48 rounded-lg" />
        ) : (
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="rounded-lg border border-ui bg-ui-1 px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
        {selectedOrg && (
          <span className="text-xs text-foreground/40 font-mono">{selectedOrg.slug}</span>
        )}
      </div>

      {/* Main layout: sidebar + chat */}
      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[400px]">
        {/* Conversation sidebar */}
        <div className="w-56 shrink-0 flex flex-col gap-2">
          <button
            onClick={handleNewConversation}
            disabled={!selectedOrgId}
            className="w-full rounded-lg border border-ui bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/85 transition-colors disabled:opacity-40"
          >
            + New Test Chat
          </button>
          <div className="flex-1 overflow-y-auto rounded-lg border border-ui">
            {convsLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-8 rounded" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-3 text-xs text-foreground/40 text-center">
                No conversations yet.
                <br />Click &quot;New Test Chat&quot; to start.
              </p>
            ) : (
              <div className="divide-y divide-ui">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${
                      selectedConvId === conv.id
                        ? "bg-ui-2 text-foreground"
                        : "text-foreground/60 hover:bg-ui-1 hover:text-foreground"
                    }`}
                  >
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className="text-foreground/40 mt-0.5">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 rounded-lg border border-ui overflow-hidden">
          {!selectedConvId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-foreground/40">
                  Select a conversation or start a new test chat.
                </p>
              </div>
            </div>
          ) : msgsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="loading-dots">
                <span /><span /><span />
              </div>
            </div>
          ) : (
            <>
              <MessageList
                messages={messages}
                streamingContent={streamingContent}
                isLoading={sending && !streamingContent}
              />
              <ChatInput onSend={handleSend} disabled={sending} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
