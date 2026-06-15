"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  fadeInUp,
  fadeIn,
  staggerContainer,
  sectionEntrance,
} from "@/lib/animations";

/* ─── Feature Data ────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: "AI Attendance",
    description: "Automatically recognize students and mark attendance using facial recognition technology.",
    accent: "from-ai-blue to-ai-cyan",
    gradient: "group-hover:shadow-ai-blue/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    title: "Behavioral Analytics",
    description: "Detect attention levels, phone usage, and engagement patterns across the classroom in real-time.",
    accent: "from-ai-purple to-ai-blue",
    gradient: "group-hover:shadow-ai-purple/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    title: "Real-Time Monitoring",
    description: "Live classroom insights and instant alerts for educators to respond to emerging situations.",
    accent: "from-ai-cyan to-ai-blue",
    gradient: "group-hover:shadow-ai-cyan/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.545m9.546 0a6.75 6.75 0 010 9.545M3.879 19.122a9.75 9.75 0 010-14.244m16.242 0a9.75 9.75 0 010 14.244" />
      </svg>
    ),
    title: "Edge AI",
    description: "Process AI inference locally on edge devices for maximum speed, privacy, and offline capability.",
    accent: "from-success to-ai-cyan",
    gradient: "group-hover:shadow-success/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Smart Analytics",
    description: "Visualize attendance trends, learning patterns, and behavioral insights with beautiful dashboards.",
    accent: "from-ai-purple to-ai-cyan",
    gradient: "group-hover:shadow-ai-purple/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Secure Cloud Platform",
    description: "Enterprise-grade security with end-to-end encryption, SOC 2 compliance, and multi-campus management.",
    accent: "from-ai-blue to-success",
    gradient: "group-hover:shadow-ai-blue/20",
  },
];

/* ─── 3D Tilt Card ────────────────────────────────────────────── */
function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-5, 5]);

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xVal = (e.clientX - rect.left) / rect.width - 0.5;
    const yVal = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xVal);
    y.set(yVal);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={cn("perspective-[1000px]", className)}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY }}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Feature Card ────────────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
  accent,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  index: number;
}) {
  return (
    <TiltCard
      className={cn(
        "w-full",
        index >= 3 ? "sm:col-span-1" : "",
      )}
    >
      <motion.div
        variants={fadeInUp}
        className="group relative h-full glass rounded-card p-6 sm:p-7 border border-glass-border
                   transition-all duration-500 hover:border-glass-medium
                   hover:shadow-xl hover:-translate-y-1"
      >
        {/* Gradient border on hover */}
        <div
          className={cn(
            "absolute inset-0 rounded-card opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
            "bg-gradient-to-br",
            accent,
            "p-[1px]",
          )}
          style={{
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        {/* Icon */}
        <div
          className={cn(
            "relative mb-5 flex h-12 w-12 items-center justify-center rounded-xl",
            "bg-gradient-to-br",
            accent,
            "text-white shadow-lg",
          )}
        >
          {icon}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-text-primary mb-2.5 group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="text-sm text-text-dim leading-relaxed group-hover:text-text-secondary transition-colors">
          {description}
        </p>

        {/* Hover glow accent */}
        <div
          className={cn(
            "absolute -inset-0.5 rounded-card opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none",
            "bg-gradient-to-br",
            accent,
          )}
          style={{ opacity: 0 }}
        />
      </motion.div>
    </TiltCard>
  );
}

/* ─── Features Section ────────────────────────────────────────── */
export function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28 lg:py-36 overflow-hidden">
      {/* Section background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-ai-blue/5 via-ai-purple/5 to-ai-cyan/5 blur-3xl rounded-full pointer-events-none" />

      <Container asSection={false}>
        <motion.div
          variants={sectionEntrance}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-16 sm:mb-20"
        >
          <SectionTitle
            badge="Features"
            title="Intelligence Behind **Every** Classroom"
            description="Discover how SmartCampus AI transforms traditional education with advanced artificial intelligence and real-time analytics."
            align="center"
            className="mx-auto"
          />
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} index={i} />
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
