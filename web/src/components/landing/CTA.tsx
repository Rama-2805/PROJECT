"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { sectionEntrance } from "@/lib/animations";

/* ─── CTA Section ─────────────────────────────────────────────── */
export function CTA() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with email service
    setEmail("");
  };

  return (
    <section id="contact" className="relative py-20 sm:py-28 lg:py-36 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-ai-blue/8 via-ai-purple/5 to-ai-cyan/8 blur-3xl rounded-full pointer-events-none" />

      <Container asSection={false}>
        <motion.div
          variants={sectionEntrance}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="relative max-w-3xl mx-auto"
        >
          {/* Glass CTA Card */}
          <div className="relative glass-card p-8 sm:p-12 lg:p-16 text-center">
            {/* Gradient border glow */}
            <div
              className="absolute -inset-[1px] rounded-card opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3), rgba(6,182,212,0.3))",
                filter: "blur(4px)",
                zIndex: -1,
              }}
            />

            {/* Inner content */}
            <div className="relative z-10 flex flex-col items-center gap-8">
              {/* Badge */}
              <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase border border-glass-border text-ai-blue">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-glow-pulse" />
                Limited Early Access
              </span>

              {/* Heading */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-primary leading-tight max-w-xl">
                Bring the{" "}
                <span className="gradient-text">Future of Education</span>{" "}
                to Your Institution
              </h2>

              {/* Description */}
              <p className="text-base sm:text-lg text-text-secondary max-w-lg leading-relaxed">
                Join 500+ forward-thinking institutions already transforming their classrooms
                with SmartCampus AI. Early adopters receive priority support and exclusive features.
              </p>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your work email"
                    required
                    className={cn(
                      "w-full h-12 px-5 rounded-button text-sm",
                      "bg-glass-light border border-glass-border",
                      "text-text-primary placeholder:text-text-muted",
                      "focus:outline-none focus:border-ai-blue/50 focus:ring-1 focus:ring-ai-blue/20",
                      "transition-all duration-300",
                    )}
                  />
                </div>
                <Button type="submit" variant="primary" size="lg" className="shrink-0">
                  Request Early Access
                </Button>
              </form>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Free 14-day trial
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
