"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Container } from "@/components/ui/Container";
import { parseHighlightedText } from "@/components/ui/SectionTitle";
import {
  fadeInUp,
  staggerContainer,
  sectionEntrance,
} from "@/lib/animations";

/* ─── Counter Animation Hook ──────────────────────────────────── */
function useCountUp(target: number, duration: number = 2) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const started = useRef(false);

  useEffect(() => {
    if (!isInView || started.current) return;
    started.current = true;

    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, target, duration]);

  return { count, ref };
}

/* ─── Stat Card ───────────────────────────────────────────────── */
function StatCard({
  value,
  suffix,
  label,
  gradient,
}: {
  value: number;
  suffix: string;
  label: string;
  gradient: string;
}) {
  const { count, ref } = useCountUp(value);

  return (
    <motion.div
      variants={fadeInUp}
      className="relative group flex flex-col items-center text-center p-8 sm:p-10"
    >
      {/* Glow background */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl",
          gradient,
        )}
      />

      {/* Value */}
      <div className="relative mb-3">
        <span
          ref={ref}
          className={cn(
            "text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight",
            "bg-gradient-to-br bg-clip-text text-transparent",
            gradient,
          )}
        >
          {count}
        </span>
        <span
          className={cn(
            "text-3xl sm:text-4xl lg:text-5xl font-bold",
            "bg-gradient-to-br bg-clip-text text-transparent",
            gradient,
          )}
        >
          {suffix}
        </span>
      </div>

      {/* Label */}
      <p className="relative text-sm sm:text-base text-text-secondary font-medium">{label}</p>
    </motion.div>
  );
}

/* ─── Statistics Section ──────────────────────────────────────── */
const STATS = [
  { value: 100, suffix: "K+", label: "Students Processed", gradient: "from-ai-blue to-ai-cyan" },
  { value: 995, suffix: "%", label: "Recognition Accuracy", gradient: "from-ai-purple to-ai-blue" },
  { value: 500, suffix: "+", label: "Smart Classrooms", gradient: "from-ai-cyan to-ai-purple" },
  { value: 24, suffix: "/7", label: "AI Monitoring", gradient: "from-ai-blue to-success" },
];

export function Statistics() {
  return (
    <section id="ai-engine" className="relative py-20 sm:py-28 lg:py-36 overflow-hidden">
      <Container asSection={false}>
        <motion.div
          variants={sectionEntrance}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-16"
        >
          <div className="text-center">
            <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase border border-glass-border text-ai-blue mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-ai-blue animate-glow-pulse" />
              By the Numbers
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-primary">
              {parseHighlightedText("Trusted by **Educators** Worldwide")}
            </h2>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="relative grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
