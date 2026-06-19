"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface ModelEvaluation {
  id: string;
  modelId: string;
  modelName: string;
  modelType: string;
  version: string;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  falsePositives: number;
  falseNegatives: number;
  avgLatency: number;
  p95Latency: number;
  robustnessScore: number;
  testSampleCount: number;
  datasetVersion: string;
  status: "PASSED" | "FAILED" | "WARNING";
  confusionMatrix: { matrix: number[][] };
  createdAt: Date;
}

const MOCK_EVALUATIONS: ModelEvaluation[] = [
  {
    id: "ev-1", modelId: "m-1", modelName: "ArcFace Face Recognizer", modelType: "FACE_RECOGNITION", version: "2.1.0",
    precision: 0.992, recall: 0.988, f1Score: 0.990, accuracy: 99.1,
    falsePositives: 12, falseNegatives: 8, avgLatency: 120, p95Latency: 185,
    robustnessScore: 0.95, testSampleCount: 2500, datasetVersion: "2.0.0",
    status: "PASSED", confusionMatrix: { matrix: [[490, 4], [3, 495]] },
    createdAt: new Date("2025-06-04"),
  },
  {
    id: "ev-2", modelId: "m-2", modelName: "YOLO Behavior Detector", modelType: "BEHAVIOR", version: "1.3.0",
    precision: 0.935, recall: 0.918, f1Score: 0.926, accuracy: 94.5,
    falsePositives: 45, falseNegatives: 32, avgLatency: 85, p95Latency: 130,
    robustnessScore: 0.88, testSampleCount: 4500, datasetVersion: "1.0.0",
    status: "PASSED", confusionMatrix: { matrix: [[900, 30], [25, 545]] },
    createdAt: new Date("2025-06-09"),
  },
  {
    id: "ev-3", modelId: "m-3", modelName: "Pose Classifier v2", modelType: "POSE", version: "2.0.0-beta",
    precision: 0.872, recall: 0.851, f1Score: 0.861, accuracy: 85.7,
    falsePositives: 78, falseNegatives: 55, avgLatency: 42, p95Latency: 68,
    robustnessScore: 0.76, testSampleCount: 1800, datasetVersion: "1.0.0",
    status: "WARNING", confusionMatrix: { matrix: [[420, 35], [28, 317]] },
    createdAt: new Date("2025-06-12"),
  },
  {
    id: "ev-4", modelId: "m-1", modelName: "ArcFace v1.0 Baseline", modelType: "FACE_RECOGNITION", version: "1.0.0",
    precision: 0.956, recall: 0.941, f1Score: 0.948, accuracy: 95.2,
    falsePositives: 38, falseNegatives: 22, avgLatency: 155, p95Latency: 220,
    robustnessScore: 0.82, testSampleCount: 2000, datasetVersion: "1.0.0",
    status: "PASSED", confusionMatrix: { matrix: [[470, 18], [12, 500]] },
    createdAt: new Date("2025-05-20"),
  },
  {
    id: "ev-5", modelId: "m-2", modelName: "YOLO Behavior v1.0", modelType: "BEHAVIOR", version: "1.0.0",
    precision: 0.891, recall: 0.872, f1Score: 0.881, accuracy: 88.7,
    falsePositives: 95, falseNegatives: 68, avgLatency: 110, p95Latency: 175,
    robustnessScore: 0.72, testSampleCount: 3000, datasetVersion: "0.5.0",
    status: "WARNING", confusionMatrix: { matrix: [[850, 55], [48, 547]] },
    createdAt: new Date("2025-04-25"),
  },
];

const MODEL_TYPE_COLORS: Record<string, string> = {
  FACE_RECOGNITION: "text-ai-blue border-ai-blue/20 bg-ai-blue/5",
  BEHAVIOR: "text-ai-purple border-ai-purple/20 bg-ai-purple/5",
  POSE: "text-success border-success/20 bg-success/5",
};

