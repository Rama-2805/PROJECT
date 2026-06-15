"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { fadeInUp } from "@/lib/animations";

export interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-secondary/50 to-bg-primary" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-ai-blue/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-ai-purple/10 rounded-full blur-3xl" />
      </div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card p-8 sm:p-10">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ai-blue to-ai-purple">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">
              SmartCampus <span className="gradient-text">AI</span>
            </span>
          </div>

          {/* Title */}
          <motion.div variants={fadeInUp} className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">{title}</h1>
            <p className="text-sm text-text-muted">{subtitle}</p>
          </motion.div>

          {/* Content */}
          {children}
        </div>
      </motion.div>
    </div>
  );
}
