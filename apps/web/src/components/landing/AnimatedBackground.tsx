"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

/* ─── Particle Canvas ─────────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 15000), 80);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.4 + 0.1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    initParticles();
    draw();

    const handleResize = () => {
      resize();
      initParticles();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}

/* ─── Glowing Orbs ────────────────────────────────────────────── */
function GlowingOrbs() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Large blue orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04) 40%, transparent 70%)",
          top: "15%",
          left: "10%",
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
        }}
        transition={{
          duration: 20,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      />

      {/* Purple orb */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 70% 30%, rgba(139, 92, 246, 0.10), rgba(139, 92, 246, 0.03) 40%, transparent 70%)",
          bottom: "10%",
          right: "15%",
        }}
        animate={{
          x: [0, -40, 30, 0],
          y: [0, 30, -30, 0],
        }}
        transition={{
          duration: 25,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      />

      {/* Cyan accent orb */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.08), rgba(6, 182, 212, 0.02) 40%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 15,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      />

      {/* Small accent orbs */}
      {[
        { top: "20%", left: "70%", size: 200, color: "rgba(59,130,246,0.06)", delay: 0 },
        { top: "70%", left: "25%", size: 150, color: "rgba(139,92,246,0.05)", delay: 5 },
        { top: "35%", left: "80%", size: 120, color: "rgba(6,182,212,0.04)", delay: 10 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
          }}
          animate={{
            y: [0, -20, 10, 0],
            opacity: [0.5, 0.8, 0.4, 0.5],
          }}
          transition={{
            duration: 12,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Grid Lines ──────────────────────────────────────────────── */
function GridLines() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Center vertical light ray */}
      <motion.div
        className="absolute top-0 bottom-0 left-1/2 w-[1px]"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(59,130,246,0.08), rgba(139,92,246,0.08), transparent)",
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "mirror" }}
      />
    </div>
  );
}

/* ─── Floating AI Symbols ─────────────────────────────────────── */
function FloatingSymbols() {
  const symbols = ["✦", "◈", "◇", "○", "△", "▽"];
  const [positions, setPositions] = useState<{ top: string; left: string }[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPositions(
      symbols.map(() => ({
        top: `${10 + Math.random() * 80}%`,
        left: `${5 + Math.random() * 90}%`,
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (positions.length === 0) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {symbols.map((symbol, i) => (
        <motion.div
          key={i}
          className="absolute text-ai-blue/10 text-lg"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.1, 0.3, 0.1],
            y: [0, -30, 0],
            rotate: [0, 180, 360],
          }}
          style={positions[i]}
          transition={{
            duration: 15 + i * 3,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
            delay: i * 2,
          }}
        >
          {symbol}
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────── */
export interface AnimatedBackgroundProps {
  className?: string;
}

export function AnimatedBackground({ className }: AnimatedBackgroundProps) {
  return (
    <div className={cn("fixed inset-0 z-0", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-secondary/50 to-bg-primary" />
      <GridLines />
      <GlowingOrbs />
      <FloatingSymbols />
      <ParticleCanvas />
    </div>
  );
}
