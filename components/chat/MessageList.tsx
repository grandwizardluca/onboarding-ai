"use client";

import { useEffect, useRef, useState } from "react";
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
  isLoading?: boolean;
  quizLoading?: boolean;
}

const QUIZ_LOADING_MESSAGES = [
  "Reviewing your answer...",
  "Evaluating depth...",
  "Calculating score...",
  "Preparing feedback...",
];

function QuizLoadingIndicator() {
  const [phase, setPhase] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = () => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        // Advance phase and fade back in
        setPhase((p) => (p + 1) % QUIZ_LOADING_MESSAGES.length);
        setVisible(true);
      }, 300);
    };

    const interval = setInterval(cycle, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="border-l-2 border-accent pl-4 py-2 flex items-center gap-3">
        {/* Spinning ring */}
        <svg
          className="animate-spin h-3.5 w-3.5 text-accent flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        {/* Cycling label */}
        <span
          className="text-sm text-foreground/50 transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {QUIZ_LOADING_MESSAGES[phase]}
        </span>
      </div>
    </div>
  );
}

export default function MessageList({
  messages,
  streamingContent,
  isLoading,
  quizLoading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isLoading, quizLoading]);

  if (messages.length === 0 && !streamingContent && !isLoading && !quizLoading) {
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
      {/* Quiz mode: show cycling status messages */}
      {quizLoading && !streamingContent && <QuizLoadingIndicator />}
      {/* Normal mode: show generic loading dots */}
      {isLoading && !quizLoading && !streamingContent && (
        <div className="flex justify-start animate-fade-in-up">
          <div className="border-l-2 border-accent pl-4 py-2">
            <div className="loading-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
