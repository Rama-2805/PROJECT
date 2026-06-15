"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface RoadmapItem {
  quarter: string;
  year: string;
  title: string;
  description: string;
  capabilities: string[];
  status: "completed" | "in_progress" | "planned" | "research";
  impact: "high" | "medium" | "low";
}

interface CapabilityMaturity {
  area: string;
  icon: string;
  current: number;
  target: number;
  description: string;
}

const ROADMAP: RoadmapItem[] = [
  {
    quarter: "Q1-Q2", year: "2025",
    title: "AI Foundation & Core Capabilities",
    description: "Establish the fundamental AI infrastructure and core recognition capabilities",
    capabilities: [
      "Face recognition with ArcFace (99.1% accuracy)",
      "Behavior detection (YOLOv8) — phone, sleeping, distraction",
      "Pose classification for engagement analysis",
      "MLOps pipeline: training, evaluation, deployment",
      "Edge device management with OTA updates",
    ],
    status: "completed",
    impact: "high",
  },
  {
    quarter: "Q3", year: "2025",
    title: "Personalized Learning Analytics",
    description: "Move from group-level analytics to individual student learning insights",
    capabilities: [
      "Per-student learning pattern analysis",
      "Attention span tracking across sessions",
      "Personalized engagement recommendations",
      "Early warning system for at-risk students",
      "Integration with LMS platforms (Moodle, Canvas)",
    ],
    status: "in_progress",
    impact: "high",
  },
  {
    quarter: "Q4", year: "2025",
    title: "AI Teaching Assistants",
    description: "Deploy AI-powered assistants to support educators in real-time",
    capabilities: [
      "Real-time teaching quality feedback",
      "Automated question-answering during lectures",
      "Content difficulty adaptation suggestions",
      "Multi-modal classroom understanding (audio + video)",
      "Natural language interface for educators",
    ],
    status: "planned",
    impact: "high",
  },
  {
    quarter: "Q1", year: "2026",
    title: "Student Learning Predictions",
    description: "Predictive analytics for student outcomes and learning trajectories",
    capabilities: [
      "Academic performance prediction models",
      "Dropout risk identification (8+ weeks in advance)",
      "Course recommendation engine",
      "Learning path optimization",
      "Study group formation based on complementary skills",
    ],
    status: "planned",
    impact: "high",
  },
  {
    quarter: "Q2", year: "2026",
    title: "Digital Classroom Twins",
    description: "Full 3D digital twin integration with AI-driven simulations",
    capabilities: [
      "Real-time 3D classroom reconstruction",
      "What-if scenario simulations",
      "Seating arrangement optimization for engagement",
      "Resource utilization forecasting",
      "Emergency evacuation planning",
    ],
    status: "planned",
    impact: "medium",
  },
  {
    quarter: "Q3-Q4", year: "2026",
    title: "Self-Improving AI Platform",
    description: "Continuous autonomous improvement through feedback loops",
    capabilities: [
      "Automated model retraining from teacher feedback",
      "Cross-institution federated learning",
      "Zero-shot adaptation to new classroom layouts",
      "Automated augmentation strategy search",
      "Self-healing model degradation detection",
    ],
    status: "research",
    impact: "high",
  },
  {
    quarter: "2027+", year: "Future",
    title: "Generalized Educational AI",
    description: "Towards AGI-powered personalized education at scale",
    capabilities: [
      "Multi-modal understanding (vision, audio, text, behavior)",
      "Emotional intelligence and social dynamics analysis",
      "Personalized curriculum generation",
      "Automated assessment and feedback",
      "Cross-cultural and multi-language support",
    ],
    status: "research",
    impact: "high",
  },
];

const MATURITY_LEVELS: CapabilityMaturity[] = [
  { area: "Face Recognition", icon: "👤", current: 95, target: 99, description: "ArcFace-based recognition with 99.1% accuracy" },
  { area: "Behavior Detection", icon: "🧠", current: 85, target: 97, description: "YOLOv8 behavior analysis for 6 behavior classes" },
  { area: "Pose Classification", icon: "🏃", current: 70, target: 92, description: "MobileNetV3-based posture and engagement analysis" },
  { area: "Edge Computing", icon: "💻", current: 80, target: 95, description: "On-device inference with OTA model updates" },
  { area: "Personalized Analytics", icon: "📊", current: 40, target: 90, description: "Per-student learning pattern analysis" },
  { area: "Predictive Models", icon: "🔮", current: 25, target: 85, description: "Academic outcome and dropout prediction" },
  { area: "AI Teaching Assistants", icon: "🤖", current: 15, target: 80, description: "Real-time educator support systems" },
  { area: "Self-Improving AI", icon: "🔄", current: 10, target: 75, description: "Automated retraining from feedback loops" },
];

const STATUS_BADGES: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  in_progress: "bg-ai-blue/10 text-ai-blue border-ai-blue/20",
  planned: "bg-ai-purple/10 text-ai-purple border-ai-purple/20",
  research: "bg-warning/10 text-warning border-warning/20",
};

