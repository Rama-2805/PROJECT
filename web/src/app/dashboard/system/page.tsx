"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { useDemoMode } from "@/lib/demo-mode";

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
  { name: "Frontend (Next.js)", status: "ONLINE", latency: "12ms", uptime: "99.9%", version: "16.2.9" },
  { name: "Backend API (NestJS)", status: "ONLINE", latency: "45ms", uptime: "99.8%", version: "11.0.1" },
  { name: "PostgreSQL Database", status: "ONLINE", latency: "18ms", uptime: "99.95%", version: "16.4" },
  { name: "Redis Cache", status: "ONLINE", latency: "3ms", uptime: "100%", version: "7.2" },
  { name: "AI Engine (Python)", status: "ONLINE", latency: "120ms", uptime: "99.5%", version: "1.0.0" },
  { name: "MQTT Broker", status: "ONLINE", latency: "8ms", uptime: "99.7%", version: "2.0.18" },
  { name: "Edge Simulator", status: "ONLINE", latency: "25ms", uptime: "98.2%", version: "1.0.0" },
  { name: "Object Storage (MinIO)", status: "ONLINE", latency: "15ms", uptime: "100%", version: "2024" },
];

const SYSTEM_METRICS: SystemMetric[] = [
  { label: "Active Users", value: "1,247", trend: "up", color: "text-success" },
  { label: "Active Sessions", value: "38", trend: "stable", color: "text-ai-cyan" },
  { label: "Events/min", value: "892", trend: "up", color: "text-ai-purple" },
  { label: "Avg Response", value: "42ms", trend: "down", color: "text-success" },
  { label: "CPU Usage", value: "34%", trend: "stable", color: "text-ai-blue" },
  { label: "Memory", value: "2.4/8 GB", trend: "stable", color: "text-warning" },
  { label: "Database Size", value: "1.2 GB", trend: "up", color: "text-text-muted" },
  { label: "Error Rate", value: "0.02%", trend: "down", color: "text-success" },
];

