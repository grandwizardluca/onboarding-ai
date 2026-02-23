"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MessageList, { Message } from "@/components/chat/MessageList";
import ChatInput, { AttachedFile } from "@/components/chat/ChatInput";

const QUIZ_WELCOME: Message = {
  id: "quiz-welcome",
  role: "assistant",
  content:
    "Welcome to Quiz Mode! I'll test your understanding of H2 Economics topics from your study sessions. Ready for your first question?",
  created_at: new Date(0).toISOString(),
};

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [chatDisabled, setChatDisabled] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [conversationTitle, setConversationTitle] = useState("Conversation");
  const supabase = createClient();

  useEffect(() => {
    loadConversation();
    checkChatEnabled();
  }, [conversationId]);

  async function checkChatEnabled() {
    try {
      const res = await fetch("/api/settings?key=student_chat_enabled");
      if (res.ok) {
        const data = await res.json();
        setChatDisabled(data.value === false || data.value === "false");
      }
    } catch {
      // If we can't check, default to enabled
    }
  }

  async function loadConversation() {
    setLoading(true);

    // Fetch conversation metadata and messages in parallel
    const [{ data: convData }, { data: msgData }] = await Promise.all([
      supabase
        .from("conversations")
        .select("type, title")
        .eq("id", conversationId)
        .single(),
      supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ]);

    const isQuiz = convData?.type === "quiz";
    setIsQuizMode(isQuiz);
    if (convData?.title) setConversationTitle(convData.title);

    const realMessages = (msgData as Message[]) ?? [];

    // For a brand-new quiz conversation with no messages, show a welcome prompt
    if (isQuiz && realMessages.length === 0) {
      setMessages([QUIZ_WELCOME]);
    } else {
      setMessages(realMessages);
    }

    setLoading(false);
  }

  async function handleSend(content: string, attachedFile?: AttachedFile) {
    setSending(true);
    setStreamingContent("");

    // Optimistically add user message, removing the UI-only welcome placeholder if present
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content || (attachedFile ? "(see attached file)" : ""),
      created_at: new Date().toISOString(),
      attachedFileName: attachedFile?.name,
    };
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== "quiz-welcome");
      return [...filtered, tempUserMsg];
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: content, attachedFile }),
      });

      console.log("[Chat] response.ok:", response.ok, "status:", response.status);
      console.log("[Chat] response.headers:", Object.fromEntries(response.headers.entries()));
      console.log("[Chat] response.body:", response.body);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[Chat] API error response:", errorBody);
        throw new Error(`Chat request failed: ${errorBody}`);
      }

      const reader = response.body?.getReader();
      console.log("[Chat] reader initialized:", !!reader);
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        let chunkCount = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunkCount++;
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          console.log(`[Chat] chunk #${chunkCount}: ${chunk.length} chars, total: ${fullResponse.length}`);
          setStreamingContent(fullResponse);
        }
        // Flush any bytes held in the decoder buffer for multi-byte chars
        const remaining = decoder.decode();
        if (remaining) {
          fullResponse += remaining;
          console.log(`[Chat] decoder flush: ${remaining.length} extra chars`);
        }
        console.log(`[Chat] stream closed. fullResponse.length = ${fullResponse.length}`);
      } else {
        console.warn("[Chat] response.body reader is null");
      }

      console.log(`[Chat] setting assistant message, content.length = ${fullResponse.length}`);
      setStreamingContent("");
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullResponse,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      setStreamingContent("");
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setSending(false);
  }

  function handleExport() {
    const exportable = messages.filter((m) => m.id !== "quiz-welcome");
    if (exportable.length === 0) return;

    const lines = exportable.map((m) => {
      const speaker = m.role === "user" ? "You" : "Socratic";
      return `${speaker}:\n${m.content.trim()}`;
    });

    const header = `${conversationTitle}\nExported from Socratic.sg — ${new Date().toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}\n`;
    const body = lines.join("\n\n");
    const fullText = `${header}\n${body}\n`;

    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conversationTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="loading-dots">
            <span />
            <span />
            <span />
          </div>
          <p className="text-foreground/30 text-xs tracking-wide">Loading conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Top bar: quiz badge (left) + export button (right) */}
      <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {isQuizMode && (
            <>
              <span className="rounded-full bg-accent/20 border border-accent/60 px-3 py-0.5 text-xs font-semibold text-accent tracking-wide">
                Quiz Mode
              </span>
              <span className="text-xs text-foreground/40">
                Answers are scored and tracked in My Progress
              </span>
            </>
          )}
        </div>
        {messages.filter((m) => m.id !== "quiz-welcome").length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded px-3 py-1 text-xs text-foreground/50 hover:text-foreground/80 hover:bg-foreground/5 transition-colors"
            title="Export conversation as .txt"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
        )}
      </div>
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isLoading={!isQuizMode && sending && !streamingContent}
        quizLoading={isQuizMode && sending && !streamingContent}
      />
      {chatDisabled ? (
        <div className="border-t border-foreground/10 px-4 py-4 text-center">
          <p className="text-foreground/50 text-sm">
            Chat is currently disabled by the administrator.
          </p>
        </div>
      ) : (
        <ChatInput onSend={handleSend} disabled={sending} />
      )}
    </div>
  );
}
