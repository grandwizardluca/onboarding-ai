"use client";

import { H2_ECONOMICS_TOPICS } from "@/lib/topics";

interface TopicData {
  topic_key: string;
  topic_label: string;
  category: string;
  total_mentions: number;
  conversation_count: number;
}

interface TopicCoverageProps {
  topics: TopicData[];
}

export default function TopicCoverage({ topics }: TopicCoverageProps) {
  const topicMap = new Map(topics.map((t) => [t.topic_key, t]));

  function getStrength(mentions: number): {
    label: string;
    color: string;
    percent: number;
  } {
    if (mentions === 0)
      return { label: "Not started", color: "bg-foreground/10", percent: 0 };
    if (mentions <= 3)
      return { label: "Weak", color: "bg-red-500", percent: 25 };
    if (mentions <= 10)
      return { label: "Developing", color: "bg-amber-500", percent: 60 };
    return { label: "Strong", color: "bg-green-500", percent: 100 };
  }

  function renderCategory(
    categoryKey: string,
    category: { label: string; topics: Record<string, { label: string }> }
  ) {
    return (
      <div key={categoryKey}>
        <h4 className="text-sm font-medium text-foreground/60 mb-2">
          {category.label}
        </h4>
        <div className="space-y-2">
          {Object.entries(category.topics).map(([topicKey, topic]) => {
            const data = topicMap.get(topicKey);
            const mentions = data?.total_mentions || 0;
            const strength = getStrength(mentions);

            return (
              <div key={topicKey}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground/70">{topic.label}</span>
                  <span className="text-foreground/40">
                    {strength.label}
                    {mentions > 0 && ` (${mentions})`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-foreground/5">
                  <div
                    className={`h-full rounded-full ${strength.color} transition-all`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Count covered topics
  const coveredCount = topics.filter((t) => t.total_mentions > 0).length;
  let totalCount = 0;
  for (const cat of Object.values(H2_ECONOMICS_TOPICS)) {
    totalCount += Object.keys(cat.topics).length;
  }

  return (
    <div className="rounded-lg border border-foreground/10 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-serif text-lg font-bold">Syllabus Coverage</h3>
        <span className="text-sm text-foreground/40">
          {coveredCount}/{totalCount} topics
        </span>
      </div>
      <div className="space-y-6">
        {Object.entries(H2_ECONOMICS_TOPICS).map(([key, cat]) =>
          renderCategory(key, cat as { label: string; topics: Record<string, { label: string }> })
        )}
      </div>
    </div>
  );
}
