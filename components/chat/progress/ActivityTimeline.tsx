"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

interface ActivityPoint {
  time: string;
  timestamp: number;
  mouse: number;
  keyboard: number;
  message: number;
  tabFocused: boolean;
}

interface ActivityTimelineProps {
  data: ActivityPoint[];
}

export default function ActivityTimeline({ data }: ActivityTimelineProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-foreground/10 p-6">
        <h3 className="font-serif text-lg font-bold mb-4">Activity Timeline</h3>
        <p className="text-foreground/40 text-sm text-center py-8">
          No activity recorded for this date.
        </p>
      </div>
    );
  }

  // Find idle (unfocused) regions for grey background
  const idleRegions: { start: string; end: string }[] = [];
  let idleStart: string | null = null;

  for (const point of data) {
    if (!point.tabFocused && !idleStart) {
      idleStart = point.time;
    } else if (point.tabFocused && idleStart) {
      idleRegions.push({ start: idleStart, end: point.time });
      idleStart = null;
    }
  }
  if (idleStart) {
    idleRegions.push({ start: idleStart, end: data[data.length - 1].time });
  }

  return (
    <div className="rounded-lg border border-foreground/10 p-6">
      <h3 className="font-serif text-lg font-bold mb-2">Activity Timeline</h3>
      <div className="flex gap-4 text-xs text-foreground/50 mb-4">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#22c55e]" />
          Mouse
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#3b82f6]" />
          Keyboard
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-accent" />
          Question
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#374151]" />
          Idle
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} barGap={0} barCategoryGap={1}>
          {idleRegions.map((region, i) => (
            <ReferenceArea
              key={i}
              x1={region.start}
              x2={region.end}
              fill="#374151"
              fillOpacity={0.3}
            />
          ))}
          <XAxis
            dataKey="time"
            tick={{ fill: "#f0f4ff", fontSize: 10, opacity: 0.5 }}
            tickLine={false}
            axisLine={{ stroke: "#f0f4ff", opacity: 0.1 }}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={[0, 1.5]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a2035",
              border: "1px solid rgba(240,244,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#f0f4ff",
            }}
            formatter={(value: number | undefined, name: string | undefined) => {
              const labels: Record<string, string> = {
                mouse: "Mouse",
                keyboard: "Keyboard",
                message: "Question",
              };
              return [(value ?? 0) > 0 ? "Active" : "Inactive", labels[name ?? ""] || name || ""];
            }}
          />
          <Bar dataKey="mouse" fill="#22c55e" radius={[2, 2, 0, 0]} />
          <Bar dataKey="keyboard" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar
            dataKey="message"
            fill="#d4a017"
            radius={[2, 2, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
