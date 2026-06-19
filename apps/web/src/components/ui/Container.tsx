"use client";

import { cn } from "@/lib/utils/cn";

/* ─── Types ──────────────────────────────────────────────────────── */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width variant */
  size?: "full" | "wide" | "narrow";
  /** Removes horizontal padding */
  noPadding?: boolean;
  /** Adds top/bottom section padding */
  asSection?: boolean;
}

/* ─── Size Map ──────────────────────────────────────────────────── */
const maxWidthMap = {
  full: "max-w-7xl",
  wide: "max-w-5xl",
  narrow: "max-w-3xl",
};

/* ─── Component ──────────────────────────────────────────────────── */
export function Container({
  children,
  className,
  size = "full",
  noPadding = false,
  asSection = false,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        maxWidthMap[size],
        !noPadding && "px-4 sm:px-6 lg:px-8",
        asSection && "py-12 sm:py-20 lg:py-28",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
