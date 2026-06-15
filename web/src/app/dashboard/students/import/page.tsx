"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type ImportStep = "upload" | "preview" | "complete";

interface ImportRow {
  row: number;
  fullName: string;
  email: string;
  department: string;
  status: "valid" | "error";
  errors: string[];
}

export default function StudentImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [importResult, setImportResult] = useState<{ total: number; success: number; failed: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".xlsx"))) {
      setFile(f);
      // Simulate preview
      setPreviewRows([
        { row: 1, fullName: "Arjun Sharma", email: "arjun.sharma@university.edu", department: "Computer Science", status: "valid", errors: [] },
        { row: 2, fullName: "Priya Patel", email: "priya.patel@university.edu", department: "Electronics", status: "valid", errors: [] },
        { row: 3, fullName: "", email: "rohan@", department: "Mechanical", status: "error", errors: ["Name is required", "Invalid email format"] },
        { row: 4, fullName: "Sneha Verma", email: "sneha.verma@university.edu", department: "Civil", status: "valid", errors: [] },
        { row: 5, fullName: "Vikram Singh", email: "vikram.singh@university.edu", department: "Computer Science", status: "valid", errors: [] },
        { row: 6, fullName: "Ananya Gupta", email: "ananya.gupta@university.edu", department: "Biotechnology", status: "valid", errors: [] },
      ]);
      setStep("preview");
    }
  };

  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImportResult({
        total: previewRows.length,
        success: previewRows.filter((r) => r.status === "valid").length,
        failed: previewRows.filter((r) => r.status === "error").length,
        errors: previewRows.filter((r) => r.status === "error").map((r) => `Row ${r.row}: ${r.errors.join("; ")}`),
      });
      setImporting(false);
      setStep("complete");
    }, 2000);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { id: "upload" as const, label: "Upload File" },
            { id: "preview" as const, label: "Review Data" },
            { id: "complete" as const, label: "Completed" },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                step === s.id
                  ? "bg-ai-blue text-white"
                  : ["upload", "preview", "complete"].indexOf(step) >= i
                    ? "bg-success/10 text-success"
                    : "bg-glass-light text-text-muted",
              )}>
                <span className={cn(
                  "flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold",
                  step === s.id ? "bg-white/20" : "bg-current/20",
                )}>
                  {["upload", "preview", "complete"].indexOf(step) > i ? "✓" : i + 1}
                </span>
                {s.label}
              </div>
              {i < 2 && <div className={cn("h-px w-8", ["upload", "preview", "complete"].indexOf(step) > i ? "bg-success" : "bg-glass-border")} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <GlassCard>
                <h2 className="text-base font-semibold text-text-primary mb-2">Upload Student Data</h2>
                <p className="text-xs text-text-muted mb-6">Upload a CSV or Excel file containing student information. The file must include columns for student name, email, and department.</p>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                    dragOver
                      ? "border-ai-blue bg-ai-blue/5"
                      : "border-glass-border hover:border-ai-blue/40 hover:bg-glass-light",
                  )}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-ai-blue to-ai-purple flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-text-primary">Drop your file here, or <span className="text-ai-blue">browse</span></p>
                      <p className="text-[10px] text-text-muted mt-1">Supports CSV and Excel files (.csv, .xlsx)</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-glass-light border border-glass-border">
                  <h3 className="text-xs font-semibold text-text-primary mb-2">Required Format</h3>
                  <div className="text-[10px] text-text-muted space-y-1">
                    <p><span className="text-text-secondary">Columns:</span> fullName, email, department, phone (optional), rollNumber (optional)</p>
                    <p><span className="text-text-secondary">Max file size:</span> 10MB</p>
                    <p><span className="text-text-secondary">Max rows:</span> 10,000 per file</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">Review Data</h2>
                    <p className="text-xs text-text-muted">{previewRows.length} records found in {file?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                      {previewRows.filter((r) => r.status === "valid").length} valid
                    </span>
                    <span className="text-xs text-error bg-error/10 px-2 py-1 rounded-full">
                      {previewRows.filter((r) => r.status === "error").length} errors
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-glass-border">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-glass-light">
                        <th className="p-2.5 text-[10px] text-text-muted font-semibold uppercase text-left">#</th>
                        <th className="p-2.5 text-[10px] text-text-muted font-semibold uppercase text-left">Full Name</th>
                        <th className="p-2.5 text-[10px] text-text-muted font-semibold uppercase text-left">Email</th>
                        <th className="p-2.5 text-[10px] text-text-muted font-semibold uppercase text-left">Department</th>
                        <th className="p-2.5 text-[10px] text-text-muted font-semibold uppercase text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className={cn("border-t border-glass-border/50", row.status === "error" && "bg-error/5")}>
                          <td className="p-2.5 text-xs text-text-muted font-mono">{row.row}</td>
                          <td className={cn("p-2.5 text-xs", row.status === "error" && !row.fullName ? "text-error" : "text-text-primary")}>
                            {row.fullName || <span className="italic text-error">Missing</span>}
                          </td>
                          <td className={cn("p-2.5 text-xs", row.status === "error" && row.errors.some((e) => e.includes("email")) ? "text-error" : "text-text-secondary")}>
                            {row.email || <span className="italic text-error">Invalid</span>}
                          </td>
                          <td className="p-2.5 text-xs text-text-secondary">{row.department}</td>
                          <td className="p-2.5">
                            {row.status === "valid" ? (
                              <span className="text-[10px] text-success">✓ Ready</span>
                            ) : (
                              <div>
                                <span className="text-[10px] text-error">Error</span>
                                <div className="text-[9px] text-error/70 mt-0.5">{row.errors.join("; ")}</div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              <div className="flex items-center justify-between">
                <Button variant="secondary" onClick={() => { setStep("upload"); setFile(null); }}>
                  Back
                </Button>
                <Button onClick={handleImport} loading={importing}>
                  Import {previewRows.filter((r) => r.status === "valid").length} Students
                </Button>
              </div>
            </motion.div>
          )}

          {step === "complete" && importResult && (
            <motion.div key="complete" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
              <GlassCard>
                <div className="text-center py-8">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-success to-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary mb-2">Import Complete</h2>
                  <p className="text-xs text-text-muted mb-6">Your student data has been processed</p>

                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
                    <div className="glass rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-text-primary">{importResult.total}</p>
                      <p className="text-[10px] text-text-muted">Total</p>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-success">{importResult.success}</p>
                      <p className="text-[10px] text-text-muted">Success</p>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-error">{importResult.failed}</p>
                      <p className="text-[10px] text-text-muted">Failed</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="text-left p-4 rounded-xl bg-error/5 border border-error/20 mb-6">
                      <p className="text-xs font-medium text-error mb-2">Errors:</p>
                      <ul className="space-y-1">
                        {importResult.errors.map((err, i) => (
                          <li key={i} className="text-[10px] text-error/80">{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3">
                    <Button variant="secondary" onClick={() => { setStep("upload"); setFile(null); setImportResult(null); }}>
                      Import Another File
                    </Button>
                    <Button onClick={() => { window.location.href = "/dashboard/students"; }}>
                      View Students
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
