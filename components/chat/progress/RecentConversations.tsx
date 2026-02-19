"use client";

import Link from "next/link";

interface ConversationWithTopics {
  id: string;
  title: string;
  updated_at: string;
  topics: string[];
}

interface RecentConversationsProps {
  conversations: ConversationWithTopics[];
}

export default function RecentConversations({
  conversations,
}: RecentConversationsProps) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-lg border border-foreground/10 p-6">
        <h3 className="font-serif text-lg font-bold mb-4">
          Recent Conversations
        </h3>
        <p className="text-foreground/40 text-sm">No conversations yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-foreground/10 p-6">
      <h3 className="font-serif text-lg font-bold mb-4">
        Recent Conversations
      </h3>
      <div className="space-y-2">
        {conversations.map((conv) => (
          <Link
            key={conv.id}
            href={`/chat/${conv.id}`}
            className="block rounded-md p-3 hover:bg-user-bubble/50 transition-colors"
          >
            <p className="text-sm font-medium truncate">{conv.title}</p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {conv.topics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs px-1.5 py-0.5 rounded bg-accent/15 text-accent"
                >
                  {topic}
                </span>
              ))}
              {conv.topics.length === 0 && (
                <span className="text-xs text-foreground/30">No topics detected</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
