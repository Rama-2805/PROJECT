"use client";

import { cn } from "@/lib/utils/cn";

interface AttendanceProgressProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function AttendanceProgress({ percentage, size = "md", showLabel = true }: AttendanceProgressProps) {
  const getColorClass = (pct: number) => {
    if (pct >= 90) return "bg-success";
    if (pct >= 75) return "bg-warning";
    return "bg-error";
  };

  const getTextColorClass = (pct: number) => {
    if (pct >= 90) return "text-success";
    if (pct >= 75) return "text-warning";
    return "text-error";
  };

  const heights = { sm: "h-1", md: "h-1.5", lg: "h-2" };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={cn("flex-1 rounded-full bg-glass-light overflow-hidden", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-smooth", getColorClass(percentage))}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium tabular-nums shrink-0", getTextColorClass(percentage))}>
          {percentage}%
        </span>
      )}
    </div>
  );
}
