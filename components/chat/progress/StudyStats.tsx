"use client";

interface StudyStatsProps {
  streakDays: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
  totalSessions: number;
  totalMessages: number;
  avgSessionMinutes: number;
}

export default function StudyStats({
  streakDays,
  hoursThisWeek,
  hoursThisMonth,
  totalSessions,
  totalMessages,
  avgSessionMinutes,
}: StudyStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <StatCard label="Study Streak" value={`${streakDays}`} unit="days" />
      <StatCard
        label="This Week"
        value={`${hoursThisWeek}`}
        unit="hours"
      />
      <StatCard
        label="This Month"
        value={`${hoursThisMonth}`}
        unit="hours"
      />
      <StatCard label="Sessions" value={`${totalSessions}`} unit="total" />
      <StatCard
        label="Questions Asked"
        value={`${totalMessages}`}
        unit="total"
      />
      <StatCard
        label="Avg Session"
        value={`${avgSessionMinutes}`}
        unit="min"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 p-4">
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="text-2xl font-bold text-accent mt-1">{value}</p>
      <p className="text-xs text-foreground/40">{unit}</p>
    </div>
  );
}
