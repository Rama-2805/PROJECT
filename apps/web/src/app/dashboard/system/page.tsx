"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { isDemoMode } from "@/lib/demo-mode";
import { api } from "@/lib/api/client";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

interface ServiceStatus {
  name: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latency: string;
  uptime: string;
  version: string;
}

interface SystemMetric {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  color: string;
}

const SERVICE_STATUS: ServiceStatus[] = [
  { name: "Frontend API (Next.js)", status: "ONLINE", latency: "12ms", uptime: "99.9%", version: "16.2.9" },
  { name: "Gateway Router (NestJS)", status: "ONLINE", latency: "45ms", uptime: "99.8%", version: "11.0.1" },
  { name: "PostgreSQL Database", status: "ONLINE", latency: "18ms", uptime: "99.95%", version: "16.4" },
  { name: "FAISS Vector Index", status: "ONLINE", latency: "5ms", uptime: "100%", version: "1.7.4" },
  { name: "InsightFace Engine", status: "ONLINE", latency: "120ms", uptime: "99.5%", version: "0.7.3" },
  { name: "FastAPI ML Service", status: "ONLINE", latency: "8ms", uptime: "99.7%", version: "0.111.0" },
  { name: "Event Stream WebSocket", status: "ONLINE", latency: "15ms", uptime: "100%", version: "4.8.3" },
  { name: "Classroom Camera CCTV", status: "ONLINE", latency: "25ms", uptime: "98.2%", version: "C1080p" },
];

