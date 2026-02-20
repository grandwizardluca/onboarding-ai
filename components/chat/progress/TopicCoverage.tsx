"use client";

import { H2_ECONOMICS_TOPICS } from "@/lib/topics";

interface TopicData {
  topic_key: string;
  topic_label: string;
  category: string;
  total_mentions: number;
  conversation_count: number;
}

interface QuizScore {
  topic_key: string;
  score: number;
}

interface TopicCoverageProps {
  topics: TopicData[];
  quizScores?: QuizScore[];
}

export default function TopicCoverage({ topics, quizScores = [] }: TopicCoverageProps) {
  const topicMap = new Map(topics.map((t) => [t.topic_key, t]));

  // Build a map of topic_key → average quiz score
  const quizAverages = new Map<string, number>();
  const quizCounts = new Map<string, number>();
  for (const qs of quizScores) {
    const prev = quizAverages.get(qs.topic_key) ?? 0;
    const count = quizCounts.get(qs.topic_key) ?? 0;
    quizAverages.set(qs.topic_key, prev + qs.score);
    quizCounts.set(qs.topic_key, count + 1);
  }
  for (const [key, total] of quizAverages) {
    quizAverages.set(key, Math.round(total / (quizCounts.get(key) ?? 1)));
  }

  // Compute max_mentions across all topics for normalization
  const maxMentions = Math.max(1, ...topics.map((t) => t.total_mentions));

  function getStrength(topicKey: string): {
    label: string;
    color: string;
    percent: number;
    avgQuiz?: number;
  } {
    const data = topicMap.get(topicKey);
    const mentions = data?.total_mentions ?? 0;
    const avgQuiz = quizAverages.get(topicKey);

    let percent: number;
    let label: string;

    if (avgQuiz !== undefined) {
      // Weighted formula: 30% study coverage + 70% quiz performance
      percent = Math.round(
        0.3 * (mentions / maxMentions) * 100 + 0.7 * avgQuiz
      );
    } else {
      // No quiz data: normalize by max_mentions
      percent = mentions === 0 ? 0 : Math.round((mentions / maxMentions) * 100);
    }

    if (percent === 0) {
      label = "Not started";
    } else if (percent < 40) {
      label = "Weak";
    } else if (percent < 75) {
      label = "Developing";
    } else {
      label = "Strong";
    }

    const color =
      percent === 0
        ? "bg-foreground/10"
        : percent < 40
        ? "bg-red-500"
        : percent < 75
        ? "bg-amber-500"
        : "bg-green-500";

    return { label, color, percent, avgQuiz };
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
            const { label, color, percent, avgQuiz } = getStrength(topicKey);

            return (
              <div key={topicKey}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground/70">{topic.label}</span>
                  <span className="text-foreground/40 flex items-center gap-2">
                    {avgQuiz !== undefined && (
                      <span className="text-accent font-medium">
                        Avg Quiz: {avgQuiz}%
                      </span>
                    )}
                    {label}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-foreground/5">
                  <div
                    className={`h-full rounded-full ${color} transition-all`}
                    style={{ width: `${percent}%` }}
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