export default function AIEvaluationPage() {
  const [evaluations, setEvaluations] = useState<ModelEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEval, setSelectedEval] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => { setEvaluations(MOCK_EVALUATIONS); setLoading(false); }, 300); }, []);

  const filtered = evaluations.filter(e => {
    if (typeFilter !== "all" && e.modelType !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  const avgAccuracy = filtered.length ? filtered.reduce((a, e) => a + e.accuracy, 0) / filtered.length : 0;
  const avgF1 = filtered.length ? filtered.reduce((a, e) => a + e.f1Score, 0) / filtered.length : 0;
  const totalFalsePositives = filtered.reduce((a, e) => a + e.falsePositives, 0);
  const totalFalseNegatives = filtered.reduce((a, e) => a + e.falseNegatives, 0);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64"><div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading evaluations...</span></div></div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Automated Model Evaluation</h2>
        <p className="text-xs text-text-muted">Comprehensive testing of every model before deployment — precision, recall, latency, robustness</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Avg Accuracy</p>
          <p className={cn("text-xl font-bold tabular-nums", avgAccuracy > 95 ? "text-success" : avgAccuracy > 85 ? "text-warning" : "text-error")}>
            {avgAccuracy.toFixed(1)}%
          </p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Avg F1 Score</p>
          <p className={cn("text-xl font-bold tabular-nums", avgF1 > 0.95 ? "text-success" : avgF1 > 0.85 ? "text-warning" : "text-error")}>
            {(avgF1 * 100).toFixed(1)}%
          </p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Total False Positives</p>
          <p className="text-xl font-bold text-warning tabular-nums">{totalFalsePositives}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Total False Negatives</p>
          <p className="text-xl font-bold text-error tabular-nums">{totalFalseNegatives}</p>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-1 p-1 glass rounded-xl border border-glass-border">
          <span className="px-2 py-1 text-[9px] text-text-muted self-center">Type:</span>
          {[{ id: "all", label: "All" }, { id: "FACE_RECOGNITION", label: "Face" }, { id: "BEHAVIOR", label: "Behavior" }, { id: "POSE", label: "Pose" }].map(f => (
            <button key={f.id} onClick={() => setTypeFilter(f.id)} className={cn(
              "px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all",
              typeFilter === f.id ? "bg-ai-blue text-black font-semibold" : "text-text-dim hover:text-text-primary",
            )}>{f.label}</button>
          ))}
        </div>
        <div className="flex gap-1 p-1 glass rounded-xl border border-glass-border">
          <span className="px-2 py-1 text-[9px] text-text-muted self-center">Status:</span>
          {[{ id: "all", label: "All" }, { id: "PASSED", label: "✅ Passed" }, { id: "WARNING", label: "⚠️ Warning" }, { id: "FAILED", label: "❌ Failed" }].map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} className={cn(
              "px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all",
              statusFilter === f.id ? "bg-ai-blue text-black font-semibold" : "text-text-dim hover:text-text-primary",
            )}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Evaluation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((ev, i) => (
          <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard
              className={cn(
                "cursor-pointer transition-all",
                selectedEval === ev.id ? "border-ai-blue/40" : "hover:border-ai-blue/20",
                ev.status === "WARNING" ? "border-l-warning/30 border-l-2" : ev.status === "FAILED" ? "border-l-error/30 border-l-2" : "",
              )}
              onClick={() => setSelectedEval(selectedEval === ev.id ? null : ev.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold",
                    ev.status === "PASSED" ? "bg-success/10 text-success" : ev.status === "WARNING" ? "bg-warning/10 text-warning" : "bg-error/10 text-error",
                  )}>
                    {ev.status === "PASSED" ? "✓" : ev.status === "WARNING" ? "!" : "✗"}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{ev.modelName}</h3>
                    <span className="text-[9px] font-mono text-text-muted">v{ev.version} • {ev.modelType.replace("_", " ")}</span>
                  </div>
                </div>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                  ev.status === "PASSED" ? "bg-success/10 text-success border-success/20" : ev.status === "WARNING" ? "bg-warning/10 text-warning border-warning/20" : "bg-error/10 text-error border-error/20",
                )}>{ev.status}</span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="p-2 rounded-lg glass text-center">
                  <p className={cn("text-xs font-bold tabular-nums", ev.accuracy > 95 ? "text-success" : ev.accuracy > 85 ? "text-warning" : "text-error")}>{ev.accuracy}%</p>
                  <p className="text-[8px] text-text-muted">Accuracy</p>
                </div>
                <div className="p-2 rounded-lg glass text-center">
                  <p className="text-xs font-bold text-ai-purple tabular-nums">{(ev.f1Score * 100).toFixed(1)}%</p>
                  <p className="text-[8px] text-text-muted">F1 Score</p>
                </div>
                <div className="p-2 rounded-lg glass text-center">
                  <p className="text-xs font-bold text-ai-blue tabular-nums">{ev.avgLatency}ms</p>
                  <p className="text-[8px] text-text-muted">Avg Latency</p>
                </div>
                <div className="p-2 rounded-lg glass text-center">
                  <p className={cn("text-xs font-bold tabular-nums", ev.robustnessScore > 0.85 ? "text-success" : "text-warning")}>{(ev.robustnessScore * 100).toFixed(0)}%</p>
                  <p className="text-[8px] text-text-muted">Robustness</p>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {selectedEval === ev.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="border-t border-glass-border pt-3 mt-2 space-y-3">
                      {/* Detailed Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2 rounded-lg glass">
                          <p className="text-[8px] text-text-muted">Precision</p>
                          <p className={cn("text-[11px] font-bold", ev.precision > 0.95 ? "text-success" : ev.precision > 0.85 ? "text-warning" : "text-error")}>{(ev.precision * 100).toFixed(1)}%</p>
                        </div>
                        <div className="p-2 rounded-lg glass">
                          <p className="text-[8px] text-text-muted">Recall</p>
                          <p className={cn("text-[11px] font-bold", ev.recall > 0.95 ? "text-success" : ev.recall > 0.85 ? "text-warning" : "text-error")}>{(ev.recall * 100).toFixed(1)}%</p>
                        </div>
                        <div className="p-2 rounded-lg glass">
                          <p className="text-[8px] text-text-muted">False Positives</p>
                          <p className="text-[11px] font-bold text-warning">{ev.falsePositives}</p>
                        </div>
                        <div className="p-2 rounded-lg glass">
                          <p className="text-[8px] text-text-muted">False Negatives</p>
                          <p className="text-[11px] font-bold text-error">{ev.falseNegatives}</p>
                        </div>
                      </div>

                      {/* Confusion Matrix */}
                      {ev.confusionMatrix && (
                        <div>
                          <p className="text-[9px] text-text-muted mb-1.5 uppercase tracking-wider">Confusion Matrix</p>
                          <div className="grid gap-px w-fit mx-auto">
                            {ev.confusionMatrix.matrix.map((row, ri) => (
                              <div key={ri} className="flex gap-px">
                                {row.map((val, ci) => {
                                  const maxVal = Math.max(...ev.confusionMatrix.matrix.flat());
                                  const intensity = val / maxVal;
                                  return (
                                    <div
                                      key={ci}
                                      className={cn(
                                        "h-8 w-10 flex items-center justify-center text-[9px] font-bold",
                                        ri === ci ? "bg-success/20 text-success" : "bg-error/10 text-error/60",
                                      )}
                                      style={{ opacity: 0.3 + intensity * 0.7 }}
                                    >
                                      {val}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-center gap-4 mt-1 text-[8px] text-text-muted">
                            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-success/40" /> Correct</span>
                            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-error/40" /> Incorrect</span>
                          </div>
                        </div>
                      )}

                      {/* Latency Distribution */}
                      <div>
                        <p className="text-[9px] text-text-muted mb-1.5 uppercase tracking-wider">Latency Distribution</p>
                        <div className="flex items-end gap-1 h-8">
                          {[ev.avgLatency * 0.5, ev.avgLatency * 0.8, ev.avgLatency, ev.avgLatency * 1.2, ev.p95Latency, ev.p95Latency * 1.3].map((lat, li) => (
                            <div key={li} className="flex-1 flex flex-col items-center">
                              <div className={cn(
                                "w-full rounded-t-sm transition-all",
                                lat <= ev.avgLatency ? "bg-success" : lat <= ev.p95Latency ? "bg-warning" : "bg-error",
                              )} style={{ height: `${(lat / (ev.p95Latency * 1.5)) * 100}%` }} />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-[7px] text-text-muted mt-0.5">
                          <span>p50</span><span>p80</span><span>avg</span><span>p90</span><span>p95</span><span>p99</span>
                        </div>
                      </div>

                      {/* Test Info */}
                      <div className="flex items-center justify-between text-[10px] text-text-muted">
                        <span>Test samples: <span className="text-text-primary font-medium">{ev.testSampleCount.toLocaleString()}</span></span>
                        <span>Dataset: v{ev.datasetVersion}</span>
                        <span>{ev.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </>
  );
}
