import React, { useMemo } from "react";
import type { Goal } from "@/domain/types";
import {
  differenceInDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isValid,
} from "date-fns";
import { cn } from "@/domain/utils";

interface GoalTimelineProps {
  goals: Goal[];
}

export const GoalTimeline: React.FC<GoalTimelineProps> = ({ goals }) => {
  const timeline = useMemo(() => {
    if (goals.length === 0) return null;

    const starts = goals
      .map((g) => new Date(g.startDate))
      .filter((d) => isValid(d));
    const ends = goals
      .map((g) => new Date(g.endDate))
      .filter((d) => isValid(d));

    if (!starts.length || !ends.length) return null;

    const minStart = new Date(Math.min(...starts.map((d) => d.getTime())));
    const maxEnd = new Date(Math.max(...ends.map((d) => d.getTime())));

    const start = new Date(minStart.getFullYear(), minStart.getMonth(), 1);
    const end = endOfMonth(maxEnd);

    const months = eachMonthOfInterval({ start, end });
    const totalDays = differenceInDays(end, start);

    return { start, end, months, totalDays };
  }, [goals]);

  if (!timeline) return null;

  const { start, months, totalDays } = timeline;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Month header */}
        <div className="flex text-[10px] font-bold text-slate-400 uppercase border-b mb-3">
          <div className="w-32 shrink-0 px-2">Goal</div>
          <div className="flex-1 flex">
            {months.map((m) => (
              <div
                key={m.toISOString()}
                className="flex-1 px-2 border-l first:border-l-0"
              >
                {format(m, "MMM yyyy")}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {goals.map((goal) => {
            const s = new Date(goal.startDate);
            const e = new Date(goal.endDate);
            if (!isValid(s) || !isValid(e)) return null;

            const offset = differenceInDays(s, start);
            const duration = differenceInDays(e, s);

            const left = (offset / totalDays) * 100;
            const width = Math.max((duration / totalDays) * 100, 1);

            return (
              <div key={goal.id} className="flex items-center gap-2">
                <div
                  className="w-32 text-xs font-medium truncate text-slate-600"
                  title={goal.title}
                >
                  {goal.title}
                </div>

                <div className="flex-1 relative h-4 bg-slate-100 rounded-full">
                  <div
                    className={cn(
                      "absolute inset-y-0 rounded-full",
                      goal.color
                    )}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                  />
                </div>
              </div>
            );  
          })}
        </div>
      </div>
    </div>
  );
};