"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import {
  fadeInUp,
  fadeIn,
  staggerContainer,
  floating,
  glowPulse,
} from "@/lib/animations";

/* ─── Hero Content Animation ──────────────────────────────────── */
const contentVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

/* ─── Splitting text into characters for reveal ──────────────── */
function AnimatedHeading() {
  const text = "Transform Traditional Classrooms Into Intelligent Learning Environments";
  const words = text.split(" ");

  return (
    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
      {words.map((word, i) => {
        const isHighlighted =
          word === "Intelligent" || word === "Learning" || word === "Environments";
        return (
          <motion.span
            key={i}
            className={cn(
              "inline-block mr-[0.3em]",
              isHighlighted && "gradient-text",
            )}
            initial={{ opacity: 0, y: 40, rotateX: -20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.4 + i * 0.04,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            {word}
          </motion.span>
        );
      })}
    </h1>
  );
}

/* ─── AI Dashboard Visualizer ─────────────────────────────────── */
function AIVisualizer() {
  const metrics = [
    { label: "Students Detected", value: "42", accent: "text-ai-blue" },
    { label: "Attendance Accuracy", value: "98.7%", accent: "text-success" },
    { label: "AI Confidence", value: "99.2%", accent: "text-ai-purple" },
    { label: "Active Devices", value: "24", accent: "text-ai-cyan" },
  ];

  return (
    <motion.div
      className="relative w-full max-w-lg mx-auto"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Glow behind card */}
      <div className="absolute inset-0 -inset-4 bg-gradient-to-br from-ai-blue/20 via-ai-purple/10 to-ai-cyan/20 rounded-3xl blur-3xl" />

      {/* Main Dashboard Card */}
      <motion.div
        className="relative glass-card p-6 sm:p-8 space-y-6"
        variants={floating}
        animate="animate"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.span
              className="h-2.5 w-2.5 rounded-full bg-success"
              variants={glowPulse}
              animate="animate"
            />
            <span className="text-xs font-medium text-text-dim tracking-wider uppercase">
              AI Status
            </span>
          </div>
          <span className="text-xs font-semibold text-success">● Active</span>
        </div>

        {/* Face Scan Box */}
        <div className="relative mx-auto aspect-square w-32 sm:w-40 rounded-2xl overflow-hidden bg-bg-secondary border border-glass-border">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl sm:text-6xl opacity-20">👤</span>
          </div>
          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-ai-cyan to-transparent"
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-ai-cyan/60 rounded-tl" />
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-ai-cyan/60 rounded-tr" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-ai-cyan/60 rounded-bl" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-ai-cyan/60 rounded-br" />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              className="glass-subtle rounded-xl p-3 space-y-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1 }}
            >
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
                {m.label}
              </p>
              <p className={cn("text-lg sm:text-xl font-bold", m.accent)}>
                {m.value}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating Data Card 1 */}
      <motion.div
        className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 glass rounded-xl px-4 py-3 shadow-glass"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, repeatType: "mirror", delay: 0.5 }}
      >
        <p className="text-[10px] uppercase tracking-wider text-text-muted">Recognition</p>
        <p className="text-sm font-bold text-ai-blue">99.5%</p>
      </motion.div>

      {/* Floating Data Card 2 */}
      <motion.div
        className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 glass rounded-xl px-4 py-3 shadow-glass"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "mirror", delay: 1.5 }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success animate-glow-pulse" />
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Live Feed</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Hero Section ────────────────────────────────────────────── */
export function Hero() {
  const scrollToCTA = () => {
    document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-24 pb-16 sm:pt-32 sm:pb-20 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ── Left Content ──────────────────────────────────── */}
          <motion.div
            className="relative z-10 flex flex-col gap-8"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase border border-glass-border text-ai-blue">
                <span className="h-1.5 w-1.5 rounded-full bg-ai-blue animate-glow-pulse" />
                AI-Powered Future of Education
              </span>
            </motion.div>

            {/* Heading */}
            <div className="space-y-2">
              <AnimatedHeading />
            </div>

            {/* Description */}
            <motion.p
              className="text-base sm:text-lg text-text-secondary max-w-lg leading-relaxed"
              variants={fadeInUp}
            >
              SmartCampus AI combines computer vision, face recognition, behavioral analytics,
              and edge intelligence to create the classroom of tomorrow — available today.
            </motion.p>

            {/* Tech Tags */}
            <motion.div
              className="flex flex-wrap gap-2"
              variants={fadeInUp}
            >
              {["Computer Vision", "Face Recognition", "Behavioral Analytics", "Edge AI"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1.5 rounded-full bg-glass-light border border-glass-border text-text-dim"
                  >
                    {tag}
                  </span>
                ),
              )}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-wrap gap-4 pt-2"
              variants={fadeInUp}
            >
              <Button
                variant="primary"
                size="lg"
                className="relative overflow-hidden group"
                onClick={scrollToCTA}
              >
                <span className="relative z-10">Experience AI Classroom</span>
                <span
                  className="absolute inset-0 rounded-button opacity-0
                             bg-gradient-to-r from-transparent via-white/20 to-transparent
                             group-hover:opacity-100 transition-opacity duration-500
                             -translate-x-full group-hover:translate-x-full"
                  aria-hidden="true"
                />
              </Button>
              <Button variant="secondary" size="lg">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Watch Demo
              </Button>
            </motion.div>
          </motion.div>

          {/* ── Right Visualizer ──────────────────────────────── */}
          <div className="relative z-10 flex items-center justify-center lg:justify-end">
            <AIVisualizer />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium">
          Scroll
        </span>
        <motion.div
          className="w-5 h-8 rounded-full border border-glass-border flex justify-center pt-1.5"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1 h-2 rounded-full bg-text-muted"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
