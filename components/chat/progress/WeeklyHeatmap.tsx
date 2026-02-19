"use client";

interface DayData {
  date: string; // YYYY-MM-DD
  hours: number;
  dayLabel: string; // Mon, Tue, etc.
}

interface WeeklyHeatmapProps {
  data: DayData[];
}

export default function WeeklyHeatmap({ data }: WeeklyHeatmapProps) {
  const maxHours = Math.max(...data.map((d) => d.hours), 1);

  return (
    <div className="rounded-lg border border-foreground/10 p-6">
      <h3 className="font-serif text-lg font-bold mb-4">This Week</h3>
      <div className="grid grid-cols-7 gap-2">
        {data.map((day) => {
          const intensity = day.hours / maxHours;
          const opacity = day.hours > 0 ? 0.2 + intensity * 0.8 : 0.05;

          return (
            <div key={day.date} className="text-center">
              <p className="text-xs text-foreground/40 mb-1">{day.dayLabel}</p>
              <div
                className="aspect-square rounded-md flex items-center justify-center"
                style={{ backgroundColor: `rgba(212, 160, 23, ${opacity})` }}
              >
                <span className="text-xs font-medium">
                  {day.hours > 0 ? `${day.hours}h` : "-"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
