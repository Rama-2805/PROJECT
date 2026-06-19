"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────

interface AgentData {
  id: string;
  name: string;
  description: string;
  status: "online" | "busy" | "offline";
  capabilities: string[];
  tasksCompleted: number;
  accuracy: number;
  color: string;
  icon: string;
}

interface WorkflowTask {
  id: string;
  name: string;
  schedule: string;
  agent: string;
  priority: number;
  enabled: boolean;
  lastRun: string;
}

interface Decision {
  entity: string;
  type: string;
  risk: number;
  level: string;
  recommendation: string;
}

interface Metric {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  color?: string;
}

// ── Mock Data ──────────────────────────────────────

const AGENTS: AgentData[] = [
  {
    id: "agent-student", name: "Student AI Copilot",
    description: "Attendance tracking, academic queries, learning analytics",
    status: "online", capabilities: ["attendance_intelligence", "academic_assistance", "learning_analytics"],
    tasksCompleted: 142, accuracy: 93, color: "cyan", icon: "🎓",
  },
  {
    id: "agent-teacher", name: "Teacher AI Copilot",
    description: "Pre-class prep, live monitoring, post-class reports",
    status: "online", capabilities: ["pre_class_analysis", "live_monitoring", "engagement_analytics"],
    tasksCompleted: 98, accuracy: 91, color: "purple", icon: "👨‍🏫",
  },
  {
    id: "agent-admin", name: "Admin AI Governor",
    description: "Resource optimization, predictions, executive reports",
    status: "online", capabilities: ["resource_optimization", "predictive_analytics", "executive_reporting"],
    tasksCompleted: 67, accuracy: 89, color: "amber", icon: "🏛️",
  },
  {
    id: "agent-device", name: "Device AI Engineer",
    description: "IoT monitoring, failure prediction, firmware management",
    status: "busy", capabilities: ["device_health", "failure_prediction", "maintenance_scheduling"],
    tasksCompleted: 203, accuracy: 94, color: "emerald", icon: "🔧",
  },
];

const WORKFLOWS: WorkflowTask[] = [
  { id: "wf-001", name: "Daily Attendance Risk Report", schedule: "daily", agent: "Student AI", priority: 1, enabled: true, lastRun: "6:00 AM today" },
  { id: "wf-002", name: "Device Health Check", schedule: "daily", agent: "Device AI", priority: 2, enabled: true, lastRun: "6:00 AM today" },
  { id: "wf-003", name: "Morning Classroom Briefing", schedule: "daily", agent: "Teacher AI", priority: 3, enabled: true, lastRun: "7:30 AM today" },
  { id: "wf-004", name: "Weekly Department Performance", schedule: "weekly", agent: "Admin AI", priority: 1, enabled: true, lastRun: "Monday 8:00 AM" },
  { id: "wf-005", name: "Device Failure Prediction", schedule: "daily", agent: "Device AI", priority: 3, enabled: true, lastRun: "6:00 AM today" },
  { id: "wf-006", name: "Monthly Intelligence Report", schedule: "monthly", agent: "Admin AI", priority: 1, enabled: true, lastRun: "Jun 1, 2025" },
  { id: "wf-007", name: "Student Engagement Analysis", schedule: "weekly", agent: "Student AI", priority: 2, enabled: false, lastRun: "—" },
];

const DECISIONS: Decision[] = [
  { entity: "Rahul Verma (STU003)", type: "student", risk: 82, level: "high", recommendation: "Schedule counselor meeting immediately" },
  { entity: "Rohit Kumar (STU007)", type: "student", risk: 91, level: "critical", recommendation: "URGENT: Schedule 1-on-1 mentoring" },
  { entity: "JSN-003 (Edge AI LAB-302)", type: "device", risk: 78, level: "high", recommendation: "Schedule maintenance within 48 hours" },
  { entity: "CAM-201 (Camera ECE-201)", type: "device", risk: 65, level: "medium", recommendation: "Monitor device closely this week" },
  { entity: "CSE Block", type: "classroom", risk: 72, level: "high", recommendation: "Redistribute classes to balance load" },
];

const SYSTEM_METRICS: Metric[] = [
  { label: "AI Accuracy", value: "92%", trend: "up" },
  { label: "Avg Response Time", value: "187ms", trend: "down", color: "text-success" },
  { label: "Hallucination Rate", value: "2.3%", trend: "down", color: "text-success" },
  { label: "User Satisfaction", value: "87%", trend: "up", color: "text-ai-blue" },
  { label: "Decisions Today", value: "47", trend: "up" },
  { label: "Agents Online", value: "4/4", trend: "stable", color: "text-success" },
];

