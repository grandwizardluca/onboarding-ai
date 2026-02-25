"use client";

import { useState, useRef, useEffect } from "react";

export interface AttachedFile {
  name: string;
  content: string; // plain text for .txt/.md; base64 for .pdf
  isPdf: boolean;
}

interface ChatInputProps {
  onSend: (message: string, attachedFile?: AttachedFile) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || disabled) return;
    onSend(trimmed, attachedFile ?? undefined);
    setInput("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (isPdf) {
      // Read PDF as base64 — backend will extract text with pdf-parse
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Strip the "data:...;base64," prefix, keep only the base64 payload
        const base64 = dataUrl.split(",")[1];
        setAttachedFile({ name: file.name, content: base64, isPdf: true });
      };
      reader.readAsDataURL(file);
    } else {
      // .txt / .md — read as plain text
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFile({ name: file.name, content: reader.result as string, isPdf: false });
      };
      reader.readAsText(file);
    }
  }

  const canSend = (input.trim().length > 0 || attachedFile !== null) && !disabled;

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/[0.08] px-4 py-3">
      {/* File badge — shown when a file is attached */}
      {attachedFile && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/30 px-3 py-1 text-xs text-accent/80">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            {attachedFile.name}
          </div>
          <button
            type="button"
            onClick={() => {
              setAttachedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-foreground/40 hover:text-foreground/70 transition-colors text-xs"
            title="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />

        {/* Paperclip button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-shrink-0 rounded-lg border border-white/[0.12] bg-user-bubble p-3 text-foreground/40 hover:text-foreground/70 hover:border-white/20 transition-colors disabled:opacity-50"
          title="Attach a file (.txt, .md, .pdf)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about getting started..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-white/[0.12] bg-user-bubble px-4 py-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-300 focus:border-accent focus:shadow-[0_0_0_1px_rgba(255,255,255,0.2)] placeholder:text-foreground/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="group rounded-lg bg-accent px-4 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-accent/85 hover:shadow-[0_0_16px_rgba(255,255,255,0.18)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-1.5">
            Send
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </button>
      </div>
      <p className="text-xs text-foreground/30 mt-1.5 ml-1">
        Press Enter to send · Shift+Enter for new line · Attach .txt, .md or .pdf
      </p>
    </form>
  );
}
