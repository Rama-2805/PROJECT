"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getReportHistory, generateReport, type Report } from "@/lib/mock/reports";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  ATTENDANCE: "text-ai-blue bg-ai-blue/10 border-ai-blue/30",
  BEHAVIOR: "text-warning bg-warning/10 border-warning/30",
  STUDENT_PERFORMANCE: "text-ai-purple bg-ai-purple/10 border-ai-purple/30",
  DEVICE_HEALTH: "text-ai-cyan bg-ai-cyan/10 border-ai-cyan/30",
  INSTITUTION_SUMMARY: "text-success bg-success/10 border-success/30",
};

const FORMAT_BADGES: Record<string, string> = {
  PDF: "text-error bg-error/10 border-error/30",
  CSV: "text-success bg-success/10 border-success/30",
  EXCEL: "text-ai-blue bg-ai-blue/10 border-ai-blue/30",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "generate">("history");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [generating, setGenerating] = useState(false);
  const [genFeedback, setGenFeedback] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("ATTENDANCE");
  const [formFormat, setFormFormat] = useState("PDF");

  useEffect(() => {
    getReportHistory().then(setReports).finally(() => setLoading(false));
  }, []);

  const filtered = typeFilter === "ALL" ? reports : reports.filter((r) => r.type === typeFilter);

  const handleGenerate = async () => {
    if (!formTitle.trim()) return;
    setGenerating(true);
    setGenFeedback(null);
    try {
      const newReport = await generateReport(formTitle, formType, formFormat);
      setReports((prev) => [newReport, ...prev]);
      setGenFeedback(`Report "${formTitle}" generated successfully!`);
      setFormTitle("");
      setActiveTab("history");
    } catch {
      setGenFeedback("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
      setTimeout(() => setGenFeedback(null), 5000);
    }
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

  const tabs = [
    { key: "history" as const, label: "Report History" },
    { key: "generate" as const, label: "Generate Report" },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Reports Center</h2>
          <p className="text-xs text-text-muted">Generate, schedule, and download institution intelligence reports</p>
        </div>
        <Button size="sm" onClick={() => setActiveTab("generate")}>+ New Report</Button>
      </div>

      {/* Feedback */}
      {genFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mb-4 px-3 py-2 rounded-lg border text-xs",
            genFeedback.includes("successfully") ? "bg-success/10 border-success/30 text-success" : "bg-error/10 border-error/30 text-error",
          )}
        >
          {genFeedback}
        </motion.div>
      )}

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

      {/* ──────── GENERATE ──────── */}
      {activeTab === "generate" && (
        <motion.div {...fadeUp} key="generate" className="max-w-2xl">
          <GlassCard>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Generate New Report</h3>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Report Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Monthly Attendance Report - June 2026"
                  className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-ai-blue/50 transition-colors"
                />
              </div>

              {/* Type & Format */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Report Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-ai-blue/50 transition-colors"
                  >
                    <option value="ATTENDANCE">Attendance Report</option>
                    <option value="BEHAVIOR">Behavior Report</option>
                    <option value="STUDENT_PERFORMANCE">Student Performance Report</option>
                    <option value="DEVICE_HEALTH">Device Health Report</option>
                    <option value="INSTITUTION_SUMMARY">Institution Summary</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Export Format</label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-ai-blue/50 transition-colors"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="CSV">CSV Spreadsheet</option>
                    <option value="EXCEL">Excel Spreadsheet</option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1.5 block">From Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-ai-blue/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1.5 block">To Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-ai-blue/50 transition-colors"
                  />
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!formTitle.trim() || generating}
                >
                  {generating ? "Generating..." : "Generate Report"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setFormTitle("");
                    setFormType("ATTENDANCE");
                    setFormFormat("PDF");
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ──────── HISTORY ──────── */}
      {activeTab === "history" && (
        <motion.div {...fadeUp} key="history">
          {/* Type Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-glass-light border border-glass-border mb-4 w-fit">
            {["ALL", "ATTENDANCE", "BEHAVIOR", "STUDENT_PERFORMANCE", "DEVICE_HEALTH", "INSTITUTION_SUMMARY"].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "px-2 py-1 rounded-md text-[9px] font-medium transition-all",
                  typeFilter === type
                    ? "bg-ai-blue/20 text-ai-blue border border-ai-blue/20"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                {type === "ALL" ? "All Reports" : type.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Report List */}
          <GlassCard>
            <div className="space-y-2">
              {filtered.map((report, i) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-glass-light/20 transition-colors border border-transparent hover:border-glass-border"
                >
                  {/* Type Icon */}
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold border",
                    REPORT_TYPE_COLORS[report.type] || "text-text-muted bg-glass-light border-glass-border",
                  )}>
                    {report.type === "ATTENDANCE" ? "A" : report.type === "BEHAVIOR" ? "B" : report.type === "STUDENT_PERFORMANCE" ? "S" : report.type === "DEVICE_HEALTH" ? "D" : "I"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{report.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("inline-flex px-1 py-0.5 rounded text-[8px] font-medium border",
                        FORMAT_BADGES[report.format] || "text-text-muted bg-glass-light border-glass-border",
                      )}>{report.format}</span>
                      <span className="text-[9px] text-text-muted">by {report.generatedBy}</span>
                      <span className="text-[9px] text-text-muted">·</span>
                      <span className="text-[9px] text-text-muted">{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Status / Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {report.status === "GENERATING" && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10 border border-warning/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                        <span className="text-[9px] font-medium text-warning">Generating...</span>
                      </div>
                    )}
                    {report.status === "COMPLETED" && (
                      <>
                        {report.fileSize && <span className="text-[9px] text-text-muted">{report.fileSize}</span>}
                        <Button size="sm" variant="secondary">Download</Button>
                      </>
                    )}
                    {report.status === "FAILED" && (
                      <span className="text-[9px] font-medium text-error">Failed</span>
                    )}
                  </div>
                </motion.div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-text-muted">No reports found</p>
                  <p className="text-[10px] text-text-dim mt-1">Try a different filter or generate a new report</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </>
  );
}