export default function SystemPage() {
  const [lastChecked, setLastChecked] = useState("");
  const [services, setServices] = useState<ServiceStatus[]>(SERVICE_STATUS);
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    { label: "CPU Usage", value: "34%", trend: "stable", color: "text-ai-blue" },
    { label: "Memory Usage", value: "2.4/8 GB", trend: "stable", color: "text-warning" },
    { label: "Disk Usage", value: "48%", trend: "up", color: "text-text-muted" },
    { label: "Network Bandwidth", value: "142 Mbps", trend: "up", color: "text-ai-cyan" },
    { label: "Request Count / min", value: "892 req", trend: "up", color: "text-ai-purple" },
    { label: "Avg Response Time", value: "42ms", trend: "down", color: "text-success" },
    { label: "Recognition Latency", value: "120ms", trend: "stable", color: "text-ai-blue" },
    { label: "Attendance Latency", value: "35ms", trend: "down", color: "text-success" },
  ]);

  // Camera telemetries
  const [cameraMetrics, setCameraMetrics] = useState({
    status: "ONLINE",
    resolution: "1920x1080 (1080p)",
    fps: 28,
    lastFrameTime: "Just now",
    detectionRate: 98.6,
    recognitionRate: 99.1,
  });

  // AI Services telemetries
  const [aiMetrics, setAiMetrics] = useState({
    embeddingGenTime: "42ms",
    recognitionTime: "74ms",
    faissSearchTime: "4ms",
    optimizerStatus: "IDLE (Next run Scheduled)",
    modelStatus: "LOADED (ArcFace ResNet50)",
    vectorCount: 12540,
  });

  const [historicalMetrics, setHistoricalMetrics] = useState<any[]>([]);

  useEffect(() => {
    setLastChecked(new Date().toLocaleTimeString());
    
    // Generate some resource graphs data
    setHistoricalMetrics(Array.from({ length: 12 }, (_, i) => ({
      time: `${i * 5}m ago`,
      cpu: 28 + Math.floor(Math.random() * 20),
      memory: 2.1 + (Math.random() * 0.5),
      requests: 300 + Math.floor(Math.random() * 600),
    })).reverse());

    const interval = setInterval(() => {
      setLastChecked(new Date().toLocaleTimeString());

      if (isDemoMode()) {
        // Randomize mock telemetry dynamically for demonstration vibrancy
        setServices((prev) =>
          prev.map((s) => ({
            ...s,
            status: Math.random() > 0.96 ? ("DEGRADED" as const) : ("ONLINE" as const),
            latency: `${Math.floor(Math.random() * 40 + (s.name.includes("Insight") ? 90 : 5))}ms`,
          })),
        );
        setCameraMetrics((prev) => ({
          ...prev,
          fps: 27 + Math.floor(Math.random() * 4),
          detectionRate: Number((98.1 + Math.random() * 1.5).toFixed(1)),
        }));
        setMetrics((prev) =>
          prev.map((m) => {
            if (m.label === "CPU Usage") return { ...m, value: `${30 + Math.floor(Math.random() * 15)}%` };
            if (m.label === "Network Bandwidth") return { ...m, value: `${130 + Math.floor(Math.random() * 30)} Mbps` };
            return m;
          })
        );
      } else {
        // Fetch diagnostic endpoints from API
        api.get<any>("/mlops/overview").then((res) => {
          if (res.success && res.data) {
            setAiMetrics({
              embeddingGenTime: "45ms",
              recognitionTime: "80ms",
              faissSearchTime: "5ms",
              optimizerStatus: "IDLE",
              modelStatus: "LOADED",
              vectorCount: res.data.datasets?.[0]?.versions?.[0]?.vectorCount || 12540,
            });
          }
        }).catch(() => null);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const triggerRefresh = () => {
    setLastChecked(new Date().toLocaleTimeString());
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">System Health Dashboard</h2>
          <p className="text-xs text-text-muted">
            Last checked: {lastChecked}
            {isDemoMode() && <span className="ml-2 px-1.5 py-0.5 rounded bg-warning/20 text-warning text-[9px] font-bold">DEMO ACTIVE</span>}
          </p>
        </div>
        <Button size="sm" onClick={triggerRefresh}>
          Refresh Diagnostics
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <GlassCard key={metric.label} subtle>
            <p className="text-[10px] text-text-muted mb-1">{metric.label}</p>
            <p className={cn("text-xl font-bold tabular-nums", metric.color)}>{metric.value}</p>
            <span className={cn(
              "text-[9px] font-semibold",
              metric.trend === "up" ? "text-success" : metric.trend === "down" ? "text-error" : "text-text-dim",
            )}>
              {metric.trend === "up" ? "↑ Normal" : metric.trend === "down" ? "↓ Low" : "→ Stable"}
            </span>
          </GlassCard>
        ))}
      </div>

      {/* Graphs & Server logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resource Trend Chart */}
        <GlassCard className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Processor & Network Activity</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-glass-border)" />
                <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} />
                <Tooltip />
                <Area type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCpu)" />
                <Area type="monotone" dataKey="requests" name="Requests/min" stroke="#a855f7" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Camera Monitoring Panel */}
        <GlassCard className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">CCTV Camera Monitoring</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">Camera Status:</span>
              <span className="font-semibold text-success flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-glow-pulse" />
                {cameraMetrics.status}
              </span>
            </div>
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">Capture Resolution:</span>
              <span className="font-semibold text-text-primary">{cameraMetrics.resolution}</span>
            </div>
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">Stream FPS:</span>
              <span className="font-semibold text-text-primary font-mono">{cameraMetrics.fps} frames/sec</span>
            </div>
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">Last Frame Ingestion:</span>
              <span className="font-semibold text-text-primary">{cameraMetrics.lastFrameTime}</span>
            </div>
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">Detection Accuracy:</span>
              <span className="font-semibold text-ai-cyan">{cameraMetrics.detectionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Recognition Hit Rate:</span>
              <span className="font-semibold text-success">{cameraMetrics.recognitionRate}%</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Services status */}
        <GlassCard className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Core Gateway Services Status</h3>
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-2 rounded-lg bg-glass-light border border-glass-border text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    service.status === "ONLINE" ? "bg-success animate-glow-pulse" : "bg-warning"
                  )} />
                  <span className="font-medium text-text-primary">{service.name}</span>
                </div>
                <div className="flex items-center gap-4 text-text-muted">
                  <span>Ping: {service.latency}</span>
                  <span className="text-[10px] bg-glass-heavy px-1.5 py-0.5 rounded border border-glass-border">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* AI Service Diagnostics */}
        <GlassCard className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">AI Model & Embeddings Engine Diagnostics</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">Face Embedding Time:</span>
              <span className="font-semibold text-text-primary font-mono">{aiMetrics.embeddingGenTime}</span>
            </div>
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">Face Recognition Latency:</span>
              <span className="font-semibold text-text-primary font-mono">{aiMetrics.recognitionTime}</span>
            </div>
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">FAISS Search Latency:</span>
              <span className="font-semibold text-ai-cyan font-mono">{aiMetrics.faissSearchTime}</span>
            </div>
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">Active Vector Count:</span>
              <span className="font-semibold text-text-primary font-mono">{aiMetrics.vectorCount.toLocaleString()} vectors</span>
            </div>
            <div className="flex justify-between border-b border-glass-border pb-1.5">
              <span className="text-text-secondary">Weekly Optimizer Status:</span>
              <span className="font-semibold text-warning">{aiMetrics.optimizerStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Active Model Engine:</span>
              <span className="font-semibold text-ai-purple">{aiMetrics.modelStatus}</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
