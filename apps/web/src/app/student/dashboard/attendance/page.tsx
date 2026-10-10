"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CheckSquare, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/api/client";

export default function StudentAttendancePage() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [courses, setCourses] = useState([
    { code: "CS-301", name: "Advanced Data Structures", present: 18, absent: 1, total: 19, rate: 94.7 },
    { code: "CS-402", name: "Artificial Intelligence & ML", present: 15, absent: 2, total: 17, rate: 88.2 },
    { code: "CS-101", name: "Introduction to Programming", present: 22, absent: 0, total: 22, rate: 100.0 },
    { code: "CS-305", name: "Operating Systems", present: 14, absent: 3, total: 17, rate: 82.3 },
    { code: "CS-308", name: "Software Engineering", present: 16, absent: 1, total: 17, rate: 94.1 },
    { code: "CS-310", name: "Computer Networks", present: 12, absent: 4, total: 16, rate: 75.0 }
  ]);

  const [fullLogs, setFullLogs] = useState([
    { date: "June 19, 2026", time: "10:02 AM", code: "CS-301", name: "Advanced Data Structures", status: "Present", method: "AI Face Recognition" },
    { date: "June 18, 2026", time: "02:05 PM", code: "CS-402", name: "Artificial Intelligence & ML", status: "Present", method: "AI Face Recognition" },
    { date: "June 17, 2026", time: "10:03 AM", code: "CS-301", name: "Advanced Data Structures", status: "Present", method: "AI Face Recognition" },
    { date: "June 17, 2026", time: "08:30 AM", code: "CS-305", name: "Operating Systems", status: "Absent", method: "Missed Check-in" },
    { date: "June 16, 2026", time: "09:05 AM", code: "CS-101", name: "Introduction to Programming", status: "Present", method: "AI Face Recognition" },
    { date: "June 16, 2026", time: "11:30 AM", code: "CS-310", name: "Computer Networks", status: "Absent", method: "Missed Check-in" },
    { date: "June 15, 2026", time: "10:01 AM", code: "CS-301", name: "Advanced Data Structures", status: "Present", method: "AI Face Recognition" }
  ]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchAttendance() {
      const usn = typeof window !== "undefined" ? localStorage.getItem("currentUserUSN") : null;
      if (!usn || usn === "—") return;

      try {
        const res = await apiRequest<any>(`/attendance/student/${encodeURIComponent(usn)}`);
        if (res && res.success && res.data && !isCancelled) {
          const records = res.data.recentRecords;
          if (records && records.length > 0) {
            setFullLogs(records.map((r: any) => ({
              date: new Date(r.markedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              time: new Date(r.markedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
              code: r.session?.subject?.code || "CS-301",
              name: r.session?.subjectName || "Computer Science",
              status: r.status === "PRESENT" ? "Present" : "Absent",
              method: r.source === "BIOMETRIC_CAMERA" ? "AI Face Recognition" : "Facial Biometrics",
            })));
          }
          setLastUpdated(new Date());
        }
      } catch (err) {}
    }

    fetchAttendance();

    // Auto-refresh every 4 seconds in real time
    const interval = setInterval(fetchAttendance, 4000);
    const onFocus = () => fetchAttendance();
    window.addEventListener("focus", onFocus);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Attendance Telemetry</h2>
          <p className="text-xs text-text-muted">Track your academic presence, verify biometric login rates, and review course warning status.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE TELEMETRY
          </span>
          {lastUpdated && (
            <span className="text-[11px] text-text-muted font-mono hidden sm:inline">
              Synced {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Warning Box if any course is below 75% or 80% */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">Attendance Advisory Alert</h4>
          <p className="text-xs text-text-secondary mt-1">Your attendance in <strong className="text-text-primary">CS-310 Computer Networks (75.0%)</strong> is currently on the minimum threshold (75%). Missing any more classes will restrict dashboard examination clearances.</p>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <GlassCard key={course.code} className="p-4 flex flex-col justify-between hover:border-blue-500/20 transition-all">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono uppercase">
                  {course.code}
                </span>
                <span className={`text-xs font-mono font-bold ${
                  course.rate >= 90 
                    ? "text-emerald-400" 
                    : course.rate >= 75 
                      ? "text-amber-400" 
                      : "text-red-400"
                }`}>
                  {course.rate}%
                </span>
              </div>
              <h3 className="text-xs font-semibold text-text-primary mt-2 line-clamp-1">{course.name}</h3>
              <p className="text-[10px] text-text-muted mt-1 font-mono">Attended: {course.present} / {course.total} classes</p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-glass-border/30">
              <div className="w-full h-1.5 bg-glass-border rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${
                  course.rate >= 90 
                    ? "bg-emerald-500" 
                    : course.rate >= 75 
                      ? "bg-amber-500" 
                      : "bg-red-500"
                }`} style={{ width: `${course.rate}%` }} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Detailed Table */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4 border-b border-glass-border pb-3">
          <CheckSquare className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-text-primary font-mono uppercase tracking-wider">Attendance Register</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-glass-border text-text-muted font-mono uppercase tracking-wider">
                <th className="pb-2 font-medium">Date / Time</th>
                <th className="pb-2 font-medium">Course Code</th>
                <th className="pb-2 font-medium">Course Title</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border/30">
              {fullLogs.map((log, i) => (
                <tr key={i} className="hover:bg-glass-light/10 transition-colors">
                  <td className="py-2.5 font-mono text-text-primary">
                    <div>{log.date}</div>
                    <div className="text-[10px] text-text-muted">{log.time}</div>
                  </td>
                  <td className="py-2.5 font-mono text-text-secondary">{log.code}</td>
                  <td className="py-2.5 font-medium text-text-primary">{log.name}</td>
                  <td className="py-2.5 text-text-muted">{log.method}</td>
                  <td className="py-2.5 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      log.status === "Present" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {log.status === "Present" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
