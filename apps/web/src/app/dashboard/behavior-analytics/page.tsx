"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getBehaviorAnalytics, type BehaviorAnalytics, type BehaviorAlert } from "@/lib/mock/behavior";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const BEHAVIOR_COLORS: Record<string, string> = {
  ATTENTIVE: "#10B981",
  SLEEPING: "#6366F1",
  PHONE_USAGE: "#EF4444",
  DISTRACTED: "#F59E0B",
  ABSENT_FROM_SEAT: "#F97316",
  UNKNOWN: "#6B7280",
};

const SEVERITY_COLORS: Record<string, string> = {
  INFO: "text-ai-blue border-ai-blue/30 bg-ai-blue/10",
  WARNING: "text-warning border-warning/30 bg-warning/10",
  CRITICAL: "text-error border-error/30 bg-error/10",
};

function AlertCard({ alert, onAcknowledge }: { alert: BehaviorAlert; onAcknowledge: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all",
        alert.status === "ACKNOWLEDGED" ? "opacity-50 border-glass-border bg-glass-light/30" : "border-glass-border bg-glass-light/50",
      )}
    >
      {/* Severity indicator */}
      <span className={cn("mt-0.5 h-2 w-2 rounded-full shrink-0", {
        "bg-ai-blue": alert.severity === "INFO",
        "bg-warning": alert.severity === "WARNING",
        "bg-error animate-glow-pulse": alert.severity === "CRITICAL",
      })} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("text-[10px] font-semibold uppercase", {
            "text-ai-blue": alert.severity === "INFO",
            "text-warning": alert.severity === "WARNING",
            "text-error": alert.severity === "CRITICAL",
          })}>
            {alert.severity}
          </span>
          <span className="text-[10px] text-text-muted">·</span>
          <span className="text-[10px] text-text-muted">{alert.behaviorType.replace(/_/g, " ")}</span>
        </div>
        <p className="text-xs text-text-primary font-medium truncate">{alert.studentName}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-text-muted">Confidence: {(alert.confidence * 100).toFixed(0)}%</span>
          <span className="text-[9px] text-text-muted">·</span>
          <span className="text-[9px] text-text-muted">{new Date(alert.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
      {alert.status === "ACTIVE" && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="text-[9px] font-medium text-ai-blue hover:text-ai-cyan transition-colors shrink-0 mt-1"
        >
          Acknowledge
        </button>
      )}
    </motion.div>
  );
}

