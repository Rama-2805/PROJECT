"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// ── Types & Data ───────────────────────────────────

const SPACE_CAMPUSES = [
  { name: "Global AI University", location: "Earth", students: 25000, teachers: 500, robots: 200, self_sufficiency: 98.5, status: "nominal", icon: "🌍" },
  { name: "Luna Prime Academy", location: "Moon", students: 2500, teachers: 80, robots: 40, self_sufficiency: 82.3, status: "nominal", icon: "🌙" },
  { name: "Ares Institute", location: "Mars", students: 1800, teachers: 60, robots: 30, self_sufficiency: 74.8, status: "nominal", icon: "🔴" },
  { name: "Olympus Mons University", location: "Mars", students: 950, teachers: 35, robots: 20, self_sufficiency: 68.2, status: "nominal", icon: "⛰️" },
  { name: "Gateway Deep Space Hub", location: "Space Station", students: 400, teachers: 15, robots: 8, self_sufficiency: 72.5, status: "nominal", icon: "🛸" },
];

const AGENT_ROLES = [
  { role: "Teacher", count: 4, specializations: ["Physics", "Biology", "CS/AI", "Mathematics"], color: "cyan" },
  { role: "Mentor", count: 2, specializations: ["Career", "Research Planning"], color: "purple" },
  { role: "Research", count: 2, specializations: ["Experiments", "Literature"], color: "emerald" },
  { role: "Assessment", count: 2, specializations: ["Knowledge", "Skills"], color: "amber" },
  { role: "Well-being", count: 2, specializations: ["Mental Health", "Habits"], color: "rose" },
];

const KNOWLEDGE_SECTIONS = [
  { name: "Sciences", volumes: "50K", languages: 45 },
  { name: "Technology & Engineering", volumes: "60K", languages: 30 },
  { name: "Medical & Life Sciences", volumes: "45K", languages: 35 },
  { name: "Arts & Literature", volumes: "40K", languages: 80 },
  { name: "History & Civilization", volumes: "35K", languages: 60 },
  { name: "Space Exploration", volumes: "8K", languages: 20 },
  { name: "Indigenous Knowledge", volumes: "5K", languages: 200 },
  { name: "Indigenous Knowledge", volumes: "5K", languages: 200 },
];

const COMM_DELAYS = [
  { route: "Earth → Moon", delay: "1.3s", bandwidth: "100 Mbps" },
  { route: "Earth → Mars", delay: "3–22 min", bandwidth: "10 Mbps" },
  { route: "Moon → Mars", delay: "4–5 min", bandwidth: "5 Mbps" },
  { route: "Earth → Station", delay: "<1ms", bandwidth: "1 Gbps" },
];

const ETHICS_TENETS = [
  "Human oversight over all AI decisions",
  "Complete transparency in AI logic",
  "Universal privacy protection",
  "Equal access across all planets",
  "AI communicates limitations clearly",
];

const RESEARCH_DOMAINS = [
  { id: 1, name: "Autonomous Space University", icon: "🏛️" },
  { id: 2, name: "Universal AI Teacher", icon: "👩‍🏫" },
  { id: 3, name: "Interplanetary Knowledge Sync", icon: "🔄" },
  { id: 4, name: "AI Research Scientist", icon: "🔬" },
  { id: 5, name: "Holographic Learning", icon: "🥽" },
  { id: 6, name: "Digital Knowledge Archive", icon: "📚" },
  { id: 7, name: "Multi-Agent Education", icon: "🧠" },
  { id: 8, name: "Self-Improving Models", icon: "📈" },
  { id: 9, name: "Autonomous Space Lab", icon: "🧪" },
  { id: 10, name: "Universal Translation", icon: "🌐" },
  { id: 11, name: "Planetary Digital Twins", icon: "🪐" },
  { id: 12, name: "Space Robotics", icon: "🤖" },
  { id: 13, name: "Quantum Computing", icon: "⚛️" },
  { id: 14, name: "Ethics & Governance", icon: "⚖️" },
  { id: 15, name: "Full Simulation (₹0 Budget)", icon: "💻" },
];

// ── Component ──────────────────────────────────────

