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
  const supabase = createClient();

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

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
        <p className="text-foreground/40 text-sm">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <MessageList messages={messages} streamingContent={streamingContent} />
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
