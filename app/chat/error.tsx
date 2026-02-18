"use client";

export default function ChatError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h2 className="font-serif text-xl font-bold mb-2">
          Something went wrong
        </h2>
        <p className="text-foreground/50 text-sm mb-4">
          {error.message || "An unexpected error occurred in the chat."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
