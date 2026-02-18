"use client";

import { useEffect, useState } from "react";

interface Conversation {
  id: string;
  user_email: string;
  title: string;
  message_count: number;
  updated_at: string;
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

  if (loading) {
    return <p className="text-foreground/40 text-sm">Loading conversations...</p>;
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold mb-6">
        Student Conversations
      </h2>

      {conversations.length === 0 ? (
        <p className="text-foreground/40 text-sm">No conversations yet.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div key={conv.id}>
              {/* Conversation row */}
              <button
                onClick={() => handleSelect(conv.id)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                  selectedId === conv.id
                    ? "border-accent/50 bg-accent/5"
                    : "border-foreground/10 hover:border-foreground/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-foreground/40 mt-0.5">
                      {conv.user_email}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
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
                    <p className="text-foreground/40 text-xs">
                      Loading messages...
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="text-foreground/40 text-xs">
                      No messages in this conversation.
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id}>
                        <p className="text-xs text-foreground/40 mb-0.5">
                          {msg.role === "user" ? "Student" : "Socratic"} —{" "}
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                        <p
                          className={`text-sm whitespace-pre-wrap ${
                            msg.role === "assistant"
                              ? "font-mono text-foreground/80"
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
