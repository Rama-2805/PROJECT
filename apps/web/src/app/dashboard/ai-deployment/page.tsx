"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { MOCK_DEPLOYMENTS, type DeploymentPipeline } from "@/lib/mock/mlops";

const STAGE_ORDER = ["VALIDATION", "STAGING", "AB_TESTING", "PRODUCTION"];

const STAGE_COLORS: Record<string, string> = {
  VALIDATION: "bg-ai-blue/10 border-ai-blue/20 text-ai-blue",
  STAGING: "bg-ai-purple/10 border-ai-purple/20 text-ai-purple",
  AB_TESTING: "bg-warning/10 border-warning/20 text-warning",
  PRODUCTION: "bg-success/10 border-success/20 text-success",
};

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-text-muted/10 text-text-muted border-glass-border",
  RUNNING: "bg-ai-blue/10 text-ai-blue border-ai-blue/20",
  OBSERVING: "bg-warning/10 text-warning border-warning/20",
  COMPLETED: "bg-success/10 text-success border-success/20",
  ROLLED_BACK: "bg-error/10 text-error border-error/20",
};

export default function AIDeploymentPage() {
  const [deployments, setDeployments] = useState<DeploymentPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDep, setSelectedDep] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => { setDeployments(MOCK_DEPLOYMENTS); setLoading(false); }, 300); }, []);

  const deployByStage = (stage: string) => deployments.filter(d => d.stage === stage);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64"><div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading deployment pipeline...</span></div></div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Model Deployment Pipeline</h2>
        <p className="text-xs text-text-muted">Validation → Staging → A/B Testing → Production with rollback and canary support</p>
      </div>

      {/* Pipeline Visualization */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {STAGE_ORDER.map((stage, si) => {
          const stageDeploys = deployByStage(stage);
          return (
            <div key={stage}>
              <div className={cn("text-center p-2 mb-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider", STAGE_COLORS[stage])}>
                {stage.replace("_", " ")}
              </div>
              <div className="space-y-2 min-h-[120px]">
                {stageDeploys.length === 0 && (
                  <div className="h-20 flex items-center justify-center rounded-lg glass border border-dashed border-glass-border">
                    <span className="text-[9px] text-text-muted">No deployments</span>
                  </div>
                )}
                {stageDeploys.map((dep, di) => (
                  <motion.div
                    key={dep.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: di * 0.1 }}
                    className={cn(
                      "p-2 rounded-lg glass cursor-pointer transition-all text-center",
                      dep.stage === "PRODUCTION" && dep.status === "COMPLETED" ? "border-success/30" : "hover:border-ai-blue/20",
                    )}
                    onClick={() => setSelectedDep(selectedDep === dep.id ? null : dep.id)}
                  >
                    <p className="text-[9px] font-semibold text-text-primary truncate">{dep.name}</p>
                    <span className={cn("text-[8px] px-1 py-0.5 rounded-full border font-medium", STATUS_BADGES[dep.status])}>{dep.status}</span>
                  </motion.div>
                ))}
              </div>
              {/* Arrow between stages */}
              {si < STAGE_ORDER.length - 1 && (
                <div className="hidden lg:block absolute text-text-muted" style={{ left: `${(si + 1) * 25}%`, top: "50%" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Deployment Details */}
      {deployments.map((dep) => (
        <AnimatePresence key={dep.id}>
          {selectedDep === dep.id && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
              <GlassCard className="border-ai-blue/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{dep.name}</h3>
                    <p className="text-[10px] text-text-muted font-mono">{dep.modelType} • v{dep.modelVersion}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dep.hasRollback && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-error/10 text-error border border-error/20">Rollback Available</span>}
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", STATUS_BADGES[dep.status])}>{dep.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="p-2 rounded-lg glass text-center">
                    <p className="text-[9px] text-text-muted">Stage</p>
                    <p className="text-[10px] font-bold text-text-primary">{dep.stage.replace("_", " ")}</p>
                  </div>
                  <div className="p-2 rounded-lg glass text-center">
                    <p className="text-[9px] text-text-muted">Canary %</p>
                    <p className="text-[10px] font-bold text-ai-blue">{dep.canaryPercent}%</p>
                  </div>
                  <div className="p-2 rounded-lg glass text-center">
                    <p className="text-[9px] text-text-muted">Observation</p>
                    <p className="text-[10px] font-bold text-text-primary">{dep.observationHours}h</p>
                  </div>
                  <div className="p-2 rounded-lg glass text-center">
                    <p className="text-[9px] text-text-muted">Started</p>
                    <p className="text-[10px] font-bold text-text-primary">{dep.startedAt.toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Canary Ramp-up Visualization */}
                {dep.stage === "AB_TESTING" && (
                  <div className="mb-3">
                    <p className="text-[9px] text-text-muted mb-1">Canary Ramp-up: {dep.canaryPercent}% → 100%</p>
                    <div className="flex gap-1 h-3">
                      {[10, 25, 50, 100].map(pct => (
                        <div key={pct} className="flex-1 rounded-sm flex items-center justify-center"
                          style={{ background: dep.canaryPercent >= pct ? "linear-gradient(135deg, #22D3EE, #A78BFA)" : "rgba(255,255,255,0.05)" }}>
                          <span className="text-[6px] font-bold" style={{ color: dep.canaryPercent >= pct ? "#fff" : "rgba(255,255,255,0.3)" }}>{pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-glass-border">
                  {dep.hasRollback && <Button size="sm" variant="secondary" className="text-error text-[10px]"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>Rollback</Button>}
                  {dep.status === "PENDING" && <Button size="sm" className="text-[10px]">Approve</Button>}
                  {dep.status === "RUNNING" && <Button size="sm" className="text-[10px]">Promote to Next Stage</Button>}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      ))}

      {/* All Deployments List */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-text-primary mb-3">📋 Deployment History</h3>
        <div className="space-y-2">
          {deployments.map((dep, i) => (
            <motion.div key={dep.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="flex items-center justify-between p-2 rounded-lg glass hover:bg-glass-medium transition-all cursor-pointer" onClick={() => setSelectedDep(selectedDep === dep.id ? null : dep.id)}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-bold",
                    dep.status === "COMPLETED" ? "bg-success/10 text-success" : dep.status === "RUNNING" ? "bg-ai-blue/10 text-ai-blue" : "bg-text-muted/10 text-text-muted",
                  )}>
                    {dep.status === "COMPLETED" ? "✓" : dep.status === "RUNNING" ? "→" : "○"}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-text-primary">{dep.name}</p>
                    <span className="text-[8px] text-text-muted font-mono">{dep.modelType} • v{dep.modelVersion}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-medium", STAGE_COLORS[dep.stage])}>{dep.stage.replace("_", " ")}</span>
                  <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-medium", STATUS_BADGES[dep.status])}>{dep.status}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </>
  );
}
