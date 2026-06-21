"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { isDemoMode } from "@/lib/demo-mode";
import { api } from "@/lib/api/client";
import { getReportHistory, generateReport, type Report } from "@/lib/mock/reports";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  const [activeTab, setActiveTab] = useState<"history" | "generate" | "studentCard" | "teacherView">("history");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [generating, setGenerating] = useState(false);
  const [genFeedback, setGenFeedback] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("ATTENDANCE");
  const [formFormat, setFormFormat] = useState("PDF");

  // Student Report Card State
  const [studentSearch, setStudentSearch] = useState("CSE2026002");
  const [studentCard, setStudentCard] = useState<any>(null);

  // Teacher View State
  const [selectedClass, setSelectedClass] = useState("CSE-A");

  useEffect(() => {
    if (isDemoMode()) {
      getReportHistory().then(setReports).finally(() => setLoading(false));
    } else {
      api.get<any>("/reports/history").then((res) => {
        if (res.success && res.data?.reports) {
          setReports(res.data.reports);
        } else {
          getReportHistory().then(setReports);
        }
      }).catch(() => {
        getReportHistory().then(setReports);
      }).finally(() => setLoading(false));
    }
  }, []);

  // Sync Student Report Card details
  useEffect(() => {
    if (!studentSearch.trim()) return;
    
    // Fallback Mock Cards
    const mockStudentDatabase: Record<string, any> = {
      "CSE2026001": {
        name: "Manish Bose", usn: "CSE2026001", dept: "Computer Science", attendance: 58.4,
        status: "DEGRADED (Optimization Needed)", profileVersion: "v1.0 (Initial)", warnings: "CRITICAL: Attendance below 75%",
        subjects: [
          { code: "CS51", name: "Data Structures & Algos", rate: 58, present: 18, total: 31 },
          { code: "CS52", name: "Operating Systems", rate: 60, present: 18, total: 30 },
          { code: "CS53", name: "Discrete Mathematics", rate: 57, present: 17, total: 30 },
        ],
        trends: [{ month: "Feb", rate: 65 }, { month: "Mar", rate: 62 }, { month: "Apr", rate: 60 }, { month: "May", rate: 58 }],
      },
      "CSE2026002": {
        name: "Siddharth Saxena", usn: "CSE2026002", dept: "Computer Science", attendance: 97.5,
        status: "OPTIMIZED", profileVersion: "v2.1 (Centroid updated)", warnings: "None",
        subjects: [
          { code: "CS51", name: "Data Structures & Algos", rate: 98, present: 30, total: 31 },
          { code: "CS52", name: "Operating Systems", rate: 96, present: 29, total: 30 },
          { code: "CS53", name: "Discrete Mathematics", rate: 98, present: 29, total: 30 },
        ],
        trends: [{ month: "Feb", rate: 95 }, { month: "Mar", rate: 96 }, { month: "Apr", rate: 97 }, { month: "May", rate: 97.5 }],
      },
      "CSE2026003": {
        name: "Karan Nair", usn: "CSE2026003", dept: "Computer Science", attendance: 42.1,
        status: "UNRESOLVED CLUSTER", profileVersion: "v1.0", warnings: "CRITICAL: Low attendance & verification warnings",
        subjects: [
          { code: "CS51", name: "Data Structures & Algos", rate: 42, present: 13, total: 31 },
          { code: "CS52", name: "Operating Systems", rate: 43, present: 13, total: 30 },
          { code: "CS53", name: "Discrete Mathematics", rate: 41, present: 12, total: 30 },
        ],
        trends: [{ month: "Feb", rate: 50 }, { month: "Mar", rate: 46 }, { month: "Apr", rate: 43 }, { month: "May", rate: 42.1 }],
      }
    };

    const target = mockStudentDatabase[studentSearch.trim().toUpperCase()] || mockStudentDatabase["CSE2026002"];
    setStudentCard(target);
  }, [studentSearch]);

  const filtered = typeFilter === "ALL" ? reports : reports.filter((r) => r.type === typeFilter);

  const handleGenerate = async () => {
    if (!formTitle.trim()) return;
    setGenerating(true);
    setGenFeedback(null);
    try {
      if (isDemoMode()) {
        const newReport = await generateReport(formTitle, formType, formFormat);
        setReports((prev) => [newReport, ...prev]);
        setGenFeedback(`Report "${formTitle}" generated successfully!`);
        setFormTitle("");
        setActiveTab("history");
      } else {
        const res = await api.post<any>("/reports/generate", {
          title: formTitle,
          type: formType,
          format: formFormat,
          parameters: {},
        });
        if (res.success && res.data) {
          const mappedReport: Report = {
            id: res.data.id,
            title: res.data.title,
            type: res.data.type,
            format: res.data.format,
            createdAt: res.data.createdAt,
            generatedBy: "System Gateway",
            status: "COMPLETED",
            fileSize: "284 KB",
          };
          setReports((prev) => [mappedReport, ...prev]);
          setGenFeedback(`Report "${formTitle}" generated successfully!`);
          setFormTitle("");
          setActiveTab("history");
        }
      }
    } catch {
      setGenFeedback("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
      setTimeout(() => setGenFeedback(null), 5000);
    }
  };

  // Client-side CSV download
  const handleCSVDownload = (reportTitle: string) => {
    const headers = ["Classroom", "Student ID", "Full Name", "Attendance Status", "Confidence"];
    const rows = [
      ["CSE Lab 301", "CSE2026002", "Siddharth Saxena", "PRESENT", "98%"],
      ["CSE Lab 301", "CSE2026008", "Shreya Agarwal", "PRESENT", "94%"],
      ["CSE Lab 301", "CSE2026003", "Karan Nair", "ABSENT", "0%"],
      ["CSE Lab 301", "CSE2026001", "Manish Bose", "LATE", "72%"]
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportTitle.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: "history" as const, label: "Reports Archive" },
    { key: "generate" as const, label: "Document Exporter" },
    { key: "studentCard" as const, label: "Student Report Cards" },
    { key: "teacherView" as const, label: "Teacher Reports" },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Reports Center</h2>
          <p className="text-xs text-text-muted">Export documents, lookup student performance, and view classroom charts</p>
        </div>
        <Button size="sm" onClick={() => setActiveTab("generate")}>+ New Report Template</Button>
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
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-glass-light border border-glass-border mb-6 w-fit">
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
            <h3 className="text-sm font-semibold text-text-primary mb-4">Export AI Telemetry Report</h3>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Report Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Daily Attendance Ledger - CSE Dept"
                  className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none"
                />
              </div>

              {/* Type & Format */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Report Category</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
                  >
                    <option value="ATTENDANCE">Daily/Weekly Attendance Reports</option>
                    <option value="BEHAVIOR">Teacher Classroom Summaries</option>
                    <option value="STUDENT_PERFORMANCE">Recognition Success audits</option>
                    <option value="DEVICE_HEALTH">System Diagnostics Log</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Export Format</label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
                  >
                    <option value="PDF">PDF printable document</option>
                    <option value="CSV">CSV Comma Separated spreadsheet</option>
                    <option value="EXCEL">Excel XLS spreadsheet</option>
                  </select>
                </div>
              </div>

              {/* Generate Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!formTitle.trim() || generating}
                >
                  {generating ? "Exporting..." : "Compile & Download"}
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
                  Clear Fields
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ──────── HISTORY ──────── */}
      {activeTab === "history" && (
        <motion.div {...fadeUp} key="history">
          {/* Filter badges */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-glass-light border border-glass-border mb-4 w-fit">
            {["ALL", "ATTENDANCE", "BEHAVIOR", "STUDENT_PERFORMANCE", "DEVICE_HEALTH"].map((type) => (
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
                {type === "ALL" ? "All Archives" : type.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <GlassCard>
            <div className="space-y-2">
              {filtered.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-glass-border bg-glass-light hover:bg-glass-medium transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      "px-2 py-1 rounded text-[8px] font-bold border",
                      REPORT_TYPE_COLORS[report.type] || "border-glass-border bg-glass-light text-text-muted"
                    )}>
                      {report.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{report.title}</p>
                      <p className="text-[9px] text-text-muted">Generated by {report.generatedBy} • {new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded border",
                      FORMAT_BADGES[report.format] || "border-glass-border bg-glass-light text-text-muted"
                    )}>{report.format}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCSVDownload(report.title)}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ──────── STUDENT REPORT CARD ──────── */}
      {activeTab === "studentCard" && (
        <motion.div {...fadeUp} key="studentCard" className="space-y-6">
          <GlassCard className="p-4" subtle>
            <div className="flex items-center gap-3 max-w-md">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Enter Student USN (e.g. CSE2026002)"
                className="flex-1 px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
              />
              <Button size="sm" onClick={() => setStudentSearch(studentSearch)}>Fetch Card</Button>
            </div>
          </GlassCard>

          {studentCard && (
            <GlassCard className="space-y-6" id="printable-report-card">
              {/* Header card info */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-glass-border pb-4 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-text-primary font-mono tracking-wider">STUDENT REPORT CARD</h3>
                  <p className="text-lg font-bold text-ai-cyan mt-1">{studentCard.name}</p>
                  <p className="text-xs text-text-muted">USN: {studentCard.usn} • {studentCard.dept} Department</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-text-muted">Overall Attendance:</p>
                  <p className={cn("text-2xl font-bold font-mono mt-0.5", studentCard.attendance >= 75 ? "text-success" : "text-error")}>
                    {studentCard.attendance}%
                  </p>
                </div>
              </div>

              {/* Middle metrics grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <GlassCard subtle>
                  <p className="text-[10px] text-text-muted">Face Profile Status</p>
                  <p className="text-xs font-semibold text-text-primary mt-1">{studentCard.status}</p>
                  <span className="text-[9px] text-text-dim">Version: {studentCard.profileVersion}</span>
                </GlassCard>
                <GlassCard subtle>
                  <p className="text-[10px] text-text-muted">System Warnings</p>
                  <p className={cn("text-xs font-semibold mt-1", studentCard.warnings.includes("CRITICAL") ? "text-error" : "text-text-muted")}>
                    {studentCard.warnings}
                  </p>
                </GlassCard>
                <GlassCard subtle>
                  <p className="text-[10px] text-text-muted">Recognition Audit</p>
                  <p className="text-xs font-semibold text-success mt-1">VERIFIED ACCURATE</p>
                  <span className="text-[9px] text-text-dim">Last validation: Just now</span>
                </GlassCard>
              </div>

              {/* Table breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">Subject Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-glass-border text-text-muted uppercase text-[9px]">
                        <th className="py-2">Subject Code</th>
                        <th className="py-2">Subject Name</th>
                        <th className="py-2 text-center">Classes Attended</th>
                        <th className="py-2 text-right">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                      {studentCard.subjects.map((sub: any) => (
                        <tr key={sub.code}>
                          <td className="py-2 font-mono">{sub.code}</td>
                          <td className="py-2 text-text-secondary">{sub.name}</td>
                          <td className="py-2 text-center font-mono">{sub.present} / {sub.total}</td>
                          <td className={cn("py-2 text-right font-mono font-semibold", sub.rate >= 75 ? "text-success" : "text-error")}>
                            {sub.rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recharts Trends */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">Monthly Attendance Trends</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studentCard.trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" />
                      <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={10} />
                      <YAxis stroke="var(--color-text-muted)" fontSize={10} domain={[40, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="rate" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-glass-border pt-4">
                <Button variant="secondary" onClick={() => window.print()}>Print Card</Button>
                <Button onClick={() => handleCSVDownload(`Student_Report_${studentCard.name}`)}>Download CSV</Button>
              </div>
            </GlassCard>
          )}
        </motion.div>
      )}

      {/* ──────── TEACHER REPORTS ──────── */}
      {activeTab === "teacherView" && (
        <motion.div {...fadeUp} key="teacherView" className="space-y-6">
          <GlassCard className="p-4" subtle>
            <div>
              <label className="text-[10px] font-medium text-text-muted mb-1 block">Selected Class Session</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none max-w-xs"
              >
                <option value="CSE-A">CSE 5th Sem Section A (DSA)</option>
                <option value="CSE-B">CSE 5th Sem Section B (OS)</option>
                <option value="ECE-A">ECE 3rd Sem Section A (Signals)</option>
              </select>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-0.5">Average Attendance</p>
              <p className="text-xl font-bold text-success">94.6%</p>
              <span className="text-[9px] text-text-dim">CSE Section A average</span>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-0.5">Recognition Accuracy</p>
              <p className="text-xl font-bold text-ai-cyan">98.8%</p>
              <span className="text-[9px] text-text-dim">CCTV Edge Cam analytics</span>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-0.5">Unknown Face Alerts</p>
              <p className="text-xl font-bold text-warning">2 cases</p>
              <span className="text-[9px] text-text-dim">Flagged in monitoring center</span>
            </GlassCard>
          </div>

          <GlassCard className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Class Attendance Roster</h3>
              <Button size="sm" variant="secondary" onClick={() => handleCSVDownload("Teacher_Class_Roster")}>Export Roster</Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-glass-border text-text-muted uppercase text-[9px]">
                    <th className="py-2">USN</th>
                    <th className="py-2">Student Name</th>
                    <th className="py-2 text-center">Status</th>
                    <th className="py-2 text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  <tr className="hover:bg-glass-light transition-colors">
                    <td className="py-2 font-mono">CSE2026002</td>
                    <td className="py-2 font-medium text-text-primary">Siddharth Saxena</td>
                    <td className="py-2 text-center text-success font-semibold">PRESENT</td>
                    <td className="py-2 text-right font-mono text-text-secondary">98%</td>
                  </tr>
                  <tr className="hover:bg-glass-light transition-colors">
                    <td className="py-2 font-mono">CSE2026008</td>
                    <td className="py-2 font-medium text-text-primary">Shreya Agarwal</td>
                    <td className="py-2 text-center text-success font-semibold">PRESENT</td>
                    <td className="py-2 text-right font-mono text-text-secondary">94%</td>
                  </tr>
                  <tr className="hover:bg-glass-light transition-colors">
                    <td className="py-2 font-mono">CSE2026001</td>
                    <td className="py-2 font-medium text-text-primary">Manish Bose</td>
                    <td className="py-2 text-center text-warning font-semibold">LATE (Ingest)</td>
                    <td className="py-2 text-right font-mono text-text-secondary">72%</td>
                  </tr>
                  <tr className="hover:bg-glass-light transition-colors">
                    <td className="py-2 font-mono">CSE2026003</td>
                    <td className="py-2 font-medium text-text-primary">Karan Nair</td>
                    <td className="py-2 text-center text-error font-semibold">ABSENT</td>
                    <td className="py-2 text-right font-mono text-text-secondary">N/A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </>
  );
}
