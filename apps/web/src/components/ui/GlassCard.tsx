"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { cardHover } from "@/lib/animations";

/* ─── Types ──────────────────────────────────────────────────────── */
export interface GlassCardProps extends HTMLMotionProps<"div"> {
  /** Applies a gradient border glow effect */
  gradientBorder?: boolean;
  /** Makes the glass effect heavier */
  heavy?: boolean;
  /** No padding */
  noPadding?: boolean;
  /** Subtle variant with less opacity */
  subtle?: boolean;
}

/* ─── Component ──────────────────────────────────────────────────── */
export function GlassCard({
  children,
  className,
  gradientBorder = false,
  heavy = false,
  subtle = false,
  noPadding = false,
  ...props
}: GlassCardProps) {
  const glassClass = heavy
    ? "glass-heavy"
    : subtle
      ? "glass-subtle"
      : "glass";

  return (
    <motion.div
      className={cn(
        "rounded-card relative overflow-hidden transition-shadow duration-300",
        glassClass,
        !noPadding && "p-6 sm:p-8",
        gradientBorder && "glass-card",
        "hover:shadow-glow-blue/10",
        className,
      )}
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      {...props}
    >
      {children}
    </motion.div>
  );
}
