"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { MOCK_ANNOTATIONS, type Annotation } from "@/lib/mock/mlops";

const ANNOTATION_TYPES = [
  { id: "all", label: "All Annotations" },
  { id: "FACE_LANDMARK", label: "Face Landmarks" },
  { id: "BEHAVIOR_LABEL", label: "Behavior Labels" },
  { id: "OBJECT_LABEL", label: "Object Labels" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/20",
  REVIEWED: "bg-ai-blue/10 text-ai-blue border-ai-blue/20",
  APPROVED: "bg-success/10 text-success border-success/20",
  REJECTED: "bg-error/10 text-error border-error/20",
};

export default function AIAnnotationsPage() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [roleView, setRoleView] = useState<"annotator" | "reviewer">("annotator");

  useEffect(() => { setTimeout(() => { setAnnotations(MOCK_ANNOTATIONS); setLoading(false); }, 300); }, []);

  const filtered = activeFilter === "all" ? annotations : annotations.filter(a => a.annotationType === activeFilter);
  const pendingCount = annotations.filter(a => a.status === "PENDING").length;
  const approvedCount = annotations.filter(a => a.status === "APPROVED").length;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Data Annotation Workflow</h2>
          <p className="text-xs text-text-muted">Annotate, review, and validate training data for AI models</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-0.5 glass rounded-lg border border-glass-border">
            {["annotator", "reviewer"].map(r => (
              <button key={r} onClick={() => setRoleView(r as any)} className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-all",
                roleView === r ? "bg-ai-blue text-black font-semibold" : "text-text-dim hover:text-text-primary",
              )}>{r}</button>
            ))}
          </div>
          <Button size="sm"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>New Annotation</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Total</p><p className="text-xl font-bold text-text-primary tabular-nums">{annotations.length}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Pending Review</p><p className="text-xl font-bold text-warning tabular-nums">{pendingCount}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Approved</p><p className="text-xl font-bold text-success tabular-nums">{approvedCount}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Avg Confidence</p><p className="text-xl font-bold text-ai-blue tabular-nums">{annotations.length ? (annotations.reduce((a, an) => a + an.confidence, 0) / annotations.length * 100).toFixed(0) : 0}%</p></GlassCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 mb-6 glass rounded-xl border border-glass-border w-fit">
        {ANNOTATION_TYPES.map(f => (
          <button key={f.id} onClick={() => setActiveFilter(f.id)} className={cn(
            "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all",
            activeFilter === f.id ? "bg-ai-blue text-black font-semibold" : "text-text-dim hover:text-text-primary",
          )}>{f.label}</button>
        ))}
      </div>

      {/* Annotation Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading annotations...</span></div></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((ann, i) => (
            <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard className="group hover:border-ai-blue/30 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold",
                      ann.annotationType === "FACE_LANDMARK" ? "bg-ai-blue/10 text-ai-blue" :
                      ann.annotationType === "BEHAVIOR_LABEL" ? "bg-ai-purple/10 text-ai-purple" :
                      "bg-success/10 text-success",
                    )}>
                      {ann.annotationType === "FACE_LANDMARK" ? "👤" : ann.annotationType === "BEHAVIOR_LABEL" ? "🧠" : "🏷️"}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{ann.label}</p>
                      <span className="text-[9px] text-text-muted font-mono">{ann.id} • {ann.sourceType === "IMAGE" ? "📷 Image" : "🎥 Video Frame"}</span>
                    </div>
                  </div>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0", STATUS_COLORS[ann.status])}>{ann.status}</span>
                </div>

                {/* Bounding Box Visualizer */}
                {ann.boundingBox && (
                  <div className="mb-2 p-3 rounded-lg glass bg-gradient-to-br from-bg-secondary to-bg-primary">
                    <div className="relative w-full h-24 rounded-lg overflow-hidden bg-glass-light">
                      <div className="absolute border-2 border-ai-blue/60 bg-ai-blue/5 rounded-md flex items-center justify-center"
                        style={{ left: `${ann.boundingBox.x / 5}%`, top: `${ann.boundingBox.y / 5}%`, width: `${ann.boundingBox.w / 5}%`, height: `${ann.boundingBox.h / 5}%` }}>
                        <span className="text-[8px] text-ai-blue font-bold">{ann.label.split(" - ")[0]}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center p-1.5 rounded-lg glass">
                    <p className="text-[9px] text-text-muted">Type</p>
                    <p className="text-[9px] font-medium text-text-primary">{ann.annotationType.replace("_", " ")}</p>
                  </div>
                  <div className="text-center p-1.5 rounded-lg glass">
                    <p className="text-[9px] text-text-muted">Confidence</p>
                    <p className={cn("text-[9px] font-bold", ann.confidence > 0.9 ? "text-success" : ann.confidence > 0.8 ? "text-warning" : "text-error")}>
                      {(ann.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-center p-1.5 rounded-lg glass">
                    <p className="text-[9px] text-text-muted">By</p>
                    <p className="text-[9px] font-medium text-text-primary truncate">{ann.annotatedById}</p>
                  </div>
                </div>

                {/* Review Notes */}
                {ann.reviewNotes && (
                  <div className="p-2 rounded-lg glass border border-glass-border text-[10px] text-text-secondary">
                    <span className="font-medium text-text-primary">Review notes: </span>{ann.reviewNotes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-2 border-t border-glass-border">
                  {roleView === "reviewer" && ann.status === "PENDING" && (
                    <>
                      <Button size="sm" variant="primary" className="text-[10px]"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Approve</Button>
                      <Button size="sm" variant="secondary" className="text-[10px] text-error"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Reject</Button>
                    </>
                  )}
                  {roleView === "annotator" && ann.status !== "APPROVED" && (
                    <Button size="sm" variant="secondary" className="text-[10px]"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>Edit</Button>
                  )}
                  <button className="ml-auto text-[10px] text-text-muted hover:text-text-primary transition-colors"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg></button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
