"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  fadeInUp,
  staggerContainer,
  sectionEntrance,
} from "@/lib/animations";

/* ─── Pipeline Steps ──────────────────────────────────────────── */
const STEPS = [
  {
    label: "Camera",
    description: "HD cameras capture classroom activity in real-time",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.16a15.53 15.53 0 10-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
    gradient: "from-ai-blue to-ai-cyan",
  },
  {
    label: "AI Vision Engine",
    description: "Deep learning models analyze facial features and behavior patterns",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.545m9.546 0a6.75 6.75 0 010 9.545M3.879 19.122a9.75 9.75 0 010-14.244m16.242 0a9.75 9.75 0 010 14.244" />
      </svg>
    ),
    gradient: "from-ai-purple to-ai-blue",
  },
  {
    label: "Smart Analysis",
    description: "Edge AI processes data locally for instant insights and privacy",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
      </svg>
    ),
    gradient: "from-ai-cyan to-ai-blue",
  },
  {
    label: "Cloud Intelligence",
    description: "Aggregated data trains models and powers institution-wide analytics",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    gradient: "from-ai-purple to-ai-cyan",
  },
  {
    label: "Teacher Dashboard",
    description: "Intuitive interface with real-time metrics, alerts, and actionable insights",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    gradient: "from-success to-ai-blue",
  },
];

/* ─── Connecting Line ─────────────────────────────────────────── */
function ConnectingLine({ index }: { index: number }) {
  const isEven = index % 2 === 0;
  return (
    <div
      className={cn(
        "hidden lg:block absolute",
        isEven
          ? "top-full left-1/2 h-8 w-[1px]"
          : "top-1/2 right-full h-[1px] w-8",
        "bg-gradient-to-b from-ai-blue/40 to-ai-purple/40",
      )}
    >
      <motion.div
        className={cn(
          "absolute w-1.5 h-1.5 rounded-full bg-ai-blue",
          isEven ? "bottom-0 left-1/2 -translate-x-1/2" : "right-0 top-1/2 -translate-y-1/2",
        )}
        animate={{
          opacity: [0.3, 1, 0.3],
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: index * 0.3,
        }}
      />
    </div>
  );
}

/* ─── Pipeline Step ───────────────────────────────────────────── */
function PipelineStep({
  step,
  index,
}: {
  step: (typeof STEPS)[0];
  index: number;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      className="relative flex flex-col items-center text-center group"
    >
      {/* Icon container */}
      <div
        className={cn(
          "relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl mb-5",
          "bg-gradient-to-br",
          step.gradient,
          "shadow-lg transition-all duration-500",
          "group-hover:scale-110 group-hover:shadow-xl",
        )}
      >
        <div className="text-white">{step.icon}</div>

        {/* Pulse ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500",
            "bg-gradient-to-br",
            step.gradient,
            "blur-md",
          )}
        />
      </div>

      {/* Label */}
      <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-2">{step.label}</h3>

      {/* Description */}
      <p className="text-xs sm:text-sm text-text-dim max-w-[200px] leading-relaxed">{step.description}</p>
    </motion.div>
  );
}

/* ─── Technology Flow Section ─────────────────────────────────── */
export function TechnologyFlow() {
  return (
    <section id="technology" className="relative py-20 sm:py-28 lg:py-36 overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-ai-blue/5 to-ai-purple/5 blur-3xl rounded-full pointer-events-none" />

      <Container asSection={false}>
        <motion.div
          variants={sectionEntrance}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-16 sm:mb-20"
        >
          <SectionTitle
            badge="How It Works"
            title="AI Pipeline **Architecture**"
            description="From camera capture to actionable insights — see how our AI technology processes and transforms classroom data in real-time."
            align="center"
            className="mx-auto"
          />
        </motion.div>

        {/* Pipeline Grid */}
        <motion.div
          className="relative grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-10 sm:gap-8 lg:gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {STEPS.map((step, i) => (
            <div key={step.label} className="relative flex flex-col items-center">
              {/* Vertical connecting line on mobile/tablet */}
              {i < STEPS.length - 1 && (
                <div className="lg:hidden mt-4 h-8 w-[1px] bg-gradient-to-b from-ai-blue/30 to-ai-purple/30">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-ai-blue mx-auto -translate-x-[2px]"
                    animate={{
                      y: [0, 8, 0],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />
                </div>
              )}

              <PipelineStep step={step} index={i} />

              {/* Desktop connecting line */}
              {i < STEPS.length - 1 && <ConnectingLine index={i} />}
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
