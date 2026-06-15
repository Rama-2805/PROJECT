"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { MOCK_RESEARCH_EXPERIMENTS, type ResearchExperiment } from "@/lib/mock/mlops";

export default function AIResearchPage() {
  const [experiments, setExperiments] = useState<ResearchExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState("all");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "compare" | "trends">("overview");

  useEffect(() => { setTimeout(() => { setExperiments(MOCK_RESEARCH_EXPERIMENTS); setLoading(false); }, 300); }, []);

  const filtered = modelFilter === "all" ? experiments : experiments.filter(e => e.modelType === modelFilter);

  const handleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const compareExperiments = experiments.filter(e => compareIds.includes(e.id));

  const avgAccuracy = filtered.length ? filtered.reduce((a, e) => a + (e.validationAccuracy || 0), 0) / filtered.length : 0;
  const bestModel = filtered.length ? filtered.reduce((best, e) => (e.f1Score > best.f1Score ? e : best), filtered[0]) : null;

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64"><div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading research data...</span></div></div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary">AI Research & Experiment Analysis</h2>
        <p className="text-xs text-text-muted">Compare models, analyze performance trends, and select the best AI configurations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Total Experiments</p><p className="text-xl font-bold text-text-primary">{experiments.length}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Avg Validation Accuracy</p><p className="text-xl font-bold text-ai-blue">{avgAccuracy > 0 ? avgAccuracy.toFixed(1) + "%" : "—"}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Best F1 Score</p><p className="text-xl font-bold text-success">{bestModel ? (bestModel.f1Score * 100).toFixed(1) + "%" : "—"}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Best Model</p><p className="text-sm font-bold text-ai-purple truncate">{bestModel?.name || "—"}</p></GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 mb-6 glass rounded-xl border border-glass-border w-fit">
        {[{ id: "overview" as const, label: "Experiments" }, { id: "compare" as const, label: "Compare" }, { id: "trends" as const, label: "Trends" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={cn(
            "px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all",
            activeTab === t.id ? "bg-ai-blue text-white" : "text-text-dim hover:text-text-primary",
          )}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Overview / Experiments */}
      {activeTab === "overview" && (
        <>
          <div className="flex gap-1 p-1 mb-4 glass rounded-lg border border-glass-border w-fit">
            {[{ id: "all", label: "All" }, { id: "FACE_RECOGNITION", label: "Face" }, { id: "BEHAVIOR", label: "Behavior" }, { id: "POSE", label: "Pose" }].map(f => (
              <button key={f.id} onClick={() => setModelFilter(f.id)} className={cn(
                "px-3 py-1 rounded-lg text-[9px] font-medium transition-all",
                modelFilter === f.id ? "bg-ai-blue text-white" : "text-text-dim hover:text-text-primary",
              )}>{f.label}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((exp, i) => (
              <motion.div key={exp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <GlassCard className={cn("transition-all", compareIds.includes(exp.id) ? "border-ai-blue/50 ring-1 ring-ai-blue/30" : "hover:border-ai-blue/20")}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xs font-semibold text-text-primary">{exp.name}</h3>
                      <span className="text-[9px] text-text-muted font-mono">{exp.modelType.replace("_", " ")} • Dataset v{exp.datasetVersion}</span>
                    </div>
                    <button
                      onClick={() => handleCompare(exp.id)}
                      className={cn(
                        "text-[9px] px-2 py-1 rounded-lg border transition-all",
                        compareIds.includes(exp.id)
                          ? "bg-ai-blue/10 text-ai-blue border-ai-blue/20"
                          : "text-text-muted border-glass-border hover:border-ai-blue/30",
                      )}
                    >
                      {compareIds.includes(exp.id) ? "✓ Selected" : "Compare"}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div className="p-1.5 rounded-lg glass text-center">
                      <p className={cn("text-[11px] font-bold tabular-nums", exp.validationAccuracy > 90 ? "text-success" : exp.validationAccuracy > 80 ? "text-warning" : "text-text-muted")}>
                        {exp.validationAccuracy > 0 ? `${exp.validationAccuracy}%` : "—"}
                      </p>
                      <p className="text-[7px] text-text-muted">Val Acc</p>
                    </div>
                    <div className="p-1.5 rounded-lg glass text-center">
                      <p className="text-[11px] font-bold text-ai-purple tabular-nums">{(exp.f1Score * 100).toFixed(1)}%</p>
                      <p className="text-[7px] text-text-muted">F1</p>
                    </div>
                    <div className="p-1.5 rounded-lg glass text-center">
                      <p className="text-[11px] font-bold text-ai-blue tabular-nums">{exp.avgLatency}ms</p>
                      <p className="text-[7px] text-text-muted">Latency</p>
                    </div>
                    <div className="p-1.5 rounded-lg glass text-center">
                      <p className="text-[11px] font-bold text-text-primary tabular-nums">{exp.trainingTimeHours}h</p>
                      <p className="text-[7px] text-text-muted">Train</p>
                    </div>
                  </div>

                  {exp.status === "RUNNING" && (
                    <div className="flex items-center gap-2 text-[10px] text-ai-blue">
                      <div className="h-2 w-2 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
                      In progress...
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Tab: Compare */}
      {activeTab === "compare" && (
        <div>
          {compareIds.length === 0 && (
            <GlassCard className="text-center py-12">
              <p className="text-sm text-text-muted mb-2">Select 2-3 experiments to compare</p>
              <p className="text-[10px] text-text-dim">Click "Compare" on any experiment card</p>
            </GlassCard>
          )}

          {compareExperiments.length >= 2 && (
            <div className="space-y-4">
              {/* Comparison Table */}
              <GlassCard>
                <h3 className="text-xs font-semibold text-text-primary mb-3">📊 Side-by-Side Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-glass-border">
                        <th className="text-left py-2 pr-4 text-text-muted font-medium">Metric</th>
                        {compareExperiments.map(e => <th key={e.id} className="text-center py-2 px-3 text-text-primary font-semibold">{e.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Validation Accuracy", values: compareExperiments.map(e => `${e.validationAccuracy}%`), bestIdx: compareExperiments.reduce((best, e, i) => e.validationAccuracy > (compareExperiments[best]?.validationAccuracy || 0) ? i : best, 0) },
                        { label: "F1 Score", values: compareExperiments.map(e => `${(e.f1Score * 100).toFixed(1)}%`), bestIdx: compareExperiments.reduce((best, e, i) => e.f1Score > (compareExperiments[best]?.f1Score || 0) ? i : best, 0) },
                        { label: "Precision", values: compareExperiments.map(e => `${(e.precision * 100).toFixed(1)}%`), bestIdx: compareExperiments.reduce((best, e, i) => e.precision > (compareExperiments[best]?.precision || 0) ? i : best, 0) },
                        { label: "Recall", values: compareExperiments.map(e => `${(e.recall * 100).toFixed(1)}%`), bestIdx: compareExperiments.reduce((best, e, i) => e.recall > (compareExperiments[best]?.recall || 0) ? i : best, 0) },
                        { label: "Avg Latency", values: compareExperiments.map(e => `${e.avgLatency}ms`), bestIdx: compareExperiments.reduce((best, e, i) => (e.avgLatency < (compareExperiments[best]?.avgLatency || Infinity)) ? i : best, 0) },
                        { label: "Training Time", values: compareExperiments.map(e => `${e.trainingTimeHours}h`), bestIdx: -1 },
                        { label: "Dataset Version", values: compareExperiments.map(e => `v${e.datasetVersion}`), bestIdx: -1 },
                      ].map((row, ri) => (
                        <tr key={ri} className="border-b border-glass-border/50 last:border-b-0">
                          <td className="py-2 pr-4 text-text-muted">{row.label}</td>
                          {row.values.map((v, vi) => (
                            <td key={vi} className={cn("text-center py-2 px-3", vi === row.bestIdx ? "text-success font-bold" : "text-text-primary")}>
                              {v} {vi === row.bestIdx && row.bestIdx >= 0 && <span className="text-[8px] text-success">★</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* Winner Highlight */}
              {(() => {
                const winner = compareExperiments.reduce((best, e) => e.f1Score > best.f1Score ? e : best, compareExperiments[0]);
                return (
                  <GlassCard className="border-success/30">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏆</span>
                      <div>
                        <p className="text-xs font-semibold text-text-primary">Recommended: {winner.name}</p>
                        <p className="text-[10px] text-text-muted">Best F1 Score: {(winner.f1Score * 100).toFixed(1)}% • Val Acc: {winner.validationAccuracy}%</p>
                      </div>
                    </div>
                  </GlassCard>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Tab: Trends */}
      {activeTab === "trends" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard>
            <h3 className="text-xs font-semibold text-text-primary mb-4">📈 Accuracy Trend by Model Type</h3>
            <div className="space-y-3">
              {["FACE_RECOGNITION", "BEHAVIOR", "POSE"].map(type => {
                const typeExps = experiments.filter(e => e.modelType === type && e.validationAccuracy > 0).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
                if (typeExps.length < 2) return null;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-text-primary font-medium">{type.replace("_", " ")}</span>
                      <span className="text-text-muted">{typeExps[0].validationAccuracy}% → {typeExps[typeExps.length - 1].validationAccuracy}%</span>
                    </div>
                    <div className="flex items-end gap-1 h-10">
                      {typeExps.map((e, ei) => (
                        <div key={ei} className="flex-1 flex flex-col items-center">
                          <div className={cn(
                            "w-full rounded-t-sm transition-all",
                            ei === typeExps.length - 1 ? "bg-gradient-to-t from-ai-blue to-ai-purple" : "bg-ai-blue/30",
                          )} style={{ height: `${(e.validationAccuracy / 100) * 100}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-xs font-semibold text-text-primary mb-4">⏱️ Latency Reduction Trend</h3>
            <div className="space-y-3">
              {["FACE_RECOGNITION", "BEHAVIOR", "POSE"].map(type => {
                const typeExps = experiments.filter(e => e.modelType === type && e.avgLatency > 0).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
                if (typeExps.length < 2) return null;
                const improvement = typeExps[0].avgLatency - typeExps[typeExps.length - 1].avgLatency;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-text-primary font-medium">{type.replace("_", " ")}</span>
                      <span className={cn("font-medium", improvement > 0 ? "text-success" : "text-warning")}>
                        {improvement > 0 ? `-${improvement}ms` : `+${Math.abs(improvement)}ms`}
                      </span>
                    </div>
                    <div className="flex items-end gap-1 h-8">
                      {typeExps.map((e, ei) => {
                        const maxLat = Math.max(...typeExps.map(x => x.avgLatency));
                        return (
                          <div key={ei} className="flex-1 flex flex-col items-center">
                            <div className="w-full rounded-t-sm bg-gradient-to-t from-success to-ai-blue transition-all"
                              style={{ height: `${((maxLat - e.avgLatency + 20) / (maxLat + 20)) * 100}%` }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Research Summary */}
          <GlassCard className="lg:col-span-2">
            <h3 className="text-xs font-semibold text-text-primary mb-3">📋 Research Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px]">
              <div className="p-2 rounded-lg glass">
                <p className="text-text-muted mb-1">Face Recognition Progress</p>
                <p className="text-text-primary">98.5% → 99.1% accuracy (+0.6pp)</p>
                <p className="text-text-muted text-[9px]">Latency reduced by 25ms (17% improvement)</p>
              </div>
              <div className="p-2 rounded-lg glass">
                <p className="text-text-muted mb-1">Behavior AI Progress</p>
                <p className="text-text-primary">91.2% → 94.5% accuracy (+3.3pp)</p>
                <p className="text-text-muted text-[9px]">F1 improved from 0.903 to 0.926</p>
              </div>
              <div className="p-2 rounded-lg glass">
                <p className="text-text-muted mb-1">Pose Classification Progress</p>
                <p className="text-text-primary">82.5% → 88.2% accuracy (+5.7pp)</p>
                <p className="text-text-muted text-[9px]">Latency reduced by 13ms (24% improvement)</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );
}
