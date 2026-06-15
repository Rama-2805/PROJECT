"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { AIModelStatus } from "@/lib/mock/dashboard";
import { GlassCard } from "@/components/glass/GlassCard";

export interface AIStatusCardProps {
  models: AIModelStatus[];
}

function NeuralDot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute h-1 w-1 rounded-full bg-ai-blue/30"
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

export function AIStatusCard({ models }: AIStatusCardProps) {
  return (
    <GlassCard className="relative p-5 sm:p-6 overflow-hidden w-full h-full border-white/[0.07] bg-[#060814]/70" glowColor="rgba(59, 130, 246, 0.25)">
      {/* Cyber Grid Overlay inside card */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none opacity-30" />

      {/* Sweeping Scanner Line */}
      <motion.div
        className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent pointer-events-none z-10"
        initial={{ top: "0%" }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Neural network background */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full opacity-[0.15]" viewBox="0 0 400 200">
          {/* Main Nodes */}
          {[
            [50, 40], [120, 30], [200, 50], [280, 35], [350, 45],
            [30, 100], [100, 110], [180, 90], [260, 105], [340, 95],
            [60, 160], [140, 170], [220, 150], [300, 165], [370, 155],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="2.5" fill="#60A5FA" opacity="0.8" />
              <circle cx={x} cy={y} r="6" fill="#3B82F6" className="animate-ping" opacity="0.1" />
            </g>
          ))}
          {/* Base Connection Lines */}
          {[
            [0, 5], [0, 6], [1, 6], [1, 7], [2, 7], [2, 8], [3, 8], [3, 9], [4, 9],
            [5, 10], [5, 11], [6, 11], [7, 12], [8, 13], [9, 14], [10, 1], [11, 3], [12, 4], [13, 0], [14, 2],
          ].map(([src, dst], i) => {
            const nodes = [
              [50, 40], [120, 30], [200, 50], [280, 35], [350, 45],
              [30, 100], [100, 110], [180, 90], [260, 105], [340, 95],
              [60, 160], [140, 170], [220, 150], [300, 165], [370, 155],
            ];
            return (
              <line
                key={`line-${i}`}
                x1={nodes[src][0]}
                y1={nodes[src][1]}
                x2={nodes[dst][0]}
                y2={nodes[dst][1]}
                stroke="#3B82F6"
                strokeWidth="0.5"
                opacity="0.15"
              />
            );
          })}
          {/* Animated data packets pulsing along lines */}
          {[
            [0, 5], [0, 6], [1, 6], [1, 7], [2, 7], [2, 8], [3, 8], [3, 9], [4, 9],
            [5, 10], [5, 11], [6, 11], [7, 12], [8, 13], [9, 14], [10, 1], [11, 3], [12, 4], [13, 0], [14, 2],
          ].map(([src, dst], i) => {
            const nodes = [
              [50, 40], [120, 30], [200, 50], [280, 35], [350, 45],
              [30, 100], [100, 110], [180, 90], [260, 105], [340, 95],
              [60, 160], [140, 170], [220, 150], [300, 165], [370, 155],
            ];
            return (
              <motion.line
                key={`pulse-${i}`}
                x1={nodes[src][0]}
                y1={nodes[src][1]}
                x2={nodes[dst][0]}
                y2={nodes[dst][1]}
                stroke="#60A5FA"
                strokeWidth="1"
                strokeDasharray="6 25"
                opacity="0.5"
                animate={{ strokeDashoffset: [0, -31] }}
                transition={{
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            );
          })}
        </svg>
        {[...Array(5)].map((_, i) => (
          <NeuralDot key={i} delay={i * 0.6} />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" style={{ filter: "drop-shadow(0 0 4px #34D399)" }} />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">AI CORE ACTIVE</span>
            </motion.div>
          </div>
          <span className="text-[10px] text-gray-500 font-mono tracking-wider">v2.1.0</span>
        </div>

        {/* Model Statuses */}
        <div className="grid grid-cols-2 gap-3.5">
          {models.map((model) => (
            <div
              key={model.name}
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#090b16]/70 border border-white/[0.05] hover:bg-[#0c0e22] hover:border-blue-500/20 transition-all duration-300 shadow-sm"
            >
              <div className="min-w-0 mr-2">
                <p className="text-xs font-bold text-gray-200 truncate group-hover:text-white">{model.name}</p>
                {model.accuracy && (
                  <p className="text-[10px] text-gray-500 font-medium">{model.accuracy}% ACCURACY</p>
                )}
              </div>
              <span className={cn(
                "flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded-md border tracking-wider shrink-0",
                model.status === "online" && "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                model.status === "offline" && "text-red-400 bg-red-500/10 border-red-500/20",
                model.status === "degraded" && "text-amber-400 bg-amber-500/10 border-amber-500/20",
              )}>
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full animate-pulse",
                  model.status === "online" && "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
                  model.status === "offline" && "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]",
                  model.status === "degraded" && "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
                )} />
                {model.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
