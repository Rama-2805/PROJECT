"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getDeviceDetailData, type Device, type DeviceHeartbeat, type DeviceLog } from "@/lib/mock/devices";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

function HealthChart({ heartbeats, dataKey, label, color, unit }: {
  heartbeats: DeviceHeartbeat[];
  dataKey: "cpuUsage" | "memoryUsage" | "temperature";
  label: string;
  color: string;
  unit: string;
}) {
  const values = heartbeats.map((h) => h[dataKey]);
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-text-muted">{label}</span>
        <span className="text-xs font-semibold text-text-primary tabular-nums">
          {values.length > 0 ? Math.round(values[values.length - 1]) : 0}{unit}
        </span>
      </div>
      <div className="flex items-end gap-0.5 h-20">
        {heartbeats.slice(-48).map((h, i) => {
          const val = h[dataKey as keyof DeviceHeartbeat] as number;
          const pct = Math.max(0, Math.min(100, val));
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all hover:opacity-80"
              style={{
                height: `${pct * 0.2}%`,
                backgroundColor: val > 80 ? "#EF4444" : val > 60 ? "#F59E0B" : color,
              }}
              title={`${pct.toFixed(1)}${unit}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-text-muted">{Math.round(min)}{unit}</span>
        <span className="text-[8px] text-text-muted">{Math.round(max)}{unit}</span>
      </div>
    </div>
  );
}

const COMMANDS = [
  { id: "RESTART", label: "Restart Device", icon: "↻", description: "Full device reboot" },
  { id: "RESTART_AI", label: "Restart AI Service", icon: "⚙", description: "Reload AI models" },
  { id: "UPDATE_CONFIG", label: "Update Config", icon: "⚡", description: "Sync cloud config" },
  { id: "DIAGNOSTIC", label: "Run Diagnostic", icon: "◉", description: "Full health check" },
];

export default function DeviceDetailPage() {
  const params = useParams();
  const deviceId = params?.deviceId as string;
  const [data, setData] = useState<{ device: Device; heartbeats: DeviceHeartbeat[]; logs: DeviceLog[]; commands: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "health" | "logs" | "commands">("overview");
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId) return;
    getDeviceDetailData(deviceId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [deviceId]);

  const handleCommand = (cmd: string) => {
    setCommandFeedback(`Command "${cmd}" sent to device`);
    setTimeout(() => setCommandFeedback(null), 3000);
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

  if (error || !data) {
    return (
      <>
        <GlassCard>
          <p className="text-sm text-error">Device not found: {error}</p>
        </GlassCard>
      </>
    );
  }

  const { device, heartbeats, logs, commands } = data;

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "health" as const, label: "Health Metrics" },
    { key: "logs" as const, label: `Logs (${logs.length})` },
    { key: "commands" as const, label: "Remote Control" },
  ];

  return (
    <>
      {/* Command Feedback */}
      {commandFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 px-3 py-2 rounded-lg bg-success/10 border border-success/30 text-xs text-success"
        >
          {commandFeedback}
        </motion.div>
      )}

      {/* Device Header */}
      <GlassCard subtle className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold",
              device.status === "ONLINE" || device.status === "PROCESSING" ? "bg-success/20 text-success" :
              device.status === "ERROR" ? "bg-error/20 text-error" :
              "bg-glass-light text-text-dim"
            )}>
              {device.deviceId.slice(0, 2)}
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">{device.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border",
                  device.status === "ONLINE" ? "text-success bg-success/20 border-success/30" :
                  device.status === "PROCESSING" ? "text-ai-cyan bg-ai-cyan/20 border-ai-cyan/30" :
                  device.status === "ERROR" ? "text-error bg-error/20 border-error/30" :
                  device.status === "UPDATING" ? "text-warning bg-warning/20 border-warning/30" :
                  "text-text-muted bg-glass-light border-glass-border"
                )}>
                  <span className={cn("h-1 w-1 rounded-full", {
                    "bg-success animate-glow-pulse": device.status === "ONLINE",
                    "bg-ai-cyan": device.status === "PROCESSING",
                    "bg-error": device.status === "ERROR",
                    "bg-warning": device.status === "UPDATING",
                    "bg-text-dim": device.status === "OFFLINE",
                  })} />
                  {device.status}
                </span>
                <span className="text-[10px] text-text-muted">{device.uptime} uptime</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted">Last seen: {new Date(device.lastHeartbeat).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-glass-border">
          <div>
            <p className="text-[9px] text-text-muted">Device Type</p>
            <p className="text-xs text-text-primary mt-0.5">{device.type.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-[9px] text-text-muted">Location</p>
            <p className="text-xs text-text-primary mt-0.5 truncate">{device.location}</p>
          </div>
          <div>
            <p className="text-[9px] text-text-muted">Firmware</p>
            <p className="text-xs text-text-primary mt-0.5">{device.firmwareVersion}</p>
          </div>
          <div>
            <p className="text-[9px] text-text-muted">AI Model</p>
            <p className="text-xs text-ai-cyan mt-0.5">{device.modelVersion}</p>
          </div>
        </div>
      </GlassCard>

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

      {/* ─── OVERVIEW ─── */}
      {activeTab === "overview" && (
        <motion.div {...fadeUp} key="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Summary */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Current Health</h3>
              <div className="space-y-3">
                {[
                  { label: "CPU Usage", value: device.cpuUsage, color: "bg-ai-cyan" },
                  { label: "Memory Usage", value: device.memoryUsage, color: "bg-ai-purple" },
                  { label: "Temperature", value: device.temperature, color: "bg-warning" },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-text-muted">{metric.label}</span>
                      <span className={cn(
                        "text-[10px] font-medium tabular-nums",
                        metric.label === "Temperature" && metric.value > 70 ? "text-error" :
                        metric.value > 60 ? "text-warning" : "text-text-primary"
                      )}>
                        {metric.label === "Temperature" ? `${Math.round(metric.value)}°C` : `${Math.round(metric.value)}%`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-glass-light overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", metric.color)}
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Network Info */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Network & Connectivity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1.5 border-b border-glass-border">
                  <span className="text-[10px] text-text-muted">Status</span>
                  <span className={cn(
                    "text-[10px] font-medium",
                    device.networkQuality === "GOOD" ? "text-success" :
                    device.networkQuality === "FAIR" ? "text-warning" : "text-error"
                  )}>{device.networkQuality}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-glass-border">
                  <span className="text-[10px] text-text-muted">Uptime</span>
                  <span className="text-[10px] font-medium text-text-primary">{device.uptime}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-glass-border">
                  <span className="text-[10px] text-text-muted">Last Heartbeat</span>
                  <span className="text-[10px] font-medium text-text-primary">
                    {new Date(device.lastHeartbeat).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[10px] text-text-muted">Heartbeats Recorded</span>
                  <span className="text-[10px] font-medium text-text-primary">{heartbeats.length}</span>
                </div>
              </div>
            </GlassCard>

            {/* Recent Logs */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Logs</h3>
              <div className="space-y-1.5">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 py-1">
                    <span className={cn(
                      "mt-0.5 h-1.5 w-1.5 rounded-full shrink-0",
                      log.level === "ERROR" ? "bg-error" : log.level === "WARNING" ? "bg-warning" : "bg-ai-blue"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-text-primary truncate">{log.message}</p>
                      <p className="text-[8px] text-text-muted">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* ─── HEALTH ─── */}
      {activeTab === "health" && (
        <motion.div {...fadeUp} key="health" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard>
              <HealthChart heartbeats={heartbeats} dataKey="cpuUsage" label="CPU Usage Trend" color="#22D3EE" unit="%" />
            </GlassCard>
            <GlassCard>
              <HealthChart heartbeats={heartbeats} dataKey="memoryUsage" label="Memory Usage Trend" color="#A78BFA" unit="%" />
            </GlassCard>
            <GlassCard>
              <HealthChart heartbeats={heartbeats} dataKey="temperature" label="Temperature Trend" color="#F59E0B" unit="°C" />
            </GlassCard>
          </div>

          <GlassCard>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Heartbeat History (Last 48)</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="text-[9px] text-text-muted uppercase tracking-wider">
                    <th className="text-left pb-2 pr-3 font-semibold">Time</th>
                    <th className="text-left pb-2 pr-3 font-semibold">CPU</th>
                    <th className="text-left pb-2 pr-3 font-semibold">Memory</th>
                    <th className="text-left pb-2 pr-3 font-semibold">Temperature</th>
                    <th className="text-left pb-2 font-semibold">Network</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {heartbeats.slice(-20).reverse().map((hb, i) => (
                    <tr key={i} className="text-[10px] text-text-primary">
                      <td className="py-1.5 pr-3 text-text-muted">{new Date(hb.timestamp).toLocaleTimeString()}</td>
                      <td className="py-1.5 pr-3">
                        <span className={cn("tabular-nums", hb.cpuUsage > 80 ? "text-error" : hb.cpuUsage > 60 ? "text-warning" : "")}>
                          {Math.round(hb.cpuUsage)}%
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 tabular-nums">{Math.round(hb.memoryUsage)}%</td>
                      <td className="py-1.5 pr-3">
                        <span className={cn("tabular-nums", hb.temperature > 70 ? "text-error" : hb.temperature > 55 ? "text-warning" : "")}>
                          {Math.round(hb.temperature)}°C
                        </span>
                      </td>
                      <td className="py-1.5">
                        <span className={cn(
                          "font-medium",
                          hb.networkQuality === "GOOD" ? "text-success" :
                          hb.networkQuality === "FAIR" ? "text-warning" : "text-error"
                        )}>{hb.networkQuality}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ─── LOGS ─── */}
      {activeTab === "logs" && (
        <motion.div {...fadeUp} key="logs">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">System Logs</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => {}}>Filter</Button>
                <Button size="sm" variant="secondary" onClick={() => {}}>Export</Button>
              </div>
            </div>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-glass-light/20 transition-colors">
                  <span className={cn(
                    "mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium",
                    log.level === "ERROR" ? "text-error bg-error/10 border border-error/20" :
                    log.level === "WARNING" ? "text-warning bg-warning/10 border border-warning/20" :
                    "text-ai-blue bg-ai-blue/10 border border-ai-blue/20"
                  )}>
                    {log.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary">{log.message}</p>
                    <p className="text-[9px] text-text-muted mt-0.5">
                      {new Date(log.timestamp).toLocaleString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ─── COMMANDS ─── */}
      {activeTab === "commands" && (
        <motion.div {...fadeUp} key="commands" className="space-y-6">
          {/* Send Commands */}
          <GlassCard>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Remote Commands</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COMMANDS.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleCommand(cmd.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-glass-light border border-glass-border hover:border-ai-blue/30 hover:bg-ai-blue/5 transition-all group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{cmd.icon}</span>
                  <span className="text-[11px] font-medium text-text-primary">{cmd.label}</span>
                  <span className="text-[9px] text-text-muted text-center">{cmd.description}</span>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Command History */}
          <GlassCard>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Command History</h3>
            {commands.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-6">No commands have been sent to this device</p>
            ) : (
              <div className="space-y-2">
                {commands.map((cmd) => (
                  <div key={cmd.id} className="flex items-center justify-between p-2 rounded-lg bg-glass-light/30 border border-glass-border">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium text-ai-blue uppercase">{cmd.command.replace(/_/g, " ")}</span>
                      <span className="text-[9px] text-text-muted">by {cmd.issuedBy}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-text-muted">{new Date(cmd.createdAt).toLocaleDateString()}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-medium",
                        cmd.status === "COMPLETED" ? "text-success bg-success/10" :
                        cmd.status === "FAILED" ? "text-error bg-error/10" :
                        "text-warning bg-warning/10"
                      )}>{cmd.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}
    </>
  );
}
