"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "@/components/glass/GlassCard";

/* ─── Animated Counter Hook ────────────────────────────────────── */
function useCountUp(target: number, duration = 1.5, suffix = "") {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const started = useRef(false);

  useEffect(() => {
    if (!isInView || started.current) return;
    started.current = true;
    let startTime: number | null = null;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, target, duration]);

  const display = suffix === "%"
    ? `${count}`
    : target >= 10000
      ? `${(count / 1000).toFixed(1)}K`
      : `${count.toLocaleString()}`;

  return { display, ref: ref as React.RefObject<HTMLSpanElement | null> };
}

/* ─── Mini Sparkline ────────────────────────────────────────────── */
interface MiniSparklineProps {
  colorClass?: string;
}

function MiniSparkline({ colorClass = "text-blue-400" }: MiniSparklineProps) {
  return (
    <svg className="w-full h-8" viewBox="0 0 100 24" fill="none">
      <path
        d="M0 16 Q 12 8, 24 14 T 48 6 T 72 12 T 100 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className={cn(colorClass, "opacity-20")}
        fill="none"
      />
      <motion.path
        d="M0 16 Q 12 8, 24 14 T 48 6 T 72 12 T 100 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={colorClass}
        style={{
          filter: "drop-shadow(0 0 5px currentColor)",
        }}
        fill="none"
        initial={{ pathLength: 0.9, opacity: 0.7 }}
        animate={{ 
          pathLength: [0.85, 1, 0.85],
          opacity: [0.6, 1, 0.6]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </svg>
  );
}

/* ─── MetricCard Props ─────────────────────────────────────────── */
export interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  accent?: string;
}

/* ─── MetricCard Component ─────────────────────────────────────── */
export function MetricCard({ label, value, suffix = "", icon, trend, accent = "from-ai-blue to-ai-purple" }: MetricCardProps) {
  const { display } = useCountUp(value, 1.5, suffix);

  // Map accents to high-fidelity glow and text colors
  let glowColor = "rgba(59, 130, 246, 0.25)";
  let sparklineColor = "text-blue-400";
  let hoverShadow = "hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)]";

  if (accent.includes("blue") || accent.includes("indigo")) {
    glowColor = "rgba(59, 130, 246, 0.3)";
    sparklineColor = "text-blue-400";
    hoverShadow = "hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)]";
  } else if (accent.includes("purple") || accent.includes("pink")) {
    glowColor = "rgba(168, 85, 247, 0.3)";
    sparklineColor = "text-purple-400";
    hoverShadow = "hover:shadow-[0_20px_50px_rgba(168,85,247,0.15)]";
  } else if (accent.includes("emerald") || accent.includes("success")) {
    glowColor = "rgba(16, 185, 129, 0.3)";
    sparklineColor = "text-emerald-400";
    hoverShadow = "hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)]";
  } else if (accent.includes("cyan")) {
    glowColor = "rgba(6, 182, 212, 0.3)";
    sparklineColor = "text-cyan-400";
    hoverShadow = "hover:shadow-[0_20px_50px_rgba(6,182,212,0.15)]";
  } else if (accent.includes("amber") || accent.includes("yellow")) {
    glowColor = "rgba(245, 158, 11, 0.3)";
    sparklineColor = "text-amber-400";
    hoverShadow = "hover:shadow-[0_20px_50px_rgba(245,158,11,0.15)]";
  }

  return (
    <GlassCard 
      className={cn(
        "relative p-5 sm:p-6 flex flex-col justify-between group overflow-hidden border-white/[0.07] bg-[#060814]/70",
        hoverShadow
      )}
      glowColor={glowColor}
      tilt={true}
    >
      {/* Cyber Grid Overlay inside card */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity duration-500" />
      
      {/* Subtle tech scanner scanline overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity" />

      {/* Top row: Icon & Trend */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br",
          accent,
          "text-white shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-300",
        )}>
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-semibold px-2.5 py-1 rounded-lg border",
            trend.positive 
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
              : "text-red-400 bg-red-500/10 border-red-500/20",
          )}>
            <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={trend.positive ? "M4.5 15.75l7.5-7.5 7.5 7.5" : "M19.5 8.25l-7.5 7.5-7.5-7.5"} />
            </svg>
            {trend.value}%
          </span>
        )}
      </div>

      {/* Value */}
      <div className="relative mb-1.5 z-10">
        <span className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent group-hover:text-white transition-colors duration-300">
          {display}
        </span>
        {suffix && suffix !== "%" && suffix !== "K+" && (
          <span className="text-sm text-gray-500 ml-1.5 font-medium">{suffix}</span>
        )}
      </div>

      {/* Label */}
      <p className="relative text-[11px] text-gray-400 font-bold uppercase tracking-wider z-10">{label}</p>

      {/* Mini chart */}
      <div className="relative mt-4 opacity-50 group-hover:opacity-100 transition-all duration-500 group-hover:scale-[1.02]">
        <MiniSparkline colorClass={sparklineColor} />
      </div>
    </GlassCard>
  );
}
