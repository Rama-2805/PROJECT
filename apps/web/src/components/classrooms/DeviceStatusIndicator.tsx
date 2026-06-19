"use client";

import { cn } from "@/lib/utils/cn";

interface DeviceStatusIndicatorProps {
  online: number;
  total: number;
  size?: "sm" | "md";
}

export function DeviceStatusIndicator({ online, total, size = "sm" }: DeviceStatusIndicatorProps) {
  const ratio = total > 0 ? online / total : 0;
  const colorClass = ratio >= 0.9 ? "bg-success" : ratio >= 0.7 ? "bg-warning" : "bg-error";

  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-300",
              dotSize,
              i < online ? colorClass : "bg-glass-heavy",
            )}
          />
        ))}
      </div>
      <span className={cn("font-medium tabular-nums", textSize, colorClass.replace("bg-", "text-"))}>
        {online}/{total}
      </span>
    </div>
  );
}
