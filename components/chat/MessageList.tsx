"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
}

export default function MessageList({
  messages,
  streamingContent,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !streamingContent) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-foreground/40 text-sm">
          Start a conversation by typing a message below.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
      ))}
      {streamingContent && (
        <MessageBubble role="assistant" content={streamingContent} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
