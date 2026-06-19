/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { motion } from "framer-motion";
import { useMagneticButton } from "@/hooks/useMagneticButton";
import { cn } from "@/lib/utils/cn";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  magnetic?: boolean;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ children, variant = "primary", magnetic = true, className, ...props }, ref) => {
    const { ref: magneticRef, x, y, handleMouseMove, handleMouseLeave } = useMagneticButton(0.3);

    const baseStyles = "relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all overflow-hidden backdrop-blur-xl group";
    
    const variants = {
      primary: "bg-white/10 text-white border border-white/20 shadow-[0_4px_30px_rgba(255,255,255,0.1)] hover:bg-white/20 hover:border-white/30",
      secondary: "bg-ai-blue/20 text-blue-100 border border-ai-blue/30 shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:bg-ai-blue/30 hover:border-ai-blue/50",
      outline: "bg-transparent text-white border border-white/30 hover:bg-white/5",
    };

    const MotionButton = motion.button as any;

    return (
      <MotionButton
        ref={magnetic ? magneticRef : ref}
        style={magnetic ? { x, y } : {}}
        onMouseMove={magnetic ? handleMouseMove : undefined}
        onMouseLeave={magnetic ? handleMouseLeave : undefined}
        className={cn(baseStyles, variants[variant], className)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {/* Animated Gloss Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-150%] skew-x-[-45deg] group-hover:animate-shimmer pointer-events-none" />
        
        {/* Inner shadow highlight */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] pointer-events-none" />
        
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </MotionButton>
    );
  }
);

GlassButton.displayName = "GlassButton";