export default function UniversalEducationPage() {
  const [loading, setLoading] = useState(true);
  const [activeDomain, setActiveDomain] = useState<number | null>(null);
  const [showVision, setShowVision] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-muted">Initializing Universal Education Network...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            🌌 Universal Education Network
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Research Vision
            </span>
          </h2>
          <p className="text-xs text-text-muted">AI-powered interplanetary education spanning Earth, Moon, Mars & beyond</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowVision(!showVision)}>
          {showVision ? "📋 Close Vision" : "📜 Full Vision Document"}
        </Button>
      </div>

      {/* Vision Modal */}
      {showVision && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-6 overflow-hidden"
        >
          <GlassCard>
            <h3 className="text-sm font-semibold text-text-primary mb-3">🌌 Universal Education Network — Research Vision</h3>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              SmartCampus AI evolves from a classroom management system into an interplanetary intelligent knowledge 
              network. This speculative vision explores how AI, robotics, space technology, and education may converge 
              over the coming centuries to create a Universal Education Network supporting human civilization across 
              Earth, the Moon, Mars, and deep space settlements.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {[
                { label: "Campuses", value: "5", icon: "🏛️" },
                { label: "AI Teachers", value: "690+", icon: "👩‍🏫" },
                { label: "Total Students", value: "30,650+", icon: "🎓" },
                { label: "Knowledge Volumes", value: "295K+", icon: "📚" },
                { label: "Languages", value: "15+", icon: "🌐" },
              ].map((s, i) => (
                <div key={i} className="p-2 rounded-lg glass text-center">
                  <span className="text-sm">{s.icon}</span>
                  <p className="text-[11px] font-bold text-text-primary tabular-nums">{s.value}</p>
                  <p className="text-[8px] text-text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Planetary Campuses", value: "5", icon: "🏛️", color: "text-violet-400" },
          { label: "AI Teachers Deployed", value: "690+", icon: "👩‍🏫", color: "text-cyan-400" },
          { label: "Knowledge Volumes", value: "295K+", icon: "📚", color: "text-amber-400" },
          { label: "Research Domains", value: "15", icon: "🔬", color: "text-emerald-400" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <GlassCard subtle className="text-center">
              <span className="text-lg">{stat.icon}</span>
              <p className={cn("text-lg font-bold tabular-nums", stat.color)}>{stat.value}</p>
              <p className="text-[9px] text-text-muted">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Interplanetary Campuses */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">🏛️ Interplanetary Campus Network</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SPACE_CAMPUSES.map((campus, i) => (
            <motion.div key={campus.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{campus.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{campus.name}</p>
                      <p className="text-[9px] text-text-muted">{campus.location}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[8px] px-1.5 py-0.5 rounded-full border",
                    campus.status === "nominal" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "",
                  )}>{campus.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="p-1 rounded-lg glass text-center">
                    <p className="text-[10px] font-bold text-text-primary">{campus.students.toLocaleString()}</p>
                    <p className="text-[7px] text-text-muted">Students</p>
                  </div>
                  <div className="p-1 rounded-lg glass text-center">
                    <p className="text-[10px] font-bold text-text-primary">{campus.teachers}</p>
                    <p className="text-[7px] text-text-muted">AI Teachers</p>
                  </div>
                  <div className="p-1 rounded-lg glass text-center">
                    <p className={cn("text-[10px] font-bold", campus.self_sufficiency > 80 ? "text-emerald-400" : "text-yellow-400")}>
                      {campus.self_sufficiency}%
                    </p>
                    <p className="text-[7px] text-text-muted">Self-Sufficiency</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Communication Delays + Agents side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Communication Delays */}
        <GlassCard>
          <h3 className="text-xs font-semibold text-text-primary mb-3">🔄 Interplanetary Communication</h3>
          <div className="space-y-2">
            {COMM_DELAYS.map((link, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg glass">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", link.delay.includes("ms") ? "bg-emerald-400" : link.delay.includes("s") ? "bg-yellow-400" : "bg-red-400")} />
                  <span className="text-[10px] text-text-primary">{link.route}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-text-muted">{link.delay}</span>
                  <span className="text-[8px] text-text-muted ml-1.5">{link.bandwidth}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[9px] text-text-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Real-time
            <span className="h-2 w-2 rounded-full bg-yellow-400 ml-2" /> Seconds delay
            <span className="h-2 w-2 rounded-full bg-red-400 ml-2" /> Minutes delay
          </div>
        </GlassCard>

        {/* Multi-Agent Education System */}
        <GlassCard>
          <h3 className="text-xs font-semibold text-text-primary mb-3">🧠 Multi-Agent Education System</h3>
          <div className="space-y-2">
            {AGENT_ROLES.map((agent) => (
              <div key={agent.role} className="flex items-center justify-between p-2 rounded-lg glass">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    agent.color === "cyan" ? "bg-cyan-400" : agent.color === "purple" ? "bg-purple-400" :
                    agent.color === "emerald" ? "bg-emerald-400" : agent.color === "amber" ? "bg-amber-400" : "bg-rose-400",
                  )} />
                  <span className="text-[10px] text-text-primary font-medium">{agent.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted">{agent.count} agents</span>
                  <span className="text-[8px] text-text-muted hidden sm:inline">{agent.specializations.slice(0, 2).join(", ")}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Knowledge Archive */}
      <GlassCard className="mb-6">
        <h3 className="text-xs font-semibold text-text-primary mb-3">📚 Digital Human Knowledge Archive</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {KNOWLEDGE_SECTIONS.slice(0, 8).map((section, i) => (
            <div key={i} className="p-2 rounded-lg glass">
              <p className="text-[10px] font-medium text-text-primary">{section.name}</p>
              <p className="text-[9px] text-text-muted">
                {section.volumes} volumes • {section.languages} languages
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[9px] text-text-muted">
          Total: 295,000+ volumes across 200+ languages
        </div>
      </GlassCard>

      {/* 15 Research Domains */}
      <h3 className="text-xs font-semibold text-text-primary mb-3">🔬 All 15 Research Domains</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        {RESEARCH_DOMAINS.map((domain) => (
          <motion.div
            key={domain.id}
            whileHover={{ scale: 1.02 }}
            className={cn(
              "p-2 rounded-xl cursor-pointer transition-all border text-center",
              activeDomain === domain.id
                ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                : "glass border-glass-border text-text-muted hover:text-text-primary hover:border-violet-500/20",
            )}
            onClick={() => setActiveDomain(activeDomain === domain.id ? null : domain.id)}
          >
            <span className="text-sm">{domain.icon}</span>
            <p className="text-[9px] font-medium mt-0.5 leading-tight">{domain.name}</p>
          </motion.div>
        ))}
      </div>

      {/* Expanded Domain Details */}
      {activeDomain && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <GlassCard className="border-violet-500/20">
            <div className="flex items-start gap-3">
              <span className="text-lg">{RESEARCH_DOMAINS.find(d => d.id === activeDomain)?.icon}</span>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">{RESEARCH_DOMAINS.find(d => d.id === activeDomain)?.name}</h4>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                  {activeDomain === 1 && "AI-powered educational facilities operating with minimal human intervention across multiple planetary bodies. Includes AI teachers, robotic lab assistants, autonomous libraries, and self-maintaining infrastructure."}
                  {activeDomain === 2 && "Advanced educational AI that understands each student's knowledge level, learning speed, interests, and weaknesses to create personalized lessons, simulations, and research pathways."}
                  {activeDomain === 3 && "Distributed knowledge system handling Earth ↔ Moon ↔ Mars communication with local AI processing, cached databases, sync protocols, and conflict resolution for delays of 1.3s to 22 minutes."}
                  {activeDomain === 4 && "AI agents capable of supporting the full scientific discovery lifecycle: data analysis, hypothesis generation, experimental design, literature review, and result verification."}
                  {activeDomain === 5 && "Immersive education through AR glasses, VR environments, holographic displays, and spatial computing. Students can explore virtual human bodies, historical civilizations, and space missions."}
                  {activeDomain === 6 && "Universal archive preserving 295,000+ volumes across 10 sections in 200+ languages. Features semantic search, AI summarization, and knowledge graph relationships."}
                  {activeDomain === 7 && "12 specialized AI agents forming an educational ecosystem: 4 Teacher, 2 Mentor, 2 Research, 2 Assessment, and 2 Well-being agents collaborating through the Universal AI Brain."}
                  {activeDomain === 8 && "The system continuously improves by analyzing student outcomes, teaching effectiveness, learning patterns, and curriculum efficacy to refine all aspects of education."}
                  {activeDomain === 9 && "AI-managed research environments for zero-gravity crystal growth, radiation effects on DNA, microbial evolution, quantum dot synthesis, and bioprinting in microgravity."}
                  {activeDomain === 10 && "Real-time translation across 15 major languages with cultural context adaptation, voice conversion, idiom detection, and educational focus prioritization."}
                  {activeDomain === 11 && "Digital replicas of Earth, Moon, Mars, and space stations monitoring population, educational coverage, AI agent deployment, and real-time activity density."}
                  {activeDomain === 12 && "Robotic educational assistants including Classroom Assistant, Laboratory Technician, Exploration Rover, Maintenance Bot, and Holographic Projector units."}
                  {activeDomain === 13 && "Research into quantum computing applications for molecular simulation (100M× speedup), cryptography (1T×), AI training (1,000×), and drug discovery (100,000×)."}
                  {activeDomain === 14 && "10 foundational principles: human oversight, transparency, privacy, equal access, clear limitations, no automated punishment, cultural adaptation, audit trails, AI as augmentation, and education as a universal right."}
                  {activeDomain === 15 && "Complete local simulation running on any laptop. All 15 parts implemented without requiring interplanetary infrastructure, space hardware, or quantum computers. Zero budget required."}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Ethics */}
      <GlassCard className="mb-6">
        <h3 className="text-xs font-semibold text-text-primary mb-3">⚖️ Ethics & Human Governance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ETHICS_TENETS.map((tenet, i) => (
            <div key={i} className="flex items-start gap-1.5 p-2 rounded-lg glass">
              <span className="text-[9px] shrink-0 mt-0.5">✓</span>
              <span className="text-[9px] text-text-secondary">{tenet}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </>
  );
}
