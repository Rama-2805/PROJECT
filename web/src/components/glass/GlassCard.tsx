import React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useMouseGlow } from "@/hooks/useMouseGlow";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  tilt?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps & React.HTMLAttributes<HTMLDivElement>>(({ children, className, glowColor = "rgba(59, 130, 246, 0.4)", tilt = true, ...props }, ref) => {
  const glowRef = useMouseGlow();
  
  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    if (!tilt) return;
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={glowRef as any}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tilt ? { rotateX, rotateY, transformStyle: "preserve-3d" } : {}}
      className={cn(
        "relative rounded-[2rem] overflow-hidden group transition-all duration-300",
        "bg-white/5 backdrop-blur-[40px] saturate-200",
        "border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      {/* Inner Highlight Edge */}
      <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] pointer-events-none" />

      {/* Mouse Glow Effect */}
      <div 
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), ${glowColor}, transparent 40%)`
        }}
      />
      
      {/* Content wrapper for 3D pop */}
      <div className="relative z-10 w-full h-full" style={tilt ? { transform: "translateZ(30px)" } : {}}>
        {children}
      </div>
    </motion.div>
  );
});
GlassCard.displayName = "GlassCard";
