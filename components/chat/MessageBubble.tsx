"use client";

import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  attachedFileName?: string;
}

export default function MessageBubble({ role, content, attachedFileName }: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[80%] flex flex-col items-end gap-1.5">
          {attachedFileName && (
            <div className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/30 px-3 py-1 text-xs text-accent/80">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              {attachedFileName}
            </div>
          )}
          <div className="rounded-lg bg-user-bubble px-4 py-3 text-sm">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="max-w-[80%] border-l-2 border-accent pl-4 py-2 font-sans text-sm leading-relaxed">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-semibold text-accent">{children}</strong>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            code: ({ children, className }) => {
              const isBlock = className?.includes("language-");
              if (isBlock) {
                return (
                  <code className="block rounded bg-user-bubble p-3 my-2 text-xs font-mono overflow-x-auto">
                    {children}
                  </code>
                );
              }
              return (
                <code className="rounded bg-user-bubble px-1.5 py-0.5 text-xs font-mono">
                  {children}
                </code>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-foreground/30 pl-3 italic text-foreground/70 my-2">
                {children}
              </blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
