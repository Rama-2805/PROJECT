"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import type { ActivityEvent } from "@/lib/mock/dashboard";
import { GlassCard } from "@/components/glass/GlassCard";
import { useUIStore } from "@/store/uiStore";

export interface ActivityFeedProps {
  events: ActivityEvent[];
}

const severityConfig = {
  info: { 
    dot: "bg-cyan-500 dark:bg-cyan-400", 
    border: "border-cyan-500/10 dark:border-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-400",
    shadowColor: "#0891B2"
  },
  warning: { 
    dot: "bg-amber-500 dark:bg-amber-400", 
    border: "border-amber-500/15 dark:border-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    shadowColor: "#D97706"
  },
  critical: { 
    dot: "bg-red-500", 
    border: "border-red-500/20 dark:border-red-500/20",
    text: "text-red-600 dark:text-red-400",
    shadowColor: "#EF4444"
  },
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  const [filter, setFilter] = useState<string>("all");
  const theme = useUIStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme === "light";
  const glowColor = isLight ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.08)";

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <GlassCard className="p-5 sm:p-6" glowColor={glowColor}>
      {/* subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-text-primary opacity-20 blur-sm transition-colors duration-300" />
      {/* Cyber Grid Overlay inside card */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-glass-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-glass-border)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none opacity-30" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-glass-border pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-text-primary animate-pulse" style={{ filter: "drop-shadow(0 0 3px var(--color-text-primary))" }} />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-primary">TELEMETRY FEED</h3>
        </div>
        <div className="flex gap-1.5">
          {["all", "attendance", "alert", "device"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-300",
                filter === f
                  ? "bg-glass-heavy text-text-primary border border-glass-border shadow-glass"
                  : "text-text-muted hover:text-text-primary border border-transparent",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Events */}
      <motion.div
        className="space-y-2.5 max-h-[320px] overflow-y-auto scrollbar-thin pr-1 relative z-10 text-text-primary"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {filtered.map((event) => {
          const sev = severityConfig[event.severity];
          return (
            <motion.div
              key={event.id}
              variants={fadeInUp}
              className={cn(
                "flex gap-3 p-3 rounded-lg border bg-bg-primary/40 hover:bg-glass-heavy hover:border-glass-border/40 transition-all duration-300 font-mono text-[10px]",
                sev.border,
              )}
            >
              {/* Severity dot */}
              <div className="mt-1 flex items-center justify-center shrink-0">
                <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", sev.dot)} style={{ filter: `drop-shadow(0 0 4px ${sev.shadowColor})` }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-text-primary uppercase tracking-wide truncate">{event.title}</p>
                  <span className="text-[9px] text-text-muted font-mono shrink-0">[{event.time}]</span>
                </div>
                <p className="text-text-secondary text-[10px] mt-1 leading-relaxed">{event.description}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </GlassCard>
  );
}
