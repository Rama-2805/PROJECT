"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  getAnalyticsOverview, getDepartmentRankings, getClassroomIntelligence,
  getRiskStudents, getInsights, getAIModelPerformance, getDailyTrends,
  getWeeklyComparison,
  type AnalyticsOverview, type DepartmentRanking, type ClassroomIntelligence,
  type RiskStudent, type Insight, type AIModelPerformance, type DailyTrend,
} from "@/lib/mock/analytics";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "border-error/30 bg-error/10 text-error",
  WARNING: "border-warning/30 bg-warning/10 text-warning",
  INFO: "border-ai-blue/30 bg-ai-blue/10 text-ai-blue",
};

const SEVERITY_DOTS: Record<string, string> = {
  CRITICAL: "bg-error animate-glow-pulse",
  WARNING: "bg-warning",
  INFO: "bg-ai-blue",
};

function AnimatedCounter({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current * 10) / 10);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toFixed(decimals)}{suffix}</>;
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [departments, setDepartments] = useState<DepartmentRanking[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomIntelligence[]>([]);
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [aiModel, setAiModel] = useState<AIModelPerformance | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ week: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "insights" | "risk">("overview");
  const [acknowledgedInsights, setAcknowledgedInsights] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      getAnalyticsOverview(),
      getDepartmentRankings(),
      getClassroomIntelligence(),
      getRiskStudents(),
      getInsights(),
      getAIModelPerformance(),
      getDailyTrends(),
      getWeeklyComparison(),
    ]).then(([ov, depts, rooms, risk, ins, ai, trends, weekly]) => {
      setOverview(ov);
      setDepartments(depts);
      setClassrooms(rooms);
      setRiskStudents(risk);
      setInsights(ins);
      setAiModel(ai);
      setDailyTrends(trends);
      setWeeklyData(weekly);
    }).finally(() => setLoading(false));
  }, []);

  const handleDismissInsight = (id: string) => {
    setAcknowledgedInsights((prev) => new Set(prev).add(id));
  };

  const activeInsights = insights.filter((i) => !i.isRead && !acknowledgedInsights.has(i.id));

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  const tabs = [
    { key: "overview" as const, label: "University Overview" },
    { key: "insights" as const, label: `AI Insights (${activeInsights.length})` },
    { key: "risk" as const, label: "Risk Analysis" },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">University Intelligence Center</h2>
          <p className="text-xs text-text-muted">AI-powered analytics, insights, and decision support for your institution</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">Export Dashboard</Button>
          <Button size="sm">Generate Report</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-glass-light border border-glass-border mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[11px] font-medium transition-all",
              activeTab === tab.key
                ? "bg-ai-blue/20 text-ai-blue border border-ai-blue/20"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ──────── UNIVERSITY OVERVIEW ──────── */}
      {activeTab === "overview" && (
        <motion.div {...fadeUp} key="overview">
          {/* KPI Cards */}
          <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6" variants={stagger}>
            {overview && [
              { label: "Total Students", value: overview.totalStudents, suffix: "", color: "text-text-primary", bar: "w-full" },
              { label: "Average Attendance", value: overview.averageAttendance, suffix: "%", color: "text-success", bar: `${overview.averageAttendance}%` },
              { label: "AI Recognition Accuracy", value: overview.aiRecognitionAccuracy, suffix: "%", color: "text-ai-cyan", bar: `${overview.aiRecognitionAccuracy}%` },
              { label: "Active AI Devices", value: overview.activeDevicesPercent, suffix: "%", color: "text-ai-purple", bar: `${overview.activeDevicesPercent}%` },
            ].map((card, i) => (
              <motion.div key={card.label} variants={fadeUp}>
                <GlassCard subtle>
                  <p className="text-[10px] text-text-muted mb-1">{card.label}</p>
                  <p className={cn("text-2xl font-bold tabular-nums", card.color)}>
                    <AnimatedCounter value={card.value} suffix={card.suffix} />
                  </p>
                  <div className="mt-2 h-1 rounded-full bg-glass-light overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-1000", {
                      "bg-success": i === 1, "bg-ai-cyan": i === 2, "bg-ai-purple": i === 3, "bg-ai-blue": i === 0,
                    })} style={{ width: i === 0 ? "100%" : `${card.value}%` }} />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Second Row: present today, engagement, alerts, at risk */}
          <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6" variants={stagger}>
            {overview && [
              { label: "Present Today", value: overview.presentToday, suffix: "", sub: `${((overview.presentToday / overview.totalStudents) * 100).toFixed(1)}% of total`, color: "text-success" },
              { label: "Avg Engagement", value: overview.averageEngagement, suffix: "%", sub: "Classroom average", color: "text-ai-cyan" },
              { label: "Active Alerts", value: overview.totalAlerts, suffix: "", sub: "Requires attention", color: "text-warning" },
              { label: "Students at Risk", value: overview.studentsAtRisk, suffix: "", sub: "Below threshold", color: "text-error" },
            ].map((card) => (
              <motion.div key={card.label} variants={fadeUp}>
                <GlassCard subtle>
                  <p className="text-[10px] text-text-muted mb-1">{card.label}</p>
                  <p className={cn("text-xl font-bold tabular-nums", card.color)}>
                    <AnimatedCounter value={card.value} suffix={card.suffix} decimals={card.label === "Avg Engagement" ? 1 : 0} />
                  </p>
                  <p className="text-[9px] text-text-muted mt-1">{card.sub}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Trend */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Daily Attendance Trend</h3>
              <div className="flex items-end justify-between gap-2 h-44 pt-4">
                {dailyTrends.map((day, i) => {
                  const height = day.attendance;
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-[8px] text-text-muted">{height}%</span>
                      <div className="w-full rounded-t-sm bg-gradient-to-t from-ai-blue to-ai-purple transition-all hover:opacity-80"
                        style={{ height: `${height * 0.46}%` }} />
                      <span className={cn("text-[9px] font-medium", i >= 5 ? "text-warning" : "text-text-muted")}>{day.date}</span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Weekly Comparison */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Weekly Attendance Comparison</h3>
              <div className="flex items-end justify-between gap-1.5 h-44 pt-4">
                {weeklyData.map((w, i) => (
                  <div key={w.week} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[8px] text-text-muted">{w.rate}%</span>
                    <div className="w-full rounded-t-sm bg-gradient-to-t from-ai-cyan to-ai-blue transition-all hover:opacity-80"
                      style={{ height: `${w.rate * 0.46}%` }} />
                    <span className="text-[7px] text-text-muted">{w.week}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Department Rankings */}
          <GlassCard className="mb-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Department Performance Ranking</h3>
            <div className="space-y-2">
              {departments.map((dept, i) => (
                <motion.div
                  key={dept.name}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-glass-light/20 transition-colors"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                    i === 0 ? "bg-warning/20 text-warning" : i < 3 ? "bg-ai-blue/20 text-ai-blue" : "bg-glass-light text-text-muted",
                  )}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-primary font-medium truncate">{dept.name}</span>
                      {dept.trend === "up" && <span className="text-[9px] text-success">↑</span>}
                      {dept.trend === "down" && <span className="text-[9px] text-error">↓</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="flex-1 h-1.5 rounded-full bg-glass-light overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-ai-blue to-ai-purple" style={{ width: `${dept.performanceScore}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-text-primary">{dept.performanceScore.toFixed(0)}%</p>
                    <p className="text-[8px] text-text-muted">{dept.totalStudents} students</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Classroom Intelligence + AI Model */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Classroom Intelligence</h3>
              <div className="space-y-2">
                {classrooms.map((room) => (
                  <div key={room.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-glass-light/20 transition-colors">
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      room.deviceStatus === "OPTIMAL" ? "bg-success" : room.deviceStatus === "GOOD" ? "bg-ai-blue" : "bg-warning",
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-primary truncate">{room.name}</span>
                        <span className={cn(
                          "text-[9px] px-1 py-0.5 rounded",
                          room.engagement >= 85 ? "text-success bg-success/10" : room.engagement >= 70 ? "text-warning bg-warning/10" : "text-error bg-error/10",
                        )}>{room.engagement}%</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[9px] text-text-muted">Alerts: {room.alerts}</span>
                        <span className="text-[9px] text-text-muted">Attendance: {room.attendance}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* AI Model Performance */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">AI Model Performance</h3>
              {aiModel && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-ai-cyan">{aiModel.accuracy}%</p>
                      <p className="text-[10px] text-text-muted">Overall Accuracy</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-text-primary">{aiModel.modelName}</p>
                      <p className="text-[10px] text-ai-blue">{aiModel.version}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-glass-border">
                    <div>
                      <p className="text-[9px] text-text-muted">False Positives</p>
                      <p className="text-xs font-medium text-error">{aiModel.falsePositives}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-muted">False Negatives</p>
                      <p className="text-xs font-medium text-warning">{aiModel.falseNegatives}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-muted">Avg Recognition Time</p>
                      <p className="text-xs font-medium text-text-primary">{aiModel.latencyMs}ms</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-muted">Students Enrolled</p>
                      <p className="text-xs font-medium text-text-primary">{aiModel.studentsEnrolled.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* ──────── AI INSIGHTS ──────── */}
      {activeTab === "insights" && (
        <motion.div {...fadeUp} key="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* AI Insights Panel */}
            <GlassCard className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-text-primary mb-4">AI-Generated Intelligence</h3>
              <div className="space-y-3">
                {activeInsights.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-text-muted">All insights have been reviewed</p>
                    <p className="text-[10px] text-text-dim mt-1">New insights will appear here as they are generated</p>
                  </div>
                ) : (
                  activeInsights.map((insight) => (
                    <motion.div
                      key={insight.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className={cn("p-3 rounded-lg border", SEVERITY_COLORS[insight.severity] || "border-glass-border bg-glass-light")}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", SEVERITY_DOTS[insight.severity] || "bg-ai-blue")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn(
                              "text-[10px] font-semibold uppercase",
                              insight.severity === "CRITICAL" ? "text-error" : insight.severity === "WARNING" ? "text-warning" : "text-ai-blue",
                            )}>{insight.severity}</span>
                            <span className="text-[10px] text-text-dim">·</span>
                            <span className="text-[10px] text-text-dim">{insight.category.replace(/_/g, " ")}</span>
                            <span className="text-[10px] text-text-dim">·</span>
                            <span className="text-[10px] text-text-dim">{(insight.confidence * 100).toFixed(0)}% confidence</span>
                          </div>
                          <p className="text-sm font-medium text-text-primary">{insight.title}</p>
                          <p className="text-[11px] text-text-muted mt-0.5">{insight.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[9px] text-text-dim">
                              {new Date(insight.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <button
                              onClick={() => handleDismissInsight(insight.id)}
                              className="text-[9px] font-medium text-ai-blue hover:text-ai-cyan transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* ──────── RISK ANALYSIS ──────── */}
      {activeTab === "risk" && (
        <motion.div {...fadeUp} key="risk">
          {/* Risk Distribution */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Critical", count: riskStudents.filter((s) => s.riskLevel === "CRITICAL").length, color: "text-error bg-error/10 border-error/20" },
              { label: "High", count: riskStudents.filter((s) => s.riskLevel === "HIGH").length, color: "text-warning bg-warning/10 border-warning/20" },
              { label: "Medium", count: riskStudents.filter((s) => s.riskLevel === "MEDIUM").length, color: "text-ai-blue bg-ai-blue/10 border-ai-blue/20" },
              { label: "Low", count: riskStudents.filter((s) => s.riskLevel === "LOW").length, color: "text-success bg-success/10 border-success/20" },
            ].map((d) => (
              <GlassCard key={d.label} subtle>
                <div className={cn("text-center p-2 rounded-lg border", d.color)}>
                  <p className="text-xl font-bold">{d.count}</p>
                  <p className="text-[10px] font-medium">{d.label}</p>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Risk Student Table */}
          <GlassCard>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Student Risk Profiles</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="text-[9px] text-text-muted uppercase tracking-wider">
                    <th className="text-left pb-2 pr-3 font-semibold">Student</th>
                    <th className="text-left pb-2 pr-3 font-semibold">Department</th>
                    <th className="text-left pb-2 pr-3 font-semibold">Risk Level</th>
                    <th className="text-left pb-2 pr-3 font-semibold">Attendance</th>
                    <th className="text-left pb-2 pr-3 font-semibold">Engagement</th>
                    <th className="text-left pb-2 pr-3 font-semibold">Behavior</th>
                    <th className="text-left pb-2 font-semibold">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {riskStudents.map((s) => (
                    <tr key={s.id} className="text-xs text-text-primary hover:bg-glass-light/20 transition-colors">
                      <td className="py-2 pr-3">
                        <div>
                          <p className="text-xs font-medium">{s.name}</p>
                          <p className="text-[9px] text-text-muted">{s.studentId}</p>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-[10px] text-text-muted">{s.department}</td>
                      <td className="py-2 pr-3">
                        <span className={cn(
                          "inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium border",
                          s.riskLevel === "CRITICAL" ? "text-error bg-error/10 border-error/30" :
                          s.riskLevel === "HIGH" ? "text-warning bg-warning/10 border-warning/30" :
                          s.riskLevel === "MEDIUM" ? "text-ai-blue bg-ai-blue/10 border-ai-blue/30" :
                          "text-success bg-success/10 border-success/30",
                        )}>{s.riskLevel}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 rounded-full bg-glass-light overflow-hidden">
                            <div className={cn("h-full rounded-full", s.attendanceRisk > 70 ? "bg-error" : s.attendanceRisk > 40 ? "bg-warning" : "bg-success")}
                              style={{ width: `${s.attendanceRisk}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums text-text-muted">{s.attendanceRisk}%</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 rounded-full bg-glass-light overflow-hidden">
                            <div className={cn("h-full rounded-full", s.engagementRisk > 70 ? "bg-error" : s.engagementRisk > 40 ? "bg-warning" : "bg-success")}
                              style={{ width: `${s.engagementRisk}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums text-text-muted">{s.engagementRisk}%</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 rounded-full bg-glass-light overflow-hidden">
                            <div className={cn("h-full rounded-full", s.behaviorRisk > 70 ? "bg-error" : s.behaviorRisk > 40 ? "bg-warning" : "bg-success")}
                              style={{ width: `${s.behaviorRisk}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums text-text-muted">{s.behaviorRisk}%</span>
                        </div>
                      </td>
                      <td className="py-2">
                        <span className={cn(
                          "text-[10px] font-bold tabular-nums",
                          s.overallRisk >= 80 ? "text-error" : s.overallRisk >= 60 ? "text-warning" : s.overallRisk >= 40 ? "text-ai-blue" : "text-success",
                        )}>{s.overallRisk}/100</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </>
  );
}
