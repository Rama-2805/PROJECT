"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────

interface RobotData {
  id: string;
  name: string;
  type: string;
  status: string;
  battery: number;
  health: string;
  missions: number;
  location: string;
}

interface DroneData {
  id: string;
  name: string;
  model: string;
  status: string;
  battery: number;
  altitude: number;
  flights: number;
}

interface BuildingSummary {
  building: string;
  sensors: number;
  normal: number;
  warning: number;
  critical: number;
  temp: number;
  power: number;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: string;
  location: string;
  description: string;
  time: string;
  status: string;
}

interface MaintenanceItem {
  id: string;
  name: string;
  type: string;
  failure_prob: number;
  status: string;
  action: string;
}

// ── Mock Data ──────────────────────────────────────

const MOCK_ROBOTS: RobotData[] = [
  { id: "assistant-01", name: "Campus Guide Alpha", type: "Assistant", status: "idle", battery: 87, health: "good", missions: 156, location: "Main Plaza" },
  { id: "delivery-01", name: "DeliverBot Prime", type: "Delivery", status: "on_mission", battery: 62, health: "good", missions: 423, location: "En route to Library" },
  { id: "cleaning-03", name: "DustBuster 3", type: "Cleaning", status: "charging", battery: 23, health: "good", missions: 89, location: "Charging Station B" },
  { id: "security-02", name: "Guardian 2", type: "Security", status: "patrolling", battery: 74, health: "good", missions: 212, location: "Perimeter Route" },
  { id: "assistant-04", name: "NavHelper Gamma", type: "Assistant", status: "idle", battery: 95, health: "warning", missions: 78, location: "Admin Lobby" },
  { id: "delivery-03", name: "Package Runner", type: "Delivery", status: "returning", battery: 18, health: "good", missions: 167, location: "Returning to base" },
];

const MOCK_DRONES: DroneData[] = [
  { id: "drone-01", name: "HawkEye 1", model: "DJI Mavic 3", status: "idle", battery: 92, altitude: 0, flights: 145 },
  { id: "drone-04", name: "EagleVision 3", model: "Skydio X2", status: "flying", battery: 68, altitude: 45, flights: 89 },
  { id: "drone-07", name: "SkyGuardian 7", model: "Autel EVO II", status: "charging", battery: 31, altitude: 0, flights: 203 },
  { id: "drone-10", name: "CampusEye 10", model: "Parrot ANAFI", status: "flying", battery: 55, altitude: 32, flights: 67 },
];

const MOCK_BUILDINGS: BuildingSummary[] = [
  { building: "Engineering Block", sensors: 24, normal: 21, warning: 2, critical: 1, temp: 25.3, power: 12.4 },
  { building: "Science Block", sensors: 18, normal: 17, warning: 1, critical: 0, temp: 23.8, power: 8.2 },
  { building: "Library", sensors: 12, normal: 12, warning: 0, critical: 0, temp: 22.1, power: 5.5 },
  { building: "Administration", sensors: 14, normal: 13, warning: 1, critical: 0, temp: 24.0, power: 6.8 },
  { building: "Auditorium", sensors: 8, normal: 7, warning: 1, critical: 0, temp: 26.5, power: 9.1 },
  { building: "Cafeteria", sensors: 10, normal: 8, warning: 1, critical: 1, temp: 25.0, power: 7.5 },
];

const MOCK_ALERTS: SecurityAlert[] = [
  { id: "alert-001", type: "intrusion", severity: "high", location: "Library Back Entrance", description: "Unauthorized access attempt detected", time: "2 min ago", status: "active" },
  { id: "alert-002", type: "suspicious", severity: "medium", location: "Parking Lot East", description: "Suspicious vehicle loitering near gate", time: "15 min ago", status: "investigating" },
  { id: "alert-003", type: "emergency", severity: "critical", location: "Science Block Lab 3", description: "[Simulated Demo Scenario] Fire alarm triggered — dispatching robot", time: "1 hour ago", status: "resolved" },
];

