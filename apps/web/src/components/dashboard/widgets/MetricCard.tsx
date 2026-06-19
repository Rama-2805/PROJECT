"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "@/components/glass/GlassCard";
import { useUIStore } from "@/store/uiStore";

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
  const theme = useUIStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme === "light";
  
  // Map accents to high-fidelity glow and text colors
  const glowColor = isLight ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const sparklineColor = isLight ? "text-blue-500/40" : "text-white/30";

  return (
    <GlassCard 
      className="relative p-5 sm:p-6 flex flex-col justify-between group overflow-hidden"
      glowColor={glowColor}
      tilt={true}
    >
      {/* subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-text-primary opacity-25 blur-sm transition-colors duration-300" />
      
      {/* Cyber Grid Overlay inside card */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-glass-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-glass-border)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity duration-500" />
      
      {/* Subtle tech scanner scanline overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-text-primary/[0.005] to-transparent pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity" />

      {/* Top row: Icon & Trend */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-glass-light text-text-primary shadow-glass border border-glass-border group-hover:scale-105 transition-all duration-300">
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-semibold px-2.5 py-1 rounded-lg border",
            trend.positive 
              ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20" 
              : "text-red-500 bg-red-500/10 border-red-500/20 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20",
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
        <span className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-b from-text-primary via-text-primary to-text-secondary bg-clip-text text-transparent group-hover:text-text-primary transition-all duration-300">
          {display}
        </span>
        {suffix && suffix !== "%" && suffix !== "K+" && (
          <span className="text-sm text-text-muted ml-1.5 font-medium">{suffix}</span>
        )}
      </div>

      {/* Label */}
      <p className="relative text-[11px] text-text-muted font-bold uppercase tracking-wider z-10">{label}</p>

      {/* Mini chart */}
      <div className="relative mt-4 opacity-50 group-hover:opacity-100 transition-all duration-500 group-hover:scale-[1.02]">
        <MiniSparkline colorClass={sparklineColor} />
      </div>
    </GlassCard>
  );
}
