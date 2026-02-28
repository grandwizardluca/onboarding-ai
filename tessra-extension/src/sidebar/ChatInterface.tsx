import React, { useState, useEffect } from "react";
import { getAuth, type WorkflowConfig } from "../utils/storage";
import { widgetChat } from "../utils/api";
import MessageList, { type Message, type RAGSource } from "./components/MessageList";
import ChatInput from "./components/ChatInput";

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}`;
}

interface PageContext {
  url: string;
  domain: string;
  title: string;
}

interface Props {
  currentStep?: number;
  workflowConfig?: WorkflowConfig | null;
}

export default function ChatInterface({ currentStep, workflowConfig }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  useEffect(() => {
    getAuth().then((auth) => {
      if (auth) setApiKey(auth.apiKey);
    });
  }, []);

  // Receive page context from the content script via postMessage
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "PAGE_CONTEXT") {
        setPageContext({
          url: event.data.url,
          domain: event.data.domain,
          title: event.data.title,
        });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function sendMessage(text: string) {
    if (!apiKey || isLoading) return;

    // Append user message immediately
    const userMsg: Message = { id: nextId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingContent("");

    // Build history to send to backend (all messages BEFORE the current one)
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      // Include current workflow step in page context so AI can give step-specific guidance
      const stepData = workflowConfig?.steps[currentStep ?? 0];
      const enrichedContext = pageContext
        ? {
            ...pageContext,
            currentStep: stepData
              ? `Step ${(currentStep ?? 0) + 1}: ${stepData.title}`
              : undefined,
          }
        : undefined;

      const res = await widgetChat(apiKey, text, history, enrichedContext);

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: "Sorry, something went wrong. Please try again." },
        ]);
        return;
      }

      // Decode RAG sources from header before consuming the body stream
      let sources: RAGSource[] = [];
      try {
        const raw = res.headers.get("X-RAG-Sources");
        if (raw) {
          const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
          sources = JSON.parse(new TextDecoder().decode(bytes));
        }
      } catch (e) {
        console.warn("[ChatInterface] Failed to decode X-RAG-Sources:", e);
      }

      // Stream the response body
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamingContent(accumulated);
      }

      // Move streaming content to messages list
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: accumulated, sources },
      ]);
      setStreamingContent("");
    } catch (error) {
      console.error("[ChatInterface] Error:", error);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: "Connection error. Check your internet and try again." },
      ]);
      setStreamingContent("");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <MessageList messages={messages} streamingContent={streamingContent} isLoading={isLoading} />
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
