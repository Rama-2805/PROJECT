"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface MonitorMetric {
  label: string;
  value: string | number;
  status: "good" | "warning" | "critical";
  trend: "up" | "down" | "stable";
  unit?: string;
}

interface AIMetricCard {
  title: string;
  metrics: MonitorMetric[];
  icon: string;
  color: string;
}

const FACE_AI_METRICS: AIMetricCard = {
  title: "Face Recognition AI",
  icon: "👤",
  color: "border-ai-blue/20",
  metrics: [
    { label: "Current Accuracy", value: 99.1, status: "good", trend: "stable", unit: "%" },
    { label: "Average Latency", value: 120, status: "good", trend: "down", unit: "ms" },
    { label: "Failed Recognitions (24h)", value: 23, status: "warning", trend: "up" },
    { label: "Total Recognitions (24h)", value: 15240, status: "good", trend: "up" },
  ],
};

const BEHAVIOR_AI_METRICS: AIMetricCard = {
  title: "Behavior AI",
  icon: "🧠",
  color: "border-ai-purple/20",
  metrics: [
    { label: "Detection Rate", value: 94.5, status: "good", trend: "stable", unit: "%" },
    { label: "False Alert Rate", value: 3.2, status: "warning", trend: "down", unit: "%" },
    { label: "Events Processed (24h)", value: 8450, status: "good", trend: "up" },
    { label: "Avg Detection Time", value: 85, status: "good", trend: "down", unit: "ms" },
  ],
};

const SYSTEM_METRICS: AIMetricCard = {
  title: "AI System Health",
  icon: "⚙️",
  color: "border-success/20",
  metrics: [
    { label: "GPU Usage", value: 62, status: "good", trend: "stable", unit: "%" },
    { label: "Inference Speed", value: 28, status: "good", trend: "stable", unit: "ms/frame" },
    { label: "Model Version (Face)", value: "2.1.0", status: "good", trend: "stable" },
    { label: "Model Version (Behavior)", value: "1.3.0", status: "good", trend: "stable" },
  ],
};

const METRIC_STATUS = { good: "text-success", warning: "text-warning", critical: "text-error" };
const METRIC_BG = { good: "bg-success/10", warning: "bg-warning/10", critical: "bg-error/10" };

