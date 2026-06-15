"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import type { ActivityEvent } from "@/lib/mock/dashboard";
import { GlassCard } from "@/components/glass/GlassCard";

export interface ActivityFeedProps {
  events: ActivityEvent[];
}

const severityConfig = {
  info: { 
    dot: "bg-cyan-400", 
    border: "border-cyan-500/10",
    text: "text-cyan-400",
    shadowColor: "#22D3EE"
  },
  warning: { 
    dot: "bg-amber-400", 
    border: "border-amber-500/15",
    text: "text-amber-400",
    shadowColor: "#FBBF24"
  },
  critical: { 
    dot: "bg-red-500", 
    border: "border-red-500/20",
    text: "text-red-400",
    shadowColor: "#F87171"
  },
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <GlassCard className="p-5 sm:p-6 border-white/[0.07] bg-[#060814]/70" glowColor="rgba(6, 182, 212, 0.25)">
      {/* Cyber Grid Overlay inside card */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none opacity-30" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ filter: "drop-shadow(0 0 3px #22D3EE)" }} />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-300">TELEMETRY FEED</h3>
        </div>
        <div className="flex gap-1.5">
          {["all", "attendance", "alert", "device"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-300",
                filter === f
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                  : "text-gray-500 hover:text-gray-300 border border-transparent",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Events */}
      <motion.div
        className="space-y-2.5 max-h-[320px] overflow-y-auto scrollbar-thin pr-1 relative z-10"
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
                "flex gap-3 p-3 rounded-lg border bg-black/40 hover:bg-[#0c0e22]/60 hover:border-blue-500/25 transition-all duration-300 font-mono text-[10px]",
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
                  <p className="font-bold text-gray-200 uppercase tracking-wide truncate">{event.title}</p>
                  <span className="text-[9px] text-gray-500 font-mono shrink-0">[{event.time}]</span>
                </div>
                <p className="text-gray-400 text-[10px] mt-1 leading-relaxed">{event.description}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </GlassCard>
  );
}