export default function BehaviorAnalyticsPage() {
  const [data, setData] = useState<BehaviorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"overview" | "analytics" | "alerts">("overview");
  const [alerts, setAlerts] = useState<BehaviorAlert[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getBehaviorAnalytics().then((d) => {
      setData(d);
      setAlerts(d.recentAlerts);
    }).finally(() => setLoading(false));
  }, []);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "ACKNOWLEDGED" as const } : a))
    );
    setAcknowledgedIds((prev) => new Set(prev).add(id));
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!data) return null;

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "analytics" as const, label: "Analytics" },
    { key: "alerts" as const, label: `Alerts (${alerts.filter((a) => a.status === "ACTIVE").length})` },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Classroom Intelligence</h2>
          <p className="text-xs text-text-muted">Real-time behavioral analysis and engagement monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">Export Report</Button>
          <Button size="sm">Configure Analytics</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-glass-light border border-glass-border mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[11px] font-medium transition-all",
              selectedTab === tab.key
                ? "bg-ai-blue/20 text-ai-blue border border-ai-blue/20"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ──────── OVERVIEW TAB ──────── */}
      {selectedTab === "overview" && (
        <motion.div {...fadeUp} key="overview">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Average Engagement</p>
              <p className="text-2xl font-bold text-ai-cyan">{data.overview.averageEngagement}%</p>
              <div className="mt-2 h-1 rounded-full bg-glass-light overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-ai-cyan to-ai-blue" style={{ width: `${data.overview.averageEngagement}%` }} />
              </div>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Phone Events Today</p>
              <p className="text-2xl font-bold text-error">{data.overview.phoneEvents}</p>
              <p className="text-[9px] text-text-muted mt-1">Requires attention</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Attention Level</p>
              <p className="text-2xl font-bold text-success">{data.overview.attentionLevel}%</p>
              <div className="mt-2 h-1 rounded-full bg-glass-light overflow-hidden">
                <div className="h-full rounded-full bg-success" style={{ width: `${data.overview.attentionLevel}%` }} />
              </div>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">High-Risk Students</p>
              <p className="text-2xl font-bold text-warning">{data.overview.highRiskStudents}</p>
              <p className="text-[9px] text-text-muted mt-1">Engagement below 50%</p>
            </GlassCard>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Engagement Trend */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Engagement Trend (Today)</h3>
              <div className="overflow-x-auto">
                <div className="flex items-end justify-between gap-1 h-48 pt-4 min-w-[400px]">
                  {data.engagementTrend.map((point, i) => (
                    <div key={point.time} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-[8px] text-text-muted">{point.score}%</span>
                      <div
                        className="w-full rounded-t-sm bg-gradient-to-t from-ai-cyan to-ai-blue transition-all hover:opacity-80"
                        style={{ height: `${point.score * 0.48}%` }}
                      />
                      {i % 2 === 0 && <span className="text-[7px] text-text-muted whitespace-nowrap">{point.time}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* Behavior Distribution */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Behavior Distribution</h3>
              <div className="space-y-3">
                {data.behaviorDistribution.map((b) => {
                  const total = data.behaviorDistribution.reduce((s, d) => s + d.count, 0);
                  const pct = Math.round((b.count / total) * 100);
                  return (
                    <div key={b.type} className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: BEHAVIOR_COLORS[b.type] || "#6B7280" }} />
                      <span className="text-[10px] text-text-muted w-24 truncate">{b.type.replace(/_/g, " ")}</span>
                      <div className="flex-1 h-2 rounded-full bg-glass-light overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: BEHAVIOR_COLORS[b.type] || "#6B7280" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-text-primary tabular-nums w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Student Ranking */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Student Engagement Ranking</h3>
              <div className="space-y-1.5">
                {data.studentRanking.map((s, i) => (
                  <motion.div
                    key={s.studentId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-glass-light/30 transition-colors"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                      i === 0 ? "bg-warning/20 text-warning" :
                      i < 3 ? "bg-ai-blue/20 text-ai-blue" :
                      "bg-glass-light text-text-muted"
                    )}>
                      {i + 1}
                    </span>
                    <span className="text-xs text-text-primary flex-1 truncate">{s.studentName}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-glass-light overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", s.score >= 75 ? "bg-success" : s.score >= 50 ? "bg-warning" : "bg-error")}
                          style={{ width: `${s.score}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium tabular-nums w-8 text-right",
                        s.score >= 75 ? "text-success" : s.score >= 50 ? "text-warning" : "text-error"
                      )}>
                        {s.score}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Recent Alerts */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">Active Alerts</h3>
                <button
                  onClick={() => setSelectedTab("alerts")}
                  className="text-[10px] text-ai-blue hover:text-ai-cyan transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {alerts.filter((a) => a.status === "ACTIVE").slice(0, 5).map((alert) => (
                    <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
                  ))}
                </AnimatePresence>
                {alerts.filter((a) => a.status === "ACTIVE").length === 0 && (
                  <p className="text-xs text-text-muted text-center py-6">No active alerts</p>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Live Behavior Timeline */}
          <GlassCard>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Behavior Events</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="text-[9px] text-text-muted uppercase tracking-wider">
                    <th className="text-left pb-2 pr-4">Student</th>
                    <th className="text-left pb-2 pr-4">Behavior</th>
                    <th className="text-left pb-2 pr-4">Confidence</th>
                    <th className="text-left pb-2 pr-4">Duration</th>
                    <th className="text-left pb-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {data.topEvents.slice(0, 8).map((event) => (
                    <tr key={event.id} className="text-xs text-text-primary hover:bg-glass-light/20 transition-colors">
                      <td className="py-2 pr-4">{event.studentName}</td>
                      <td className="py-2 pr-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium",
                          "border",
                          event.behaviorType === "ATTENTIVE" ? "text-success border-success/30 bg-success/10" :
                          event.behaviorType === "PHONE_USAGE" ? "text-error border-error/30 bg-error/10" :
                          event.behaviorType === "SLEEPING" ? "text-indigo-400 border-indigo-400/30 bg-indigo-400/10" :
                          event.behaviorType === "DISTRACTED" ? "text-warning border-warning/30 bg-warning/10" :
                          "text-text-muted border-glass-border bg-glass-light"
                        )}>
                          <span className={cn("h-1 w-1 rounded-full", {
                            "bg-success": event.behaviorType === "ATTENTIVE",
                            "bg-error": event.behaviorType === "PHONE_USAGE",
                            "bg-indigo-400": event.behaviorType === "SLEEPING",
                            "bg-warning": event.behaviorType === "DISTRACTED",
                          })} />
                          {event.behaviorType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{(event.confidence * 100).toFixed(0)}%</td>
                      <td className="py-2 pr-4 text-text-muted">{Math.floor(event.duration / 60)}m {event.duration % 60}s</td>
                      <td className="py-2 text-text-muted">{new Date(event.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ──────── ANALYTICS TAB ──────── */}
      {selectedTab === "analytics" && (
        <motion.div {...fadeUp} key="analytics">
          {/* Classroom Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Classroom Engagement Comparison</h3>
              <div className="space-y-3">
                {data.classroomComparison.map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-[10px] text-text-muted w-24 truncate">{c.name}</span>
                    <div className="flex-1 h-3 rounded-full bg-glass-light overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-ai-purple to-ai-cyan transition-all"
                        style={{ width: `${c.engagement}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium tabular-nums w-8 text-right",
                      c.engagement >= 80 ? "text-success" : c.engagement >= 60 ? "text-warning" : "text-error"
                    )}>
                      {c.engagement}%
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Engagement Trend Full */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Attention Heatmap</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="text-[9px] text-text-muted uppercase tracking-wider">
                      <th className="text-left pb-2 pr-3">Period</th>
                      <th className="text-center pb-2 pr-2">Mon</th>
                      <th className="text-center pb-2 pr-2">Tue</th>
                      <th className="text-center pb-2 pr-2">Wed</th>
                      <th className="text-center pb-2 pr-2">Thu</th>
                      <th className="text-center pb-2">Fri</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {data.attentionHeatmap.map((row) => (
                      <tr key={row.period} className="text-[10px]">
                        <td className="py-2 pr-3 text-text-muted">{row.period}</td>
                        {["monday", "tuesday", "wednesday", "thursday", "friday"].map((day) => {
                          const val = row[day as keyof typeof row] as number;
                          return (
                            <td key={day} className="py-2 pr-2 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center w-7 h-7 rounded text-[9px] font-medium",
                                  val >= 85 ? "bg-success/20 text-success" :
                                  val >= 70 ? "bg-warning/20 text-warning" :
                                  val >= 55 ? "bg-orange-400/20 text-orange-400" :
                                  "bg-error/20 text-error"
                                )}
                              >
                                {val}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          {/* Full Behavior Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Behavior Breakdown</h3>
              <div className="space-y-4">
                {data.behaviorDistribution.map((b) => {
                  const total = data.behaviorDistribution.reduce((s, d) => s + d.count, 0);
                  const pct = Math.round((b.count / total) * 100);
                  return (
                    <div key={b.type}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BEHAVIOR_COLORS[b.type] || "#6B7280" }} />
                          <span className="text-xs text-text-primary">{b.type.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-text-muted">{b.count} events</span>
                          <span className="text-[10px] font-medium text-text-primary tabular-nums w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-glass-light overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: BEHAVIOR_COLORS[b.type] || "#6B7280" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Student Engagement Distribution */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Engagement Distribution</h3>
              <div className="relative h-48 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-44 h-44 transform -rotate-90">
                  {(() => {
                    const segs = [
                      { label: "High (≥75)", value: data.studentRanking.filter((s) => s.score >= 75).length, color: "#10B981" },
                      { label: "Medium (50-74)", value: data.studentRanking.filter((s) => s.score >= 50 && s.score < 75).length, color: "#F59E0B" },
                      { label: "Low (<50)", value: data.studentRanking.filter((s) => s.score < 50).length, color: "#EF4444" },
                    ];
                    const total = segs.reduce((s, d) => s + d.value, 0) || 1;
                    const circumference = 2 * Math.PI * 38;
                    let cumulativePct = 0;
                    return segs.map((seg) => {
                      const pct = seg.value / total;
                      const offset = circumference - pct * circumference;
                      const dashOffset = cumulativePct * circumference;
                      cumulativePct += pct;
                      return (
                        <circle
                          key={seg.label}
                          cx="50" cy="50" r="38"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="12"
                          strokeDasharray={`${pct * circumference} ${circumference}`}
                          strokeDashoffset={dashOffset}
                          className="transition-all duration-700"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary">{data.overview.averageEngagement}%</p>
                    <p className="text-[9px] text-text-muted">Avg Engagement</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {[
                  { label: "High", color: "#10B981" },
                  { label: "Medium", color: "#F59E0B" },
                  { label: "Low", color: "#EF4444" },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] text-text-muted">{d.label}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* ──────── ALERTS TAB ──────── */}
      {selectedTab === "alerts" && (
        <motion.div {...fadeUp} key="alerts">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">All Behavior Alerts</h3>
              <Button size="sm" variant="secondary" onClick={() => setAlerts(alerts.map((a) => ({ ...a, status: "ACKNOWLEDGED" as const })))}>
                Acknowledge All
              </Button>
            </div>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
                ))}
              </AnimatePresence>
              {alerts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-text-muted">No alerts to display</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </>
  );
}
