"use client";

import { useState } from "react";
import { H2_ECONOMICS_TOPICS, getTotalSubtopicCount } from "@/lib/topics";

interface TopicData {
  topic_key: string;
  topic_label: string;
  category: string;
  total_mentions: number;
  conversation_count: number;
}

interface QuizScore {
  topic_key: string;
  subtopic_key: string | null;
  score: number;
}

interface CoveredSubtopic {
  topic_key: string;
  subtopic_key: string;
}

interface TopicCoverageProps {
  topics: TopicData[];
  quizScores?: QuizScore[];
  coveredSubtopics?: CoveredSubtopic[];
}

type SubtopicEntry = { label: string; keywords: readonly string[] };

export default function TopicCoverage({
  quizScores = [],
  coveredSubtopics = [],
}: TopicCoverageProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Set of "topic_key/subtopic_key" for O(1) lookup
  const coveredSet = new Set(
    coveredSubtopics.map((s) => `${s.topic_key}/${s.subtopic_key}`)
  );

  // Average quiz score per subtopic — only count subtopic-level scores
  const subtopicScoreMap = new Map<string, number[]>();
  for (const qs of quizScores) {
    if (!qs.subtopic_key) continue;
    const key = `${qs.topic_key}/${qs.subtopic_key}`;
    const arr = subtopicScoreMap.get(key) ?? [];
    arr.push(qs.score);
    subtopicScoreMap.set(key, arr);
  }

  // A subtopic is mastered if its average quiz score ≥ 75
  const masteredSet = new Set<string>();
  for (const [key, scores] of subtopicScoreMap) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 75) masteredSet.add(key);
  }

  function getSubtopicAvg(key: string): number | null {
    const scores = subtopicScoreMap.get(key);
    if (!scores || scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  function getTopicStats(topicKey: string, subtopicKeys: string[]) {
    const total = subtopicKeys.length;
    let covered = 0;
    let mastered = 0;
    for (const sk of subtopicKeys) {
      const key = `${topicKey}/${sk}`;
      if (coveredSet.has(key)) covered++;
      if (masteredSet.has(key)) mastered++;
    }
    const coveredPct = total > 0 ? Math.round((covered / total) * 100) : 0;
    const masteredPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return { total, covered, mastered, coveredPct, masteredPct };
  }

  function renderSubtopicRow(topicKey: string, subtopicKey: string, subtopic: SubtopicEntry) {
    const key = `${topicKey}/${subtopicKey}`;
    const isCovered = coveredSet.has(key);
    const isMastered = masteredSet.has(key);
    const avg = getSubtopicAvg(key);

    let statusLabel: string;
    let statusColor: string;
    if (isMastered) {
      statusLabel = "Mastered";
      statusColor = "text-green-500";
    } else if (isCovered) {
      statusLabel = "Covered";
      statusColor = "text-amber-500";
    } else {
      statusLabel = "Not started";
      statusColor = "text-foreground/30";
    }

    return (
      <div key={subtopicKey} className="flex items-center gap-3 py-1.5">
        {/* Status dot */}
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: isMastered
              ? "#22c55e"
              : isCovered
              ? "#d4a017"
              : "rgba(240,244,255,0.15)",
          }}
        />
        {/* Name */}
        <span className="text-xs text-foreground/70 flex-1 min-w-0">
          {subtopic.label}
        </span>
        {/* Quiz avg */}
        {avg !== null && (
          <span className={`text-xs font-mono flex-shrink-0 ${isMastered ? "text-green-500" : "text-foreground/40"}`}>
            {avg}%
          </span>
        )}
        {/* Status */}
        <span className={`text-xs flex-shrink-0 w-20 text-right ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
    );
  }

  function renderCategory(
    categoryKey: string,
    category: {
      label: string;
      topics: Record<string, { label: string; subtopics: Record<string, unknown> }>;
    }
  ) {
    return (
      <div key={categoryKey}>
        <h4 className="text-sm font-medium text-foreground/60 mb-2">
          {category.label}
        </h4>
        <div className="space-y-3">
          {Object.entries(category.topics).map(([topicKey, topic]) => {
            const subtopicKeys = Object.keys(topic.subtopics);
            const { total, covered, mastered, coveredPct, masteredPct } =
              getTopicStats(topicKey, subtopicKeys);
            const isExpanded = expandedTopic === topicKey;

            return (
              <div key={topicKey}>
                {/* Clickable topic row */}
                <button
                  className="w-full text-left group"
                  onClick={() =>
                    setExpandedTopic(isExpanded ? null : topicKey)
                  }
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground/70 group-hover:text-foreground/90 transition-colors flex items-center gap-1">
                      <span
                        className="inline-block transition-transform duration-200"
                        style={{
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          fontSize: "0.6rem",
                          opacity: 0.4,
                        }}
                      >
                        ▶
                      </span>
                      {topic.label}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {covered === 0 ? (
                        <span className="text-foreground/30">Not started</span>
                      ) : (
                        <>
                          <span className="text-foreground/50">
                            {covered}/{total}
                          </span>
                          {mastered > 0 ? (
                            <span className="text-green-500">
                              ({mastered} mastered)
                            </span>
                          ) : (
                            <span className="text-foreground/30">subtopics</span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  {/* Two-color stacked bar */}
                  <div className="h-2 rounded-full bg-foreground/5 relative overflow-hidden">
                    {coveredPct > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 transition-all duration-500"
                        style={{ width: `${coveredPct}%`, backgroundColor: "#d4a017" }}
                      />
                    )}
                    {masteredPct > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 transition-all duration-500"
                        style={{ width: `${masteredPct}%`, backgroundColor: "#22c55e" }}
                      />
                    )}
                  </div>
                </button>

                {/* Drill-down subtopic list */}
                {isExpanded && (
                  <div className="mt-2 ml-3 pl-3 border-l border-foreground/10 divide-y divide-foreground/5">
                    {subtopicKeys.map((sk) => {
                      const rawSubtopic = topic.subtopics[sk];
                      const subtopic = rawSubtopic as SubtopicEntry;
                      return renderSubtopicRow(topicKey, sk, subtopic);
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const totalSubtopics = getTotalSubtopicCount(); // 47
  const coveredSubtopicCount = coveredSet.size;
  const masteredSubtopicCount = masteredSet.size;

  return (
    <div className="rounded-lg border border-foreground/10 p-6">
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-serif text-lg font-bold">Syllabus Coverage</h3>
        <span className="text-sm text-foreground/40">
          {coveredSubtopicCount}/{totalSubtopics} subtopics
        </span>
      </div>
      {masteredSubtopicCount > 0 && (
        <p className="text-xs text-green-500 mb-4">
          {masteredSubtopicCount} subtopic{masteredSubtopicCount !== 1 ? "s" : ""} mastered
        </p>
      )}
      {masteredSubtopicCount === 0 && <div className="mb-4" />}
      <div className="space-y-6">
        {Object.entries(H2_ECONOMICS_TOPICS).map(([key, cat]) =>
          renderCategory(
            key,
            cat as {
              label: string;
              topics: Record<string, { label: string; subtopics: Record<string, unknown> }>;
            }
          )
        )}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-foreground/10">
        <div className="flex items-center gap-1.5 text-xs text-foreground/40">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#d4a017" }} />
          Covered
        </div>
        <div className="flex items-center gap-1.5 text-xs text-foreground/40">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
          Mastered (quiz ≥75%)
        </div>
        <div className="text-xs text-foreground/30 ml-auto">Click a topic to expand</div>
      </div>
    </div>
  );
}
