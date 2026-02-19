"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MessageList, { Message } from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [chatDisabled, setChatDisabled] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadMessages();
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

  async function loadMessages() {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data as Message[]);
    setLoading(false);
  }

  async function handleSend(content: string) {
    setSending(true);
    setStreamingContent("");

    // Optimistically add user message to the UI
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // Call the chat API — it saves the user message and streams the response
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

      // Read the streaming response
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

      // Stream is done — add the complete message to the messages array
      // and clear the streaming state
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
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isLoading={sending && !streamingContent}
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