const MOCK_MAINTENANCE: MaintenanceItem[] = [
  { id: "cam-001", name: "CSE Corridor Camera", type: "camera", failure_prob: 82, status: "critical", action: "Immediate replacement required" },
  { id: "robot-001", name: "DeliverBot Prime", type: "robot", failure_prob: 58, status: "poor", action: "Schedule maintenance within 7 days" },
  { id: "elec-001", name: "Main Switchboard A", type: "electrical", failure_prob: 45, status: "fair", action: "Plan preventive maintenance within 30 days" },
];

const STATUS_ICONS: Record<string, string> = {
  idle: "🟢", charging: "🔵", on_mission: "🟡", returning: "🟠", patrolling: "🟣",
  flying: "🔵", online: "🟢", active: "🔴",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-300 border-red-500/20",
  high: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  low: "bg-slate-500/10 text-slate-300 border-slate-500/20",
};

// ── Component ──────────────────────────────────────

export default function AutonomousCampusPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"robots" | "drones" | "buildings" | "security" | "maintenance">("robots");
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [simEvent, setSimEvent] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const simulateEvent = (type: string) => {
    const events: Record<string, string> = {
      robot: "🚀 Robot mission dispatched successfully!",
      drone: "🛸 Drone inspection launched — scanning Engineering Block roof",
      security: "🚨 Security alert simulated — check Active Alerts tab",
      energy: "⚡ Energy report generated: 92% efficiency score",
      cleaning: "🧹 Coordinated cleaning operation dispatched to Library",
    };
    setSimEvent({ type, message: events[type] || "Event simulated" });
    setTimeout(() => setSimEvent(null), 4000);
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-muted">Initializing Autonomous Campus Ecosystem...</span>
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
            🤖 Autonomous Campus Ecosystem
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Research Preview
            </span>
          </h2>
          <p className="text-xs text-text-muted">AI-driven robotics, drones, smart buildings & autonomous infrastructure</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: "🤖 Robot", action: () => simulateEvent("robot") },
            { label: "🛸 Drone", action: () => simulateEvent("drone") },
            { label: "🚨 Security", action: () => simulateEvent("security") },
            { label: "⚡ Energy", action: () => simulateEvent("energy") },
          ].map((btn) => (
            <Button key={btn.label} size="sm" variant="secondary" onClick={btn.action}>
              {btn.label} Sim
            </Button>
          ))}
        </div>
      </div>

      {/* Simulation Event Toast */}
      <AnimatePresence>
        {simEvent && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300"
          >
            {simEvent.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Robot Health", value: "98%", icon: "🤖", color: "text-emerald-400" },
          { label: "Drone Fleet", value: "4/4 Online", icon: "🛸", color: "text-cyan-400" },
          { label: "Energy Efficiency", value: "92%", icon: "⚡", color: "text-yellow-400" },
          { label: "Maintenance Alerts", value: "3", icon: "🔧", color: "text-red-400" },
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 mb-6 glass rounded-xl border border-glass-border w-fit overflow-x-auto">
        {[
          { id: "robots" as const, label: "🤖 Robots", count: MOCK_ROBOTS.filter(r => r.status !== "idle" || r.battery < 30).length },
          { id: "drones" as const, label: "🛸 Drones", count: MOCK_DRONES.filter(d => d.status === "flying").length },
          { id: "buildings" as const, label: "🏛️ Buildings", count: MOCK_BUILDINGS.filter(b => b.critical > 0 || b.warning > 0).length },
          { id: "security" as const, label: "🔒 Security", count: MOCK_ALERTS.filter(a => a.status === "active" || a.status === "investigating").length },
          { id: "maintenance" as const, label: "🔧 Maintenance", count: MOCK_MAINTENANCE.filter(m => m.status === "critical" || m.status === "poor").length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap",
              activeTab === tab.id ? "bg-cyan-500 text-white" : "text-text-dim hover:text-text-primary",
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn("text-[9px] px-1 rounded-full", activeTab === tab.id ? "bg-white/20" : "bg-slate-800")}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Robots ────────────────────────── */}
      {activeTab === "robots" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MOCK_ROBOTS.map((robot, i) => (
            <motion.div key={robot.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard
                className={cn(
                  "cursor-pointer transition-all",
                  selectedRobot === robot.id ? "border-cyan-500/40 ring-1 ring-cyan-500/20" : "hover:border-cyan-500/20",
                )}
                onClick={() => setSelectedRobot(selectedRobot === robot.id ? null : robot.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{robot.type === "Assistant" ? "🤖" : robot.type === "Delivery" ? "📦" : robot.type === "Cleaning" ? "🧹" : "🛡️"}</span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{robot.name}</p>
                      <p className="text-[9px] text-text-muted">{robot.type} • {robot.id}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full border",
                    robot.health === "good" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
                  )}>
                    {STATUS_ICONS[robot.status] || "⚪"} {robot.status.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="p-1.5 rounded-lg glass text-center">
                    <p className="text-xs font-bold tabular-nums">{robot.battery}%</p>
                    <p className="text-[7px] text-text-muted">Battery</p>
                  </div>
                  <div className="p-1.5 rounded-lg glass text-center">
                    <p className="text-xs font-bold tabular-nums">{robot.missions}</p>
                    <p className="text-[7px] text-text-muted">Missions</p>
                  </div>
                  <div className="p-1.5 rounded-lg glass text-center">
                    <p className={cn("text-xs font-bold tabular-nums", robot.health === "good" ? "text-emerald-400" : "text-yellow-400")}>{robot.health}</p>
                    <p className="text-[7px] text-text-muted">Health</p>
                  </div>
                </div>

                <p className="text-[9px] text-text-muted">📍 {robot.location}</p>

                {/* Battery bar */}
                <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${robot.battery}%` }}
                    className={cn("h-full rounded-full", robot.battery > 50 ? "bg-emerald-400" : robot.battery > 20 ? "bg-yellow-400" : "bg-red-400")}
                  />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tab: Drones ────────────────────────── */}
      {activeTab === "drones" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MOCK_DRONES.map((drone, i) => (
            <motion.div key={drone.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <GlassCard>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛸</span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{drone.name}</p>
                      <p className="text-[9px] text-text-muted">{drone.model}</p>
                    </div>
                  </div>
                  <span className={cn("text-[9px] px-2 py-0.5 rounded-full border", SEVERITY_COLORS[drone.status === "flying" ? "high" : "low"])}>
                    {drone.status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Battery", value: `${drone.battery}%` },
                    { label: "Altitude", value: `${drone.altitude}m` },
                    { label: "Flights", value: `${drone.flights}` },
                    { label: "Status", value: drone.status === "flying" ? "🟢 Active" : "⏸️ Idle" },
                  ].map((s, si) => (
                    <div key={si} className="p-1 rounded-lg glass text-center">
                      <p className="text-[10px] font-bold text-text-primary">{s.value}</p>
                      <p className="text-[7px] text-text-muted">{s.label}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tab: Buildings ─────────────────────── */}
      {activeTab === "buildings" && (
        <div className="space-y-3">
          {MOCK_BUILDINGS.map((b, i) => (
            <motion.div key={b.building} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-text-primary">{b.building}</p>
                  <div className="flex gap-1">
                    {b.critical > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">{b.critical} critical</span>}
                    {b.warning > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">{b.warning} warning</span>}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-1.5 rounded-lg glass text-center">
                    <p className="text-[10px] font-bold tabular-nums">{b.sensors}</p>
                    <p className="text-[7px] text-text-muted">Sensors</p>
                  </div>
                  <div className="p-1.5 rounded-lg glass text-center">
                    <p className="text-[10px] font-bold tabular-nums">{b.temp}°C</p>
                    <p className="text-[7px] text-text-muted">Temp</p>
                  </div>
                  <div className="p-1.5 rounded-lg glass text-center">
                    <p className="text-[10px] font-bold tabular-nums">{b.power}kW</p>
                    <p className="text-[7px] text-text-muted">Power</p>
                  </div>
                  <div className="p-1.5 rounded-lg glass text-center">
                    <p className={cn("text-[10px] font-bold tabular-nums", b.critical > 0 ? "text-red-400" : "text-emerald-400")}>
                      {b.normal}/{b.sensors}
                    </p>
                    <p className="text-[7px] text-text-muted">Healthy</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tab: Security ──────────────────────── */}
      {activeTab === "security" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <GlassCard subtle className="text-center">
              <p className="text-[9px] text-text-muted">Active Alerts</p>
              <p className="text-lg font-bold text-red-400">{MOCK_ALERTS.filter(a => a.status === "active").length}</p>
            </GlassCard>
            <GlassCard subtle className="text-center">
              <p className="text-[9px] text-text-muted">Investigating</p>
              <p className="text-lg font-bold text-yellow-400">{MOCK_ALERTS.filter(a => a.status === "investigating").length}</p>
            </GlassCard>
            <GlassCard subtle className="text-center">
              <p className="text-[9px] text-text-muted">Patrol Routes</p>
              <p className="text-lg font-bold text-cyan-400">3 Active</p>
            </GlassCard>
          </div>

          {MOCK_ALERTS.map((alert, i) => (
            <motion.div key={alert.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <GlassCard className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "mt-0.5 text-sm",
                    alert.severity === "critical" ? "text-red-400" : alert.severity === "high" ? "text-orange-400" : "text-yellow-400",
                  )}>
                    {alert.severity === "critical" ? "🔴" : alert.severity === "high" ? "🟠" : "🟡"}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-text-primary capitalize">{alert.type} — {alert.location}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{alert.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-text-muted">
                      <span>⏱ {alert.time}</span>
                      <span>•</span>
                      <span className={cn(
                        "capitalize",
                        alert.status === "active" ? "text-red-400" : alert.status === "investigating" ? "text-yellow-400" : "text-emerald-400",
                      )}>{alert.status}</span>
                    </div>
                  </div>
                </div>
                {alert.status !== "resolved" && (
                  <span className={cn("text-[9px] px-2 py-0.5 rounded-full border shrink-0", SEVERITY_COLORS[alert.severity])}>
                    {alert.severity.toUpperCase()}
                  </span>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tab: Maintenance ───────────────────── */}
      {activeTab === "maintenance" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <GlassCard subtle className="text-center">
              <p className="text-[9px] text-text-muted">Critical</p>
              <p className="text-lg font-bold text-red-400">{MOCK_MAINTENANCE.filter(m => m.status === "critical").length}</p>
            </GlassCard>
            <GlassCard subtle className="text-center">
              <p className="text-[9px] text-text-muted">Poor / Fair</p>
              <p className="text-lg font-bold text-yellow-400">{MOCK_MAINTENANCE.filter(m => m.status === "poor" || m.status === "fair").length}</p>
            </GlassCard>
            <GlassCard subtle className="text-center">
              <p className="text-[9px] text-text-muted">Avg Failure Probability</p>
              <p className="text-lg font-bold text-orange-400">62%</p>
            </GlassCard>
          </div>

          {MOCK_MAINTENANCE.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm",
                      item.status === "critical" ? "text-red-400" : item.status === "poor" ? "text-orange-400" : "text-yellow-400",
                    )}>
                      {item.status === "critical" ? "🔴" : item.status === "poor" ? "🟠" : "🟡"}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{item.name}</p>
                      <p className="text-[9px] text-text-muted capitalize">{item.type} • {item.id}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full border capitalize",
                    item.status === "critical" ? "bg-red-500/10 text-red-300 border-red-500/20" :
                    item.status === "poor" ? "bg-orange-500/10 text-orange-300 border-orange-500/20" :
                    "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
                  )}>{item.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-text-muted">Failure Probability</span>
                      <span className={cn(
                        "font-bold",
                        item.failure_prob > 70 ? "text-red-400" : item.failure_prob > 40 ? "text-yellow-400" : "text-emerald-400",
                      )}>{item.failure_prob}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.failure_prob}%` }}
                        className={cn("h-full rounded-full", item.failure_prob > 70 ? "bg-red-400" : item.failure_prob > 40 ? "bg-yellow-400" : "bg-emerald-400")}
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[9px] text-text-muted">→ {item.action}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