export default function AIVisionPage() {
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filtered = activeFilter === "all" ? ROADMAP : ROADMAP.filter(r => r.status === activeFilter);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary">SmartCampus AI — Future Vision</h2>
        <p className="text-xs text-text-muted">Evolving from AI-powered application to self-improving educational intelligence platform</p>
      </div>

      {/* Hero Section */}
      <GlassCard className="mb-6 bg-gradient-to-br from-ai-blue/5 via-ai-purple/5 to-success/5 border-ai-blue/20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-text-primary mb-2">🚀 The Vision</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              SmartCampus AI is evolving from an AI-powered classroom monitoring platform into a <span className="text-ai-blue font-semibold">self-improving educational intelligence ecosystem</span>.
              By combining computer vision, natural language processing, predictive analytics, and continuous feedback loops,
              we aim to create an AI platform that not only understands classroom dynamics but actively improves
              educational outcomes for every student.
            </p>
          </div>
          <div className="shrink-0 p-4 rounded-xl glass text-center">
            <p className="text-3xl font-bold text-ai-blue">2025</p>
            <p className="text-[10px] text-text-muted">Foundation Year</p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-ai-blue to-ai-purple mx-auto my-2" />
            <p className="text-2xl font-bold text-ai-purple">2027+</p>
            <p className="text-[10px] text-text-muted">Self-Improving AI</p>
          </div>
        </div>
      </GlassCard>

      {/* Capability Maturity Model */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">📈 Capability Maturity Model</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MATURITY_LEVELS.map((m, i) => (
            <motion.div key={m.area} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="hover:border-ai-blue/20 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{m.icon}</span>
                  <span className="text-[11px] font-semibold text-text-primary">{m.area}</span>
                </div>
                <div className="mb-1">
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span className="text-text-muted">Current</span>
                    <span className="text-text-primary font-medium">{m.current}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-glass-light overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.current}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-ai-blue to-ai-purple"
                    />
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span className="text-text-muted">Target</span>
                    <span className="text-text-primary font-medium">{m.target}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-glass-light overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.target}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-ai-purple to-success opacity-40"
                    />
                  </div>
                </div>
                <p className="text-[8px] text-text-muted">{m.description}</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[8px] text-text-muted">Gap:</span>
                  <div className="flex-1 h-1 rounded-full bg-glass-light overflow-hidden">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${Math.max(0, m.target - m.current)}%` }} />
                  </div>
                  <span className="text-[8px] font-medium text-warning">+{m.target - m.current}%</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 mb-6 glass rounded-xl border border-glass-border w-fit">
        {[
          { id: "all", label: "All Milestones" },
          { id: "completed", label: "✅ Completed" },
          { id: "in_progress", label: "🔄 In Progress" },
          { id: "planned", label: "📋 Planned" },
          { id: "research", label: "🔬 Research" },
        ].map(f => (
          <button key={f.id} onClick={() => setActiveFilter(f.id)} className={cn(
            "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap",
            activeFilter === f.id ? "bg-ai-blue text-white" : "text-text-dim hover:text-text-primary",
          )}>{f.label}</button>
        ))}
      </div>

      {/* Roadmap Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-ai-blue via-ai-purple to-success opacity-30" />

        <div className="space-y-4">
          {filtered.map((item, i) => (
            <motion.div
              key={`${item.quarter}-${item.year}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative pl-14"
            >
              {/* Timeline Dot */}
              <div className={cn(
                "absolute left-4 top-5 h-4 w-4 rounded-full border-2 z-10",
                item.status === "completed" ? "bg-success border-success" :
                item.status === "in_progress" ? "bg-ai-blue border-ai-blue animate-pulse" :
                item.status === "planned" ? "bg-ai-purple border-ai-purple" :
                "bg-warning border-warning",
              )} />

              <GlassCard className={cn(
                "transition-all hover:border-ai-blue/20",
                item.impact === "high" ? "border-l-2 border-l-ai-blue/30" : "",
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                      <span className="text-[9px] font-mono text-text-muted">{item.quarter} {item.year}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                      item.impact === "high" ? "bg-ai-blue/10 text-ai-blue border-ai-blue/20" :
                      "bg-text-muted/10 text-text-muted border-glass-border",
                    )}>
                      {item.impact === "high" ? "🔴 High Impact" : item.impact === "medium" ? "🟡 Medium" : "🟢 Low"}
                    </span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", STATUS_BADGES[item.status])}>
                      {item.status === "completed" ? "✅ Done" :
                       item.status === "in_progress" ? "🔄 Active" :
                       item.status === "planned" ? "📋 Planned" : "🔬 Research"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {item.capabilities.map((cap, ci) => (
                    <div key={ci} className="flex items-center gap-1.5 p-1.5 rounded-lg glass">
                      <span className={cn(
                        "h-1 w-1 rounded-full shrink-0",
                        item.status === "completed" ? "bg-success" :
                        item.status === "in_progress" ? "bg-ai-blue" :
                        "bg-text-muted",
                      )} />
                      <span className={cn(
                        "text-[10px]",
                        item.status === "completed" ? "text-text-primary" : "text-text-secondary",
                      )}>{cap}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Future Capabilities Summary */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="bg-gradient-to-br from-ai-blue/5 to-transparent">
          <p className="text-2xl mb-1">🎯</p>
          <h4 className="text-xs font-semibold text-text-primary mb-1">Near-term (2025)</h4>
          <p className="text-[10px] text-text-secondary">Solidify core AI, launch personalized analytics, and begin teaching assistant deployment</p>
        </GlassCard>
        <GlassCard className="bg-gradient-to-br from-ai-purple/5 to-transparent">
          <p className="text-2xl mb-1">🚀</p>
          <h4 className="text-xs font-semibold text-text-primary mb-1">Mid-term (2026)</h4>
          <p className="text-[10px] text-text-secondary">Predictive models, digital twins, and autonomous self-improvement through feedback loops</p>
        </GlassCard>
        <GlassCard className="bg-gradient-to-br from-success/5 to-transparent">
          <p className="text-2xl mb-1">🌟</p>
          <h4 className="text-xs font-semibold text-text-primary mb-1">Long-term (2027+)</h4>
          <p className="text-[10px] text-text-secondary">Generalized educational AI with multi-modal understanding, emotional intelligence, and personalized curricula</p>
        </GlassCard>
      </div>
    </>
  );
}
