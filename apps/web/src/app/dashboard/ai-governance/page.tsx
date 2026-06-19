"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils/cn";

interface GovernanceReport {
  totalModelDecisions: number;
  modelsDeployed: number;
  dataSources: string[];
  trainingHistory: { experimentId: string; modelType: string; accuracy: number; status: string; completedAt: Date | null }[];
  modelLimitations: string[];
  lastAuditDate: Date;
  biasAnalysis: { genderBias: number; lightingBias: number; demographicFairness: number };
}

const MOCK_GOVERNANCE: GovernanceReport = {
  totalModelDecisions: 1250000,
  modelsDeployed: 3,
  dataSources: ["Student Face Dataset v2", "Classroom Behavior Dataset", "Synthetic Augmentation Set"],
  trainingHistory: [
    { experimentId: "EXP-20250601-001", modelType: "FACE_RECOGNITION", accuracy: 98.7, status: "COMPLETED", completedAt: new Date("2025-06-03") },
    { experimentId: "EXP-20250605-002", modelType: "BEHAVIOR", accuracy: 92.3, status: "COMPLETED", completedAt: new Date("2025-06-08") },
    { experimentId: "EXP-20250610-003", modelType: "POSE", accuracy: 85.7, status: "COMPLETED", completedAt: new Date("2025-06-12") },
    { experimentId: "EXP-20250615-004", modelType: "FACE_RECOGNITION", accuracy: 0, status: "RUNNING", completedAt: null },
  ],
  modelLimitations: [
    "Reduced accuracy in low-light conditions (< 50 lux)",
    "Side-profile recognition below 85% confidence",
    "Behavior detection limited to frontal camera views",
    "Phone usage detection may trigger on reflective objects",
    "Mask occlusion reduces face recognition to 72% accuracy",
  ],
  lastAuditDate: new Date("2025-06-10"),
  biasAnalysis: { genderBias: 0.02, lightingBias: 0.08, demographicFairness: 0.96 },
};

export default function AIGovernancePage() {
  const [report, setReport] = useState<GovernanceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => { setReport(MOCK_GOVERNANCE); setLoading(false); }, 300); }, []);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64"><div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading governance report...</span></div></div>
      </>
    );
  }

  if (!report) return null;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary">AI Transparency & Governance</h2>
        <p className="text-xs text-text-muted">Model accountability, data provenance, and fairness monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Model Decisions</p>
          <p className="text-xl font-bold text-text-primary tabular-nums">{report.totalModelDecisions.toLocaleString()}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Deployed Models</p>
          <p className="text-xl font-bold text-success tabular-nums">{report.modelsDeployed}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Data Sources</p>
          <p className="text-xl font-bold text-ai-blue tabular-nums">{report.dataSources.length}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Last Audit</p>
          <p className="text-sm font-bold text-ai-purple tabular-nums">{report.lastAuditDate.toLocaleDateString()}</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Data Sources & Limitations */}
        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-xs font-semibold text-text-primary mb-3">📊 Data Sources</h3>
            <div className="space-y-2">
              {report.dataSources.map((ds, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", i === 0 ? "bg-ai-blue" : i === 1 ? "bg-ai-purple" : "bg-success")} />
                  <span className="text-[10px] text-text-primary">{ds}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-xs font-semibold text-text-primary mb-3">⚠️ Known Limitations</h3>
            <div className="space-y-1.5">
              {report.modelLimitations.map((lim, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg glass">
                  <span className="text-warning shrink-0 mt-0.5">!</span>
                  <span className="text-[10px] text-text-secondary">{lim}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Center: Bias Analysis */}
        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-xs font-semibold text-text-primary mb-4">🎯 Bias Analysis</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-text-muted">Gender Bias</span>
                  <span className={cn("font-medium", report.biasAnalysis.genderBias < 0.05 ? "text-success" : "text-warning")}>
                    {(report.biasAnalysis.genderBias * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-glass-light overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-success via-warning to-error transition-all" style={{ width: `${report.biasAnalysis.genderBias * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-text-muted">Lighting Bias</span>
                  <span className={cn("font-medium", report.biasAnalysis.lightingBias < 0.05 ? "text-success" : report.biasAnalysis.lightingBias < 0.1 ? "text-warning" : "text-error")}>
                    {(report.biasAnalysis.lightingBias * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-glass-light overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-success via-warning to-error transition-all" style={{ width: `${report.biasAnalysis.lightingBias * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-text-muted">Demographic Fairness</span>
                  <span className={cn("font-medium", report.biasAnalysis.demographicFairness > 0.9 ? "text-success" : "text-warning")}>
                    {(report.biasAnalysis.demographicFairness * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-glass-light overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-error via-warning to-success transition-all" style={{ width: `${report.biasAnalysis.demographicFairness * 100}%` }} />
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-xs font-semibold text-text-primary mb-3">📋 Compliance Status</h3>
            <div className="space-y-2">
              {[
                { label: "GDPR Compliance", status: "✅ Compliant" },
                { label: "FERPA Compliance", status: "✅ Compliant" },
                { label: "Data Retention Policy", status: "✅ Active" },
                { label: "Privacy Impact Assessment", status: "✅ Completed" },
                { label: "Algorithmic Bias Audit", status: "⚠️ Quarterly" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-[10px] p-1.5 rounded-lg glass">
                  <span className="text-text-primary">{item.label}</span>
                  <span className="text-text-muted">{item.status}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right: Training History */}
        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-xs font-semibold text-text-primary mb-3">🔄 Training History</h3>
            <div className="space-y-2">
              {report.trainingHistory.map((h, i) => (
                <motion.div key={h.experimentId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="p-2 rounded-lg glass">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-text-muted">{h.experimentId}</span>
                      <span className={cn(
                        "text-[8px] px-1 py-0.5 rounded-full font-medium",
                        h.status === "COMPLETED" ? "bg-success/10 text-success" : "bg-ai-blue/10 text-ai-blue",
                      )}>{h.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-text-primary">{h.modelType.replace("_", " ")}</span>
                      <span className={h.accuracy > 0 ? "text-ai-blue font-bold" : "text-text-muted"}>
                        {h.accuracy > 0 ? `${h.accuracy}%` : "In progress"}
                      </span>
                    </div>
                    {h.completedAt && <p className="text-[8px] text-text-muted mt-0.5">{h.completedAt.toLocaleDateString()}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-xs font-semibold text-text-primary mb-3">📄 Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 p-2 rounded-lg glass text-[10px] text-text-primary hover:bg-glass-medium transition-colors">
                <svg className="w-3.5 h-3.5 text-ai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Download Transparency Report
              </button>
              <button className="w-full flex items-center gap-2 p-2 rounded-lg glass text-[10px] text-text-primary hover:bg-glass-medium transition-colors">
                <svg className="w-3.5 h-3.5 text-ai-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                View Audit Log
              </button>
              <button className="w-full flex items-center gap-2 p-2 rounded-lg glass text-[10px] text-text-primary hover:bg-glass-medium transition-colors">
                <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                Request External Audit
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
