"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getAttendanceAnalytics } from "@/lib/mock/attendance";
import { isDemoMode as checkDemoMode } from "@/lib/demo-mode";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { X, FileSpreadsheet, Download, Calendar } from "lucide-react";

const DEPARTMENTS = ["All", "CSE", "ISE", "ECE", "EEE", "AIML", "CSE(AI)", "MECH", "CIVIL"];
const SEMESTERS = ["All", "1", "2", "3", "4", "5", "6", "7", "8"];

export default function AttendancePage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "semester">("daily");
  const [reportDept, setReportDept] = useState("All");
  const [reportSem, setReportSem] = useState("All");
  const [reportSection, setReportSection] = useState("All");

  useEffect(() => {
    async function load() {
      const demo = checkDemoMode();
      if (demo) {
        getAttendanceAnalytics().then(setAnalytics).finally(() => setLoading(false));
        return;
      }

      try {
        const res = await dashboardApi.getAttendanceOverview();
        if (res && res.success && res.data) {
          setAnalytics(res.data);
        } else {
          console.warn("Attendance overview API returned failure. Falling back to mocks.");
          getAttendanceAnalytics().then(setAnalytics);
        }
      } catch (err) {
        console.error("Failed to fetch live attendance overview. Falling back to mocks.", err);
        getAttendanceAnalytics().then(setAnalytics);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleExportCSV = () => {
    const headers = "Date/Period,Department,Average Attendance,Late Arrivals,Absences\n";
    const rows = [
      ["Today", "All", "95.4%", "12", "3%"],
      ["Weekly Average", "All", "95.6%", "54", "3.2%"],
      ["CSE", "CSE", "95.4%", "4", "2.1%"],
      ["ISE", "ISE", "94.2%", "3", "3.5%"],
      ["ECE", "ECE", "91.8%", "3", "4.2%"],
      ["EEE", "EEE", "89.5%", "2", "6.2%"],
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `campus_attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const reportTitle = `${reportType.toUpperCase()}_Attendance_Report_Dept_${reportDept}_Sem_${reportSem}`;
    const headers = "USN,Name,Department,Semester,Section,Attendance Rate,Status\n";
    
    const studentsData = [
      ["1VI23CS001", "Manjunatha P", reportDept === "All" ? "CSE" : reportDept, `Semester ${reportSem === "All" ? "3" : reportSem}`, reportSection === "All" ? "A" : reportSection, "96.4%", "PRESENT"],
      ["1VI23CS002", "Anil Kumar", reportDept === "All" ? "CSE" : reportDept, `Semester ${reportSem === "All" ? "3" : reportSem}`, reportSection === "All" ? "A" : reportSection, "92.1%", "PRESENT"],
      ["1VI23CS003", "Meera Iyer", reportDept === "All" ? "ECE" : reportDept, `Semester ${reportSem === "All" ? "3" : reportSem}`, reportSection === "All" ? "A" : reportSection, "88.5%", "LATE"],
      ["1VI23CS004", "Siddharth Saxena", reportDept === "All" ? "CSE" : reportDept, `Semester ${reportSem === "All" ? "3" : reportSem}`, reportSection === "All" ? "A" : reportSection, "98.0%", "PRESENT"],
      ["1VI23CS005", "Vikram Singh", reportDept === "All" ? "CSE" : reportDept, `Semester ${reportSem === "All" ? "3" : reportSem}`, reportSection === "All" ? "A" : reportSection, "72.4%", "ABSENT"],
    ];
    
    const rows = studentsData.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `${reportTitle.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsReportModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Attendance Analytics</h2>
          <p className="text-xs text-text-muted">Track and analyze student attendance across all departments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setIsReportModalOpen(true)}>
            <Calendar className="w-3.5 h-3.5 mr-1" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Average Attendance</p>
          <p className="text-2xl font-bold text-success">95.4%</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Late Arrivals Today</p>
          <p className="text-2xl font-bold text-warning">{analytics?.lateArrivals || 12}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Absence Rate</p>
          <p className="text-2xl font-bold text-error">{(analytics?.absenceRate || 3.2)}%</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Above 90% Attendance</p>
          <p className="text-2xl font-bold text-success">{(analytics?.distribution?.[0]?.value || 65)}%</p>
        </GlassCard>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Trend */}
        <GlassCard>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Weekly Attendance Trend</h3>
          <div className="flex items-end justify-between gap-2 h-48 pt-4">
            {analytics?.weeklyTrend?.map((day: any) => {
              const height = day.rate;
              return (
                <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-[9px] text-text-muted">{height}%</span>
                  <div
                    className="w-full rounded-t-sm bg-gradient-to-t from-ai-blue to-ai-purple transition-all hover:opacity-80"
                    style={{ height: `${height * 0.45}%` }}
                  />
                  <span className="text-[10px] text-text-muted font-medium">{day.day}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Department Comparison */}
        <GlassCard>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Department Comparison</h3>
          <div className="space-y-3">
            {analytics?.departmentComparison?.map((dept: any) => (
              <div key={dept.name} className="flex items-center gap-3">
                <span className="text-[10px] text-text-muted w-8 font-medium">{dept.name}</span>
                <div className="flex-1 h-3 rounded-full bg-glass-light overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ai-blue to-ai-purple transition-all"
                    style={{ width: `${dept.rate}%` }}
                  />
                </div>
                <span className={cn("text-[10px] font-medium tabular-nums w-10 text-right", dept.rate >= 95 ? "text-success" : dept.rate >= 90 ? "text-warning" : "text-error")}>
                  {dept.rate}%
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Distribution Doughnut */}
        <GlassCard>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Attendance Distribution</h3>
          <div className="flex items-center justify-center gap-8">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {(() => {
                  const segs = analytics?.distribution || [
                    { label: "Present", value: 65, color: "#10B981" },
                    { label: "Late", value: 22, color: "#F59E0B" },
                    { label: "Absent", value: 13, color: "#EF4444" },
                  ];
                  const total = segs.reduce((s: number, d: any) => s + d.value, 0);
                  const circumference = 2 * Math.PI * 38;
                  let cumulativePct = 0;
                  return segs.map((seg: any) => {
                    const pct = seg.value / total * 100;
                    const offset = circumference - (pct / 100) * circumference;
                    const dashOffset = (cumulativePct / 100) * circumference;
                    cumulativePct += pct;
                    return (
                      <circle
                        key={seg.label}
                        cx="50" cy="50" r="38"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="12"
                        strokeDasharray={`${circumference - offset} ${circumference}`}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-700"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-bold text-text-primary">95.4%</p>
                  <p className="text-[9px] text-text-muted">Avg Rate</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {(analytics?.distribution || [
                { label: "Present", value: 65, color: "#10B981" },
                { label: "Late", value: 22, color: "#F59E0B" },
                { label: "Absent", value: 13, color: "#EF4444" },
              ])?.map((d: any) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] text-text-muted">{d.label}</span>
                  <span className="text-[10px] font-medium text-text-primary tabular-nums">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Monthly Trend */}
        <GlassCard>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly Attendance Trend</h3>
          <div className="flex items-end justify-between gap-1 h-48 pt-4">
            {analytics?.monthlyTrend?.map((m: any) => (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[8px] text-text-muted">{m.rate}%</span>
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-ai-cyan to-ai-blue transition-all hover:opacity-80"
                  style={{ height: `${m.rate * 0.46}%` }}
                />
                <span className="text-[8px] text-text-muted">{m.month}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard>
          <p className="text-[10px] text-text-muted mb-1">Students Above 90%</p>
          <p className="text-xl font-bold text-success">65%</p>
          <div className="mt-2 h-1 rounded-full bg-glass-light overflow-hidden">
            <div className="h-full rounded-full bg-success" style={{ width: "65%" }} />
          </div>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] text-text-muted mb-1">Students 75-90%</p>
          <p className="text-xl font-bold text-warning">22%</p>
          <div className="mt-2 h-1 rounded-full bg-glass-light overflow-hidden">
            <div className="h-full rounded-full bg-warning" style={{ width: "22%" }} />
          </div>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] text-text-muted mb-1">Students 60-75%</p>
          <p className="text-xl font-bold text-orange-400">8%</p>
          <div className="mt-2 h-1 rounded-full bg-glass-light overflow-hidden">
            <div className="h-full rounded-full bg-orange-400" style={{ width: "8%" }} />
          </div>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] text-text-muted mb-1">Students Below 60%</p>
          <p className="text-xl font-bold text-error">5%</p>
          <div className="mt-2 h-1 rounded-full bg-glass-light overflow-hidden">
            <div className="h-full rounded-full bg-error" style={{ width: "5%" }} />
          </div>
        </GlassCard>
      </div>

      {/* Generate Custom Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsReportModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary/95 border border-glass-border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl backdrop-blur-xl text-xs text-text-primary"
            >
              <button 
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-glass-light transition-colors" 
                onClick={() => setIsReportModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-base font-bold uppercase tracking-wider mb-1">Generate Attendance Report</h3>
              <p className="text-text-muted mb-4">Export customized daily, weekly, monthly, or semester attendance records.</p>

              <form onSubmit={handleGenerateReportSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Report Type</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                  >
                    <option value="daily">Daily Report</option>
                    <option value="weekly">Weekly Summary</option>
                    <option value="monthly">Monthly Aggregate</option>
                    <option value="semester">Semester Analytics</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Department</label>
                    <select
                      value={reportDept}
                      onChange={(e) => setReportDept(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Semester</label>
                    <select
                      value={reportSem}
                      onChange={(e) => setReportSem(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    >
                      {SEMESTERS.map((s) => (
                        <option key={s} value={s}>{s === "All" ? "All Semesters" : `Semester ${s}`}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Section</label>
                  <select
                    value={reportSection}
                    onChange={(e) => setReportSection(e.target.value)}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                  >
                    <option value="All">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" type="button" onClick={() => setIsReportModalOpen(false)}>Cancel</Button>
                  <Button size="sm" type="submit">
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                    Download CSV
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
