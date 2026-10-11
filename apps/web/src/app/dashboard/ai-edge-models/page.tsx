"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { MOCK_EDGE_DEPLOYMENTS, type EdgeModelDeployment } from "@/lib/mock/mlops";

const STATUS_COLORS: Record<string, string> = {
  UPTODATE: "bg-success/10 text-success border-success/20",
  UPDATE_AVAILABLE: "bg-ai-blue/10 text-ai-blue border-ai-blue/20",
  UPDATING: "bg-warning/10 text-warning border-warning/20",
  OFFLINE: "bg-error/10 text-error border-error/20",
};

const STATUS_ICONS: Record<string, string> = {
  UPTODATE: "✓",
  UPDATE_AVAILABLE: "⬆",
  UPDATING: "⟳",
  OFFLINE: "✗",
};

export default function AIEdgeModelsPage() {
  const [devices, setDevices] = useState<EdgeModelDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => { setDevices(MOCK_EDGE_DEPLOYMENTS); setLoading(false); }, 300); }, []);

  const filtered = modelFilter === "all" ? devices : devices.filter(d => d.modelName === modelFilter);
  const updateCount = devices.filter(d => d.status === "UPDATE_AVAILABLE").length;

  const handleDeploy = (id: string) => {
    setDeploying(id);
    setTimeout(() => {
      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: "UPDATING" as const } : d));
      setTimeout(() => {
        setDevices(prev => prev.map(d => d.id === id ? { ...d, status: "UPTODATE" as const, currentVersion: d.targetVersion, checksumVerified: true, signatureVerified: true } : d));
        setDeploying(null);
      }, 2000);
    }, 500);
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64"><div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading edge devices...</span></div></div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Edge AI Model Management</h2>
          <p className="text-xs text-text-muted">Manage AI model updates across edge devices with checksum and signature verification</p>
        </div>
        <Button size="sm" disabled={updateCount === 0}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Deploy All Updates ({updateCount})
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Total Devices</p><p className="text-xl font-bold text-text-primary">{devices.length}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Up to Date</p><p className="text-xl font-bold text-success">{devices.filter(d => d.status === "UPTODATE").length}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Updates Available</p><p className="text-xl font-bold text-ai-blue">{updateCount}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Offline</p><p className="text-xl font-bold text-error">{devices.filter(d => d.status === "OFFLINE").length}</p></GlassCard>
      </div>

      {/* Model Filter */}
      <div className="flex gap-1 p-1 mb-6 glass rounded-xl border border-glass-border w-fit">
        {[{ id: "all", label: "All Subsystems" }, { id: "ArcFace", label: "Face Recognition" }, { id: "Behavior YOLO", label: "Behavior Analysis" }].map(f => (
          <button key={f.id} onClick={() => setModelFilter(f.id)} className={cn(
            "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all",
            modelFilter === f.id ? "bg-ai-blue text-black font-semibold" : "text-text-dim hover:text-text-primary",
          )}>{f.label}</button>
        ))}
      </div>

      {/* Device Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((device, i) => (
          <motion.div key={device.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className={cn(
              "transition-all hover:border-ai-blue/30 cursor-pointer",
              selectedDevice === device.id && "border-ai-blue/50",
            )} onClick={() => setSelectedDevice(selectedDevice === device.id ? null : device.id)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold",
                    device.status === "UPTODATE" ? "bg-success/10 text-success" :
                    device.status === "UPDATE_AVAILABLE" ? "bg-ai-blue/10 text-ai-blue" :
                    device.status === "UPDATING" ? "bg-warning/10 text-warning" : "bg-error/10 text-error",
                  )}>
                    {STATUS_ICONS[device.status]}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{device.deviceName}</h3>
                    <span className="text-[9px] font-mono text-text-muted">{device.deviceId} • {device.modelName === "ArcFace" ? "Face Recognition" : device.modelName === "Behavior YOLO" ? "Behavior Analysis" : device.modelName}</span>
                  </div>
                </div>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0", STATUS_COLORS[device.status])}>
                  {device.status === "UPDATE_AVAILABLE" ? "Update Available" : device.status}
                </span>
              </div>

              {/* Version Info */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-2 rounded-lg glass">
                  <p className="text-[8px] text-text-muted mb-0.5">Current Version</p>
                  <p className="text-[11px] font-mono font-bold text-text-primary">{device.currentVersion}</p>
                </div>
                <div className="p-2 rounded-lg glass">
                  <p className="text-[8px] text-text-muted mb-0.5">Target Version</p>
                  <p className={cn("text-[11px] font-mono font-bold", device.currentVersion !== device.targetVersion ? "text-ai-blue" : "text-text-primary")}>
                    {device.currentVersion !== device.targetVersion ? device.targetVersion : "—"}
                  </p>
                </div>
              </div>

              {/* Security Verification */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className={cn(
                  "flex items-center gap-1.5 p-1.5 rounded-lg text-[9px]",
                  device.checksumVerified ? "bg-success/5 text-success" : "bg-warning/5 text-warning",
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", device.checksumVerified ? "bg-success" : "bg-warning")} />
                  Checksum {device.checksumVerified ? "Verified" : "Pending"}
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 p-1.5 rounded-lg text-[9px]",
                  device.signatureVerified ? "bg-success/5 text-success" : "bg-warning/5 text-warning",
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", device.signatureVerified ? "bg-success" : "bg-warning")} />
                  Signature {device.signatureVerified ? "Verified" : "Pending"}
                </div>
              </div>

              {/* Deploy Button */}
              {device.status === "UPDATE_AVAILABLE" && (
                <div className="pt-2 border-t border-glass-border">
                  <Button
                    size="sm"
                    className="w-full text-[10px]"
                    disabled={deploying === device.id}
                    onClick={(e) => { e.stopPropagation(); handleDeploy(device.id); }}
                  >
                    {deploying === device.id ? (
                      <><div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deploying...</>
                    ) : (
                      <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                      Deploy Update
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Device Details (expanded) */}
              {selectedDevice === device.id && device.status !== "UPDATE_AVAILABLE" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden pt-2 border-t border-glass-border">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-text-muted">Last Updated:</span> <span className="text-text-primary">{device.lastUpdatedAt.toLocaleDateString()}</span></div>
                    <div><span className="text-text-muted">Model:</span> <span className="text-text-primary">{device.modelName}</span></div>
                    <div><span className="text-text-muted">Checksum:</span> <span className={device.checksumVerified ? "text-success" : "text-warning"}>{device.checksumVerified ? "✓ Verified" : "⚠ Pending"}</span></div>
                    <div><span className="text-text-muted">Signature:</span> <span className={device.signatureVerified ? "text-success" : "text-warning"}>{device.signatureVerified ? "✓ Verified" : "⚠ Pending"}</span></div>
                  </div>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </>
  );
}
