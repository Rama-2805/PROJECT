"use client";

import { cn } from "@/lib/utils/cn";

interface EnrollmentStatusBadgeProps {
  enrolled: boolean;
  confidence?: number;
  samples?: number;
}

export function EnrollmentStatusBadge({ enrolled, confidence, samples }: EnrollmentStatusBadgeProps) {
  if (!enrolled) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning border border-warning/20">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        Pending
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
        confidence && confidence >= 95
          ? "bg-success/10 text-success border-success/20"
          : confidence && confidence >= 85
            ? "bg-ai-blue/10 text-ai-blue border-ai-blue/20"
            : "bg-warning/10 text-warning border-warning/20",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          confidence && confidence >= 95 ? "bg-success" : confidence && confidence >= 85 ? "bg-ai-blue" : "bg-warning",
        )}
      />
      {confidence && confidence >= 95 ? "Verified" : confidence && confidence >= 85 ? "Good" : "Low"}
      {samples && <span className="opacity-60">({samples} samples)</span>}
    </span>
  );
}
