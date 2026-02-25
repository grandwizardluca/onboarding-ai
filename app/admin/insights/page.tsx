"use client";

import { useEffect, useState, useRef } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const EXAMPLE_PROMPTS = [
  "Which organizations are most engaged?",
  "Which orgs haven't had any sessions yet?",
  "What's the overall platform activity this week?",
  "Which orgs have uploaded the most documents?",
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-accent text-white rounded-br-sm"
            : "bg-ui-1 border border-ui text-foreground rounded-bl-sm"
        }`}
        style={{ whiteSpace: "pre-wrap" }}
      >
        {msg.content}
      </div>
    </div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-start mb-4">
      <div
        className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-ui-1 border border-ui text-foreground"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {content}
        <span className="inline-block w-1.5 h-3.5 bg-foreground/40 ml-0.5 animate-pulse rounded-sm" />
      </div>
    </div>
  );
}

export default function AdminInsightsPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/insights");
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversationId ?? null);
        setMessages(data.messages ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(message: string) {
    if (!message.trim() || sending) return;
    setSending(true);
    setStreaming("");
    setInput("");

    const tempMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/admin/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let convIdFound = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          if (!convIdFound && chunk.startsWith("__CONV_ID__:")) {
            const newline = chunk.indexOf("\n");
            const convIdLine = chunk.slice("__CONV_ID__:".length, newline);
            setConversationId(convIdLine.trim());
            const rest = chunk.slice(newline + 1);
            full += rest;
            convIdFound = true;
          } else {
            full += chunk;
          }
          setStreaming(full);
        }
      }

      setStreaming("");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: full,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      setStreaming("");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold">Platform Insights</h2>
        <p className="text-sm text-foreground/40 mt-0.5">
          Ask questions about all organizations and platform-wide trends.
        </p>
      </div>

      {/* Chat container */}
      <div className="flex flex-col h-[calc(100vh-260px)] min-h-[400px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-ui bg-background p-4 mb-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="loading-dots"><span /><span /><span /></div>
            </div>
          ) : messages.length === 0 && !streaming ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center">
                <p className="text-sm font-medium text-foreground/60">
                  Ask about platform-wide data
                </p>
                <p className="text-xs text-foreground/40 mt-1">
                  I have access to all organization metrics and can identify trends across your platform.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={sending}
                    className="rounded-lg border border-ui bg-ui-1 px-4 py-3 text-xs text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {streaming && <StreamingBubble content={streaming} />}
              {sending && !streaming && (
                <div className="flex justify-start mb-4">
                  <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-ui-1 border border-ui">
                    <div className="loading-dots"><span /><span /><span /></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Ask about your platform data..."
            rows={2}
            className="flex-1 rounded-lg border border-ui bg-background px-4 py-3 text-sm text-foreground outline-none transition-[border-color] duration-300 focus:border-foreground/40 resize-none disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-end"
          >
            {sending ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