export default function SystemPage() {
  const { isDemoMode, events } = useDemoMode();
  const [lastChecked, setLastChecked] = useState('');
  const [services, setServices] = useState(SERVICE_STATUS);

  useEffect(() => {
    setLastChecked(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setLastChecked(new Date().toLocaleTimeString());
      // Simulate status check in demo mode
      if (isDemoMode) {
        setServices((prev) =>
          prev.map((s) => ({
            ...s,
            status: Math.random() > 0.92 ? ("DEGRADED" as const) : ("ONLINE" as const),
            latency: `${Math.floor(Math.random() * 80 + 2)}ms`,
          })),
        );
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isDemoMode]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">System Health Dashboard</h2>
          <p className="text-xs text-text-muted">
            Last checked: {lastChecked}
            {isDemoMode && <span className="ml-2 px-1.5 py-0.5 rounded bg-warning/20 text-warning text-[9px] font-medium">DEMO MODE</span>}
          </p>
        </div>
        <Button size="sm" onClick={() => setLastChecked(new Date().toLocaleTimeString())}>
          Refresh Status
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {SYSTEM_METRICS.map((metric) => (
          <GlassCard key={metric.label} subtle>
            <p className="text-[10px] text-text-muted mb-1">{metric.label}</p>
            <p className={cn("text-lg font-bold tabular-nums", metric.color)}>{metric.value}</p>
            <span className={cn(
              "text-[9px]",
              metric.trend === "up" ? "text-success" : metric.trend === "down" ? "text-error" : "text-text-dim",
            )}>
              {metric.trend === "up" ? "↑ Increasing" : metric.trend === "down" ? "↓ Decreasing" : "→ Stable"}
            </span>
          </GlassCard>
        ))}
      </div>

      {/* Service Status */}
      <GlassCard className="mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Service Status</h3>
        <div className="space-y-1">
          {services.map((service) => (
            <motion.div
              key={service.name}
              className="flex items-center gap-4 p-2.5 rounded-lg hover:bg-glass-light/20 transition-colors"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-2 min-w-[200px]">
                <span className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  service.status === "ONLINE" ? "bg-success" :
                  service.status === "DEGRADED" ? "bg-warning" : "bg-error",
                  service.status === "ONLINE" && "animate-glow-pulse",
                )} />
                <span className="text-xs text-text-primary font-medium">{service.name}</span>
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                service.status === "ONLINE" ? "text-success border-success/30 bg-success/10" :
                service.status === "DEGRADED" ? "text-warning border-warning/30 bg-warning/10" :
                "text-error border-error/30 bg-error/10",
              )}>
                {service.status}
              </span>
              <div className="flex-1" />
              <span className="text-[10px] text-text-muted w-16 text-right">{service.latency}</span>
              <span className="text-[10px] text-text-muted w-14 text-right">{service.uptime}</span>
              <span className="text-[10px] text-text-dim w-16 text-right">{service.version}</span>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Architecture Diagram */}
      <GlassCard>
        <h3 className="text-sm font-semibold text-text-primary mb-4">System Architecture</h3>
        <div className="flex flex-col items-center py-4">
          <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
            {/* User */}
            <div className="px-4 py-2 rounded-lg bg-ai-blue/10 border border-ai-blue/30 text-xs font-medium text-ai-blue">Users</div>
            <svg className="w-4 h-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            {/* Load Balancer */}
            <div className="px-4 py-2 rounded-lg bg-ai-purple/10 border border-ai-purple/30 text-xs font-medium text-ai-purple">Load Balancer</div>
            <svg className="w-4 h-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            {/* Split */}
            <div className="flex gap-4 w-full justify-center">
              <div className="px-3 py-1.5 rounded-lg bg-ai-cyan/10 border border-ai-cyan/30 text-[10px] font-medium text-ai-cyan">Next.js Frontend</div>
              <div className="px-3 py-1.5 rounded-lg bg-success/10 border border-success/30 text-[10px] font-medium text-success">NestJS API</div>
              <div className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-[10px] font-medium text-warning">AI Engine</div>
            </div>
            <svg className="w-4 h-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            {/* Database Layer */}
            <div className="flex gap-4 w-full justify-center">
              <div className="px-3 py-1.5 rounded-lg bg-ai-blue/10 border border-ai-blue/30 text-[10px] font-medium text-ai-blue">PostgreSQL</div>
              <div className="px-3 py-1.5 rounded-lg bg-ai-purple/10 border border-ai-purple/30 text-[10px] font-medium text-ai-purple">Redis</div>
              <div className="px-3 py-1.5 rounded-lg bg-ai-cyan/10 border border-ai-cyan/30 text-[10px] font-medium text-ai-cyan">MinIO</div>
              <div className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-[10px] font-medium text-warning">MQTT</div>
            </div>
            <svg className="w-4 h-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            {/* Edge */}
            <div className="px-4 py-2 rounded-lg bg-error/10 border border-error/30 text-xs font-medium text-error">Edge Devices</div>
          </div>
        </div>
      </GlassCard>

      {/* Demo Mode: Events Log */}
      {isDemoMode && (
        <GlassCard className="mt-6">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Live Demo Events</h3>
          <p className="text-[10px] text-text-muted mb-3">Real-time simulated events driving the demo experience</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {events.slice(0, 20).map((event, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-text-muted py-0.5">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  event.type.includes("ATTENDANCE") ? "bg-success" :
                  event.type.includes("BEHAVIOR") ? "bg-warning" :
                  event.type.includes("INSIGHT") ? "bg-ai-blue" : "bg-ai-cyan",
                )} />
                <span className="tabular-nums">{new Date(event.timestamp).toLocaleTimeString()}</span>
                <span className="font-medium text-text-primary">{event.type.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </>
  );
}