function MetricValue({ value, unit, status }: { value: string | number; unit?: string; status: string }) {
  return (
    <span className={cn("text-lg font-bold tabular-nums", METRIC_STATUS[status as keyof typeof METRIC_STATUS])}>
      {value}{unit && <span className="text-[10px] text-text-muted ml-0.5">{unit}</span>}
    </span>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>;
  if (trend === "down") return <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 015.306 6.506l.776 2.06m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" /></svg>;
  return <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75l4.5-4.5m0 0l4.5 4.5m-4.5-4.5v12" /></svg>;
}

// Live event types
interface LiveEvent {
  id: string;
  time: Date;
  type: string;
  message: string;
  severity: "info" | "warning" | "error";
}

function generateEvent(): LiveEvent {
  const events = [
    { type: "RECOGNITION", message: `Student CSE2026${String(Math.floor(100 + Math.random() * 50)).padStart(3, "0")} recognized`, severity: "info" as const },
    { type: "BEHAVIOR_ALERT", message: "Phone usage detected in Classroom LAB-301", severity: "warning" as const },
    { type: "DEVICE_HEARTBEAT", message: "Device JSN-003 heartbeat received — all OK", severity: "info" as const },
    { type: "LOW_ACCURACY", message: `Recognition confidence below threshold: ${(70 + Math.random() * 10).toFixed(1)}%`, severity: "warning" as const },
    { type: "FAILED_RECOGNITION", message: "Unknown face detected — no match found", severity: "warning" as const },
    { type: "MODEL_CHECK", message: "Face model v2.1.0 integrity verified", severity: "info" as const },
    { type: "PERFORMANCE_DROP", message: `Inference latency spike: ${(200 + Math.random() * 300).toFixed(0)}ms`, severity: "error" as const },
    { type: "GPU_TEMP", message: `GPU temperature normal: ${(55 + Math.random() * 10).toFixed(1)}°C`, severity: "info" as const },
  ];
  return { ...events[Math.floor(Math.random() * events.length)], id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`, time: new Date() };
}

export default function AIMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(() =>
    typeof window === "undefined" ? "" : new Date().toLocaleTimeString()
  );
  const [accuracyHistory, setAccuracyHistory] = useState<number[]>([98.2, 98.5, 98.7, 98.9, 99.0, 99.1, 99.1, 99.0, 99.1, 98.9, 99.2, 99.1]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([135, 128, 122, 118, 125, 120, 115, 110, 118, 122, 116, 120]);

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  // Simulate live events
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveEvents(prev => [generateEvent(), ...prev].slice(0, 30));
      setLastUpdated(new Date().toLocaleTimeString());
      // Simulate accuracy/latency fluctuations
      setAccuracyHistory(prev => [...prev.slice(1), +(98 + Math.random() * 2).toFixed(1)]);
      setLatencyHistory(prev => [...prev.slice(1), +(100 + Math.random() * 60).toFixed(0)]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading AI Monitoring...</span></div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="h-2 w-2 rounded-full bg-success animate-glow-pulse" />
        <span className="text-[10px] font-medium text-success uppercase tracking-wider">All AI Systems Operational</span>
        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold text-amber-300">
          Prototype Telemetry (Live MLOps Stream Pending)
        </span>
        <span className="text-[10px] text-text-muted ml-auto">Last updated: {lastUpdated || '--:--:--'}</span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[FACE_AI_METRICS, BEHAVIOR_AI_METRICS, SYSTEM_METRICS].map((card, ci) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1 }}>
            <GlassCard className={cn("border-l-2", card.color)}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{card.icon}</span>
                <h3 className="text-xs font-semibold text-text-primary">{card.title}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {card.metrics.map((m) => (
                  <div key={m.label} className={cn("p-2 rounded-lg", METRIC_BG[m.status])}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] text-text-muted">{m.label}</span>
                      <TrendIcon trend={m.trend} />
                    </div>
                    <MetricValue value={m.value} unit={m.unit} status={m.status} />
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Accuracy Trend */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-text-primary">Face Recognition Accuracy (12h)</h3>
            <span className="text-[9px] text-text-muted">Avg: {(accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length).toFixed(1)}%</span>
          </div>
          <div className="flex items-end gap-1 h-24">
            {accuracyHistory.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-ai-blue to-ai-purple transition-all duration-500"
                  style={{ height: `${((v - 97) / 3) * 100}%` }}
                />
                <span className="text-[7px] text-text-muted">{i + 1}h</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Latency Trend */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-text-primary">Inference Latency (12h)</h3>
            <span className="text-[9px] text-text-muted">Avg: {Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)}ms</span>
          </div>
          <div className="flex items-end gap-1 h-24">
            {latencyHistory.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-success to-ai-blue transition-all duration-500"
                  style={{ height: `${((160 - v) / 80) * 100}%` }}
                />
                <span className="text-[7px] text-text-muted">{i + 1}h</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Live Events Panel */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-text-primary">Live AI Events</h3>
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-glow-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[9px] text-text-muted">Auto-scroll</span>
              <input type="checkbox" checked={autoScroll} onChange={() => setAutoScroll(!autoScroll)} className="w-3 h-3 rounded border-glass-border bg-glass-light" />
            </label>
            <span className="text-[10px] text-text-muted">{liveEvents.length} events</span>
          </div>
        </div>

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {liveEvents.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-start gap-2.5 p-2 rounded-lg text-[10px]",
                event.severity === "error" ? "bg-error/5" : event.severity === "warning" ? "bg-warning/5" : "bg-glass-light",
              )}
            >
              <span className={cn(
                "h-1.5 w-1.5 rounded-full mt-0.5 shrink-0",
                event.severity === "error" ? "bg-error" : event.severity === "warning" ? "bg-warning" : "bg-ai-blue",
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[9px] px-1 py-0.5 rounded font-medium",
                    event.severity === "error" ? "bg-error/10 text-error" :
                    event.severity === "warning" ? "bg-warning/10 text-warning" :
                    "bg-ai-blue/10 text-ai-blue",
                  )}>
                    {event.type}
                  </span>
                  <span className="text-[9px] text-text-muted ml-auto">
                    {event.time.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-text-primary mt-0.5">{event.message}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </>
  );
}
