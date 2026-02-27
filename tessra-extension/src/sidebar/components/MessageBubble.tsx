import React from "react";
import ReactMarkdown from "react-markdown";

// Defined locally — no Next.js import needed in extension
export interface RAGSource {
  document_id: string;
  document_title: string;
  chunk_index: number;
  similarity: number;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: RAGSource[];
}

export default function MessageBubble({ role, content, sources }: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[80%] rounded-lg bg-user-msg px-4 py-3 text-sm text-gray-100">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[80%] border-l-2 border-accent pl-4 py-1 text-sm text-gray-200 leading-relaxed">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-semibold text-indigo-300">{children}</strong>
            ),
            ul: ({ children }) => (
              <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            code: ({ children, className }) => {
              const isBlock = className?.includes("language-");
              if (isBlock) {
                return (
                  <code className="block rounded bg-user-msg p-2 my-2 text-xs font-mono overflow-x-auto">
                    {children}
                  </code>
                );
              }
              return (
                <code className="rounded bg-user-msg px-1 py-0.5 text-xs font-mono">
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
        {sources && sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1">
            <span className="text-xs text-gray-500">Sources:</span>
            {sources.map((s, i) => (
              <span
                key={i}
                className="text-xs text-gray-500 bg-user-msg rounded px-2 py-0.5"
              >
                {s.document_title} · {Math.round(s.similarity * 100)}%
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
