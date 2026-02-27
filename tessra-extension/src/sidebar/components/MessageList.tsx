import React, { useEffect, useRef } from "react";
import MessageBubble, { type RAGSource } from "./MessageBubble";

export type { RAGSource };

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RAGSource[];
}

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
  isLoading?: boolean;
}

export default function MessageList({ messages, streamingContent, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isLoading]);

  if (messages.length === 0 && !streamingContent && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-gray-500 text-xs text-center">
          Ask me anything about getting set up.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} role={msg.role} content={msg.content} sources={msg.sources} />
      ))}
      {streamingContent && (
        <MessageBubble role="assistant" content={streamingContent} />
      )}
      {isLoading && !streamingContent && (
        <div className="flex justify-start">
          <div className="border-l-2 border-accent pl-4 py-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
