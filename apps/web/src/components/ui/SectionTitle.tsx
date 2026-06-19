"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { fadeInUp, fadeIn, staggerContainer } from "@/lib/animations";

/* ─── Types ──────────────────────────────────────────────────────── */
export interface SectionTitleProps {
  /** Small badge label shown above the title */
  badge?: string;
  /** Main heading text. Use `**word**` to apply gradient highlighting */
  title: string;
  /** Supporting description paragraph */
  description?: string;
  /** Horizontal alignment */
  align?: "center" | "left";
  /** Extra classes for the wrapper */
  className?: string;
  /** Adds `max-w-*` constraint */
  constrained?: boolean;
}

/* ─── Highlight Parser ─────────────────────────────────────────────
 * Converts `**word**` into gradient-highlighted spans             */
export function parseHighlightedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const word = part.slice(2, -2);
      return (
        <span
          key={i}
          className="gradient-text"
        >
          {word}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/* ─── Component ──────────────────────────────────────────────────── */
export function SectionTitle({
  badge,
  title,
  description,
  align = "center",
  className,
  constrained = true,
}: SectionTitleProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        align === "left" && "items-start text-left",
        constrained && "max-w-2xl",
        className,
      )}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Badge */}
      {badge && (
        <motion.span
          variants={fadeIn}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5",
            "text-xs font-medium tracking-wide uppercase",
            "glass border border-glass-border text-ai-blue",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-ai-blue animate-glow-pulse" />
          {badge}
        </motion.span>
      )}

      {/* Title */}
      <motion.h2
        variants={fadeInUp}
        className={cn(
          "text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight",
          "text-text-primary leading-tight",
        )}
      >
        {parseHighlightedText(title)}
      </motion.h2>

      {/* Description */}
      {description && (
        <motion.p
          variants={fadeInUp}
          className={cn(
            "text-base sm:text-lg leading-relaxed",
            "text-text-secondary max-w-xl",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}
