"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface TestimonialItem {
  quote: string;
  name: string;
  designation: string;
  src: string;
}

export interface CircularTestimonialsProps {
  testimonials: TestimonialItem[];
  autoplay?: boolean;
  autoplayInterval?: number;
  colors?: {
    name?: string;
    designation?: string;
    testimony?: string;
    arrowBackground?: string;
    arrowForeground?: string;
    arrowHoverBackground?: string;
  };
  fontSizes?: {
    name?: string;
    designation?: string;
    quote?: string;
  };
  className?: string;
}

export function CircularTestimonials({
  testimonials,
  autoplay = true,
  autoplayInterval = 5000,
  colors = {},
  fontSizes = {},
  className,
}: CircularTestimonialsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback defaults for colors
  const nameColor = colors.name || "currentColor";
  const designationColor = colors.designation || "rgba(255,255,255,0.6)";
  const testimonyColor = colors.testimony || "rgba(255,255,255,0.85)";
  const arrowBg = colors.arrowBackground || "rgba(255,255,255,0.1)";
  const arrowFg = colors.arrowForeground || "currentColor";
  const arrowHoverBg = colors.arrowHoverBackground || "rgba(255,255,255,0.2)";

  // Fallback defaults for font sizes
  const nameSize = fontSizes.name || "24px";
  const designationSize = fontSizes.designation || "16px";
  const quoteSize = fontSizes.quote || "18px";

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Autoplay functionality
  useEffect(() => {
    if (autoplay && testimonials.length > 1) {
      autoplayRef.current = setInterval(nextTestimonial, autoplayInterval);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [autoplay, autoplayInterval, testimonials.length]);

  const handleManualNav = (action: () => void) => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = setInterval(nextTestimonial, autoplayInterval);
    }
    action();
  };

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row items-center justify-between gap-12 w-full max-w-5xl mx-auto p-6 md:p-12 relative overflow-hidden",
        className
      )}
    >
      {/* Visual Avatar Ring Structure */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 shrink-0 flex items-center justify-center">
        {/* Animated outer ring */}
        <div className="absolute inset-0 rounded-full border border-dashed border-white/10 dark:border-white/10 animate-spin-slow pointer-events-none" />

        {/* Central glowing background circle */}
        <div className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-tr from-blue-500/10 to-purple-500/10 blur-xl pointer-events-none" />

        {/* Circular placement of avatars */}
        {testimonials.map((t, idx) => {
          // Calculate angle for current avatar based on active index offset to rotate the ring
          const angleOffset = -activeIndex * (2 * Math.PI / testimonials.length);
          const angle = (idx * (2 * Math.PI / testimonials.length)) + angleOffset - Math.PI / 2;
          const radius = 100; // Radius distance in pixels

          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          const isActive = idx === activeIndex;

          return (
            <motion.button
              key={idx}
              className="absolute w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 cursor-pointer focus:outline-none z-20"
              style={{
                borderColor: isActive ? (colors.arrowHoverBackground || "#3B82F6") : "rgba(255,255,255,0.15)",
                boxShadow: isActive ? `0 0 20px ${colors.arrowHoverBackground || "rgba(59,130,246,0.35)"}` : "none",
              }}
              animate={{
                x,
                y,
                scale: isActive ? 1.15 : 0.85,
                opacity: isActive ? 1 : 0.6,
              }}
              transition={{ type: "spring", stiffness: 120, damping: 15 }}
              onClick={() => handleManualNav(() => setActiveIndex(idx))}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.src}
                alt={t.name}
                className="w-full h-full object-cover pointer-events-none"
              />
            </motion.button>
          );
        })}
      </div>

      {/* Quote Display Section */}
      <div className="flex-1 flex flex-col justify-center min-h-[220px] text-left">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex flex-col gap-4"
          >
            {/* Elegant large quote icon */}
            <span className="text-6xl text-white/10 font-serif leading-none select-none h-4">“</span>

            <p
              className="italic leading-relaxed font-medium"
              style={{ fontSize: quoteSize, color: testimonyColor }}
            >
              {testimonials[activeIndex].quote}
            </p>

            <div className="mt-2">
              <h4
                className="font-bold"
                style={{ fontSize: nameSize, color: nameColor }}
              >
                {testimonials[activeIndex].name}
              </h4>
              <p
                className="font-medium mt-0.5"
                style={{ fontSize: designationSize, color: designationColor }}
              >
                {testimonials[activeIndex].designation}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3 mt-8 relative z-10">
          <motion.button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors focus:outline-none cursor-pointer border border-white/5"
            style={{ backgroundColor: arrowBg, color: arrowFg }}
            whileHover={{ scale: 1.1, backgroundColor: arrowHoverBg }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleManualNav(prevTestimonial)}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          <motion.button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors focus:outline-none cursor-pointer border border-white/5"
            style={{ backgroundColor: arrowBg, color: arrowFg }}
            whileHover={{ scale: 1.1, backgroundColor: arrowHoverBg }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleManualNav(nextTestimonial)}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default CircularTestimonials;