const STATUS_COLORS: Record<string, string> = {
  online: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
  busy: "bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.5)]",
  offline: "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
};

const AGENT_ACCENT_COLORS: Record<string, string> = {
  cyan: "from-cyan-500 to-cyan-600",
  purple: "from-purple-500 to-purple-600",
  amber: "from-amber-500 to-amber-600",
  emerald: "from-emerald-500 to-emerald-600",
};

// ── Component ──────────────────────────────────────

export default function AIBrainPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"agents" | "workflows" | "decisions" | "evaluation">("agents");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    setTimeout(() => setLoading(false), 400);
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-muted">Initializing AI Campus Brain...</span>
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
            🧠 AI Campus Brain
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v3.0.0
            </span>
          </h2>
          <p className="text-xs text-text-muted">Autonomous AI agent network orchestrating campus operations</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowChat(!showChat)}>
            💬 AI Chat
          </Button>
          <Button size="sm">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Sync Agents
          </Button>
        </div>
      </div>

      {/* System Metrics Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {SYSTEM_METRICS.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard subtle className="text-center">
              <p className="text-[9px] text-text-muted mb-0.5">{m.label}</p>
              <p className={cn("text-sm font-bold tabular-nums", m.color || "text-text-primary")}>{m.value}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 mb-6 glass rounded-xl border border-glass-border w-fit">
        {[
          { id: "agents" as const, label: "🤖 Agents", count: AGENTS.length },
          { id: "workflows" as const, label: "⚡ Workflows", count: WORKFLOWS.filter(w => w.enabled).length },
          { id: "decisions" as const, label: "🎯 Decisions", count: DECISIONS.length },
          { id: "evaluation" as const, label: "📊 Evaluation" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5",
              activeTab === tab.id ? "bg-ai-blue text-black font-semibold" : "text-text-dim hover:text-text-primary",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn("text-[9px] px-1 rounded-full", activeTab === tab.id ? "bg-white/20" : "bg-slate-800")}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* AI Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">💬</span>
                <span className="text-xs font-semibold text-text-primary">Talk to the AI Brain</span>
                <span className="text-[9px] text-text-muted">Ask anything about campus operations</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setChatInput("")}
                  className="flex-1 px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-ai-blue/50"
                  placeholder="e.g., Show classrooms with low attendance..."
                />
                <Button size="sm" onClick={() => setChatInput("")}>Send</Button>
              </div>
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {["Which students need attention?", "Device health overview?", "Generate daily report"].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setChatInput(s)}
                    className="text-[9px] px-2 py-1 rounded-lg glass border border-glass-border text-text-muted hover:text-text-primary hover:border-ai-blue/30 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab: Agents ────────────────────────── */}
      {activeTab === "agents" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard
                className={cn(
                  "cursor-pointer transition-all duration-300",
                  selectedAgent === agent.id
                    ? "border-ai-blue/40 ring-1 ring-ai-blue/20"
                    : "hover:border-ai-blue/20",
                )}
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br",
                      AGENT_ACCENT_COLORS[agent.color],
                    )}>
                      {agent.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{agent.name}</h3>
                      <p className="text-[9px] text-text-muted">{agent.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_COLORS[agent.status])} />
                    <span className="text-[9px] font-medium text-text-muted capitalize">{agent.status}</span>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {agent.capabilities.map((cap) => (
                    <span key={cap} className="text-[8px] px-1.5 py-0.5 rounded-full glass border border-glass-border text-text-muted">
                      {cap.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-lg glass text-center">
                    <p className="text-xs font-bold text-text-primary tabular-nums">{agent.tasksCompleted}</p>
                    <p className="text-[8px] text-text-muted">Tasks Completed</p>
                  </div>
                  <div className="p-2 rounded-lg glass text-center">
                    <p className="text-xs font-bold text-success tabular-nums">{agent.accuracy}%</p>
                    <p className="text-[8px] text-text-muted">Accuracy</p>
                  </div>
                </div>

                {/* Expanded: Recent Actions */}
                <AnimatePresence>
                  {selectedAgent === agent.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3 pt-3 border-t border-glass-border"
                    >
                      <p className="text-[9px] font-medium text-text-muted mb-2 uppercase tracking-wider">Recent Actions</p>
                      <div className="space-y-1.5">
                        {["Processed student attendance query", "Generated learning recommendation", "Updated engagement profile"].map((action, ai) => (
                          <div key={ai} className="flex items-center gap-2 text-[10px]">
                            <span className="h-1 w-1 rounded-full bg-ai-blue shrink-0" />
                            <span className="text-text-muted">{action}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="text-[9px] px-2 py-1 rounded-lg bg-ai-blue/10 text-ai-blue hover:bg-ai-blue/20 transition-all">
                          View Details
                        </button>
                        <button className="text-[9px] px-2 py-1 rounded-lg glass border border-glass-border text-text-muted hover:text-text-primary transition-all">
                          Configure
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tab: Workflows ──────────────────────── */}
      {activeTab === "workflows" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] text-text-muted mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Running: {WORKFLOWS.filter(w => w.enabled).length}
            <span className="h-2 w-2 rounded-full bg-slate-600 ml-2" /> Disabled: {WORKFLOWS.filter(w => !w.enabled).length}
          </div>
          {WORKFLOWS.map((wf, i) => (
            <motion.div key={wf.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    wf.enabled ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" : "bg-slate-600",
                  )} />
                  <div>
                    <p className="text-xs font-medium text-text-primary">{wf.name}</p>
                    <div className="flex items-center gap-2 text-[9px] text-text-muted">
                      <span>{wf.agent}</span>
                      <span>•</span>
                      <span className="capitalize">{wf.schedule}</span>
                      <span>•</span>
                      <span>P{wf.priority}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-text-muted">{wf.lastRun}</span>
                  <button className={cn(
                    "text-[9px] px-2 py-1 rounded-lg border transition-all",
                    wf.enabled
                      ? "bg-success/10 text-success border-success/20 hover:bg-success/20"
                      : "bg-slate-800/50 text-text-muted border-glass-border",
                  )}>
                    {wf.enabled ? "Active" : "Paused"}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tab: Decisions ──────────────────────── */}
      {activeTab === "decisions" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <GlassCard subtle>
              <p className="text-[9px] text-text-muted">High Risk</p>
              <p className="text-lg font-bold text-red-400">{DECISIONS.filter(d => d.level === "high" || d.level === "critical").length}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[9px] text-text-muted">Medium Risk</p>
              <p className="text-lg font-bold text-yellow-400">{DECISIONS.filter(d => d.level === "medium").length}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[9px] text-text-muted">Students at Risk</p>
              <p className="text-lg font-bold text-ai-blue">{DECISIONS.filter(d => d.type === "student").length}</p>
            </GlassCard>
          </div>

          {DECISIONS.map((dec, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "mt-0.5 text-sm",
                    dec.level === "critical" ? "text-red-400" : dec.level === "high" ? "text-orange-400" : "text-yellow-400",
                  )}>
                    {dec.level === "critical" ? "🔴" : dec.level === "high" ? "🟠" : "🟡"}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-text-primary">{dec.entity}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Risk Score: <span className={cn(
                        "font-bold",
                        dec.risk >= 85 ? "text-red-400" : dec.risk >= 65 ? "text-orange-400" : "text-yellow-400",
                      )}>{dec.risk}%</span> — {dec.recommendation}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "text-[9px] px-2 py-0.5 rounded-full border shrink-0 ml-2",
                  dec.level === "critical" ? "bg-red-500/10 text-red-300 border-red-500/20" :
                  dec.level === "high" ? "bg-orange-500/10 text-orange-300 border-orange-500/20" :
                  "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
                )}>
                  {dec.level.toUpperCase()}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tab: Evaluation ─────────────────────── */}
      {activeTab === "evaluation" && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {AGENTS.map((agent, i) => {
              const pct = agent.accuracy;
              return (
                <motion.div key={agent.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.icon}</span>
                        <span className="text-xs font-semibold text-text-primary">{agent.name}</span>
                      </div>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                        pct >= 90 ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
                        pct >= 80 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20" :
                        "bg-red-500/10 text-red-300 border-red-500/20",
                      )}>
                        {pct}% Score
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={cn("h-full rounded-full", `bg-gradient-to-r ${AGENT_ACCENT_COLORS[agent.color]}`)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-text-primary">{agent.tasksCompleted}</p>
                        <p className="text-[7px] text-text-muted">Tasks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-text-primary">187ms</p>
                        <p className="text-[7px] text-text-muted">Latency</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-success">✓ 2.3%</p>
                        <p className="text-[7px] text-text-muted">Hallucination</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {/* System Health */}
          <GlassCard>
            <h3 className="text-xs font-semibold text-text-primary mb-3">🩺 System Health</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Overall Score", value: "91%", status: "passing" },
                { label: "Avg User Satisfaction", value: "87%", status: "passing" },
                { label: "Response Latency", value: "187ms", status: "passing" },
                { label: "Failing Metrics", value: "0", status: "passing" },
              ].map((item, i) => (
                <div key={i} className="p-2 rounded-lg glass text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[9px] text-emerald-400">{item.status}</span>
                  </div>
                  <p className="text-sm font-bold text-text-primary">{item.value}</p>
                  <p className="text-[8px] text-text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );
}
