"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { MOCK_FEEDBACK, type FeedbackItem } from "@/lib/mock/mlops";

const FEEDBACK_TYPES = ["all", "WRONG_RECOGNITION", "FALSE_POSITIVE", "FALSE_NEGATIVE", "BEHAVIOR_MISTAKE", "ACCURACY_ISSUE", "GENERAL"];
const FEEDBACK_LABELS: Record<string, string> = {
  all: "All Feedback", WRONG_RECOGNITION: "Wrong Recognition", FALSE_POSITIVE: "False Positive",
  FALSE_NEGATIVE: "False Negative", BEHAVIOR_MISTAKE: "Behavior Mistake", ACCURACY_ISSUE: "Accuracy Issue", GENERAL: "General",
};

const SEVERITY_COLORS: Record<string, string> = {
  MINOR: "bg-ai-blue/10 text-ai-blue border-ai-blue/20",
  MAJOR: "bg-warning/10 text-warning border-warning/20",
  CRITICAL: "bg-error/10 text-error border-error/20",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-warning/10 text-warning border-warning/20",
  ACKNOWLEDGED: "bg-ai-blue/10 text-ai-blue border-ai-blue/20",
  RESOLVED: "bg-success/10 text-success border-success/20",
  DISMISSED: "bg-text-muted/10 text-text-muted border-glass-border",
};

export default function AIFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => { setTimeout(() => { setFeedback(MOCK_FEEDBACK); setLoading(false); }, 300); }, []);

  const filtered = feedback.filter(f => {
    if (typeFilter !== "all" && f.feedbackType !== typeFilter) return false;
    if (!showResolved && f.status === "RESOLVED") return false;
    return true;
  });

  const openCount = feedback.filter(f => f.status === "OPEN").length;
  const usedForTraining = feedback.filter(f => f.usedForTraining).length;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Feedback Learning System</h2>
          <p className="text-xs text-text-muted">Teacher corrections used to improve AI model accuracy</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-[9px] text-text-muted">Show resolved</span>
            <input type="checkbox" checked={showResolved} onChange={() => setShowResolved(!showResolved)} className="w-3 h-3 rounded" />
          </label>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>+ New Feedback</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Total Feedback</p><p className="text-xl font-bold text-text-primary">{feedback.length}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Open Items</p><p className="text-xl font-bold text-warning">{openCount}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Used for Training</p><p className="text-xl font-bold text-success">{usedForTraining}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Resolution Rate</p><p className="text-xl font-bold text-ai-blue">{feedback.length ? Math.round((feedback.filter(f => f.status === "RESOLVED").length / feedback.length) * 100) : 0}%</p></GlassCard>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-1 p-1 mb-6 glass rounded-xl border border-glass-border w-fit">
        {FEEDBACK_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={cn(
            "px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all whitespace-nowrap",
            typeFilter === t ? "bg-ai-blue text-white" : "text-text-dim hover:text-text-primary",
          )}>{FEEDBACK_LABELS[t]}</button>
        ))}
      </div>

      {/* New Feedback Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Submit New Feedback</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1 block">Feedback Type</label>
                  <select className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary focus:outline-none focus:border-ai-blue/50">
                    <option>WRONG_RECOGNITION</option><option>FALSE_POSITIVE</option><option>FALSE_NEGATIVE</option>
                    <option>BEHAVIOR_MISTAKE</option><option>ACCURACY_ISSUE</option><option>GENERAL</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1 block">Severity</label>
                  <select className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary focus:outline-none focus:border-ai-blue/50">
                    <option>MINOR</option><option>MAJOR</option><option>CRITICAL</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-medium text-text-muted mb-1 block">Description</label>
                  <textarea className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-ai-blue/50 resize-none h-20" placeholder="Describe what the AI got wrong..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm">Submit Feedback</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback List */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading feedback...</span></div></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard className="hover:border-ai-blue/20 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold",
                      item.severity === "CRITICAL" ? "bg-error/10 text-error" : item.severity === "MAJOR" ? "bg-warning/10 text-warning" : "bg-ai-blue/10 text-ai-blue",
                    )}>
                      {item.feedbackType === "WRONG_RECOGNITION" ? "WR" : item.feedbackType === "FALSE_POSITIVE" ? "FP" : item.feedbackType === "FALSE_NEGATIVE" ? "FN" : item.feedbackType === "BEHAVIOR_MISTAKE" ? "BM" : "AI"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-text-primary">{FEEDBACK_LABELS[item.feedbackType]}</span>
                        <span className={cn("text-[8px] px-1 py-0.5 rounded-full border font-medium", SEVERITY_COLORS[item.severity])}>{item.severity}</span>
                      </div>
                      <p className="text-[10px] text-text-muted">{item.id} • {item.createdAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0", STATUS_COLORS[item.status])}>{item.status}</span>
                </div>

                <p className="text-[11px] text-text-secondary mb-2">{item.description}</p>

                {/* Original vs Corrected */}
                {(!!item.originalResult || !!item.correctedValue) && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {!!item.originalResult && (
                      <div className="p-2 rounded-lg glass border border-error/20">
                        <p className="text-[8px] font-medium text-error uppercase tracking-wider mb-0.5">AI Result</p>
                        <pre className="text-[9px] text-text-secondary font-mono">{JSON.stringify(item.originalResult, null, 1)}</pre>
                      </div>
                    )}
                    {!!item.correctedValue && (
                      <div className="p-2 rounded-lg glass border border-success/20">
                        <p className="text-[8px] font-medium text-success uppercase tracking-wider mb-0.5">Corrected</p>
                        <pre className="text-[9px] text-text-secondary font-mono">{JSON.stringify(item.correctedValue, null, 1)}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Training Status & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-glass-border">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                      item.usedForTraining ? "bg-success/10 text-success border border-success/20" : "bg-text-muted/10 text-text-muted border border-glass-border",
                    )}>
                      {item.usedForTraining ? "✓ Used in Training" : "○ Not in Training"}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {item.status === "OPEN" && (
                      <>
                        <button className="text-[9px] px-2 py-1 rounded-lg bg-ai-blue/10 text-ai-blue hover:bg-ai-blue/20 transition-colors">Acknowledge</button>
                        <button className="text-[9px] px-2 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">Resolve</button>
                      </>
                    )}
                    {item.status === "ACKNOWLEDGED" && (
                      <button className="text-[9px] px-2 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">Mark Resolved</button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
