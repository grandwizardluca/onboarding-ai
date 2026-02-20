"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MessageList, { Message } from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";

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
        .select("type")
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

    const realMessages = (msgData as Message[]) ?? [];

    // For a brand-new quiz conversation with no messages, show a welcome prompt
    if (isQuiz && realMessages.length === 0) {
      setMessages([QUIZ_WELCOME]);
    } else {
      setMessages(realMessages);
    }

    setLoading(false);
  }

  async function handleSend(content: string) {
    setSending(true);
    setStreamingContent("");

    // Optimistically add user message, removing the UI-only welcome placeholder if present
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== "quiz-welcome");
      return [...filtered, tempUserMsg];
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: content }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Chat API error:", response.status, errorBody);
        throw new Error(`Chat request failed: ${errorBody}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          setStreamingContent(fullResponse);
        }
      }

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
      {/* Quiz Mode header badge */}
      {isQuizMode && (
        <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-2 shrink-0">
          <span className="rounded-full bg-accent/20 border border-accent/60 px-3 py-0.5 text-xs font-semibold text-accent tracking-wide">
            Quiz Mode
          </span>
          <span className="text-xs text-foreground/40">
            Answers are scored and tracked in My Progress
          </span>
        </div>
      )}
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
