"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CheckSquare, AlertTriangle, CheckCircle, XCircle, Clock, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

interface CourseAttendance {
  code: string;
  name: string;
  present: number;
  absent: number;
  total: number;
  rate: number;
}

interface AttendanceLog {
  date: string;
  time: string;
  code: string;
  name: string;
  status: "Present" | "Absent" | "Late";
  method: string;
}

export default function StudentAttendancePage() {
  const user = useAuthStore((s) => s.user);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [courses, setCourses] = useState<CourseAttendance[]>([]);
  const [fullLogs, setFullLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchAttendance() {
      // Resolve USN from store or localStorage
      let usn =
        (user as any)?.student?.studentId ||
        (user as any)?.student?.usn ||
        (user as any)?.studentId ||
        (typeof window !== "undefined" ? localStorage.getItem("currentUserUSN") : null);

      if (!usn || usn === "—") {
        try {
          const prof = await apiRequest<any>("/auth/profile");
          if (prof?.success && prof.data) {
            const stu = prof.data.student || {};
            usn = stu.studentId || stu.usn || prof.data.studentId;
            if (usn && typeof window !== "undefined") {
              localStorage.setItem("currentUserUSN", usn);
            }
          }
        } catch {
          // ignore
        }
      }

      if (!usn || usn === "—") {
        if (!isCancelled) setLoading(false);
        return;
      }

      try {
        const res = await apiRequest<any>(`/attendance/student/${encodeURIComponent(usn)}`);
        if (res && res.success && res.data && !isCancelled) {
          const records = res.data.recentRecords || [];
          
          if (records.length > 0) {
            // Group records by subject to compute real course attendance
            const courseMap = new Map<string, { name: string; present: number; absent: number; total: number }>();
            
            for (const r of records) {
              const code = r.session?.subject?.code || r.session?.subjectId || "CS-GEN";
              const name = r.session?.subject?.name || r.session?.subjectName || "General Course";
              
              if (!courseMap.has(code)) {
                courseMap.set(code, { name, present: 0, absent: 0, total: 0 });
              }
              const entry = courseMap.get(code)!;
              entry.total += 1;
              if (r.status === "PRESENT") {
                entry.present += 1;
              } else {
                entry.absent += 1;
              }
            }

            const computedCourses: CourseAttendance[] = Array.from(courseMap.entries()).map(([code, val]) => ({
              code,
              name: val.name,
              present: val.present,
              absent: val.absent,
              total: val.total,
              rate: val.total > 0 ? parseFloat(((val.present / val.total) * 100).toFixed(1)) : 0,
            }));

            setCourses(computedCourses);

            setFullLogs(records.map((r: any) => ({
              date: new Date(r.markedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              time: new Date(r.markedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
              code: r.session?.subject?.code || "CS-301",
              name: r.session?.subject?.name || r.session?.subjectName || "Computer Science",
              status: r.status === "PRESENT" ? "Present" : r.status === "LATE" ? "Late" : "Absent",
              method: r.source === "BIOMETRIC_CAMERA" ? "AI Face Recognition" : "Facial Biometrics",
            })));
          } else {
            setCourses([]);
            setFullLogs([]);
          }
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.warn("Failed to fetch student attendance telemetry:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchAttendance();

    // Auto-refresh every 8 seconds in real time
    const interval = setInterval(fetchAttendance, 8000);
    const onFocus = () => fetchAttendance();
    window.addEventListener("focus", onFocus);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  // Identify lowest course attendance rate for advisory
  const lowestCourse = courses.reduce<CourseAttendance | null>((prev, curr) => {
    if (!prev || curr.rate < prev.rate) return curr;
    return prev;
  }, null);

  const hasWarning = lowestCourse && lowestCourse.rate < 75;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

      {/* Warning Box or Compliance Status */}
      {hasWarning ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">Attendance Advisory Alert</h4>
            <p className="text-xs text-text-secondary mt-1">
              Your attendance in <strong className="text-text-primary">{lowestCourse.code} {lowestCourse.name} ({lowestCourse.rate}%)</strong> is currently below the mandatory institutional threshold (75%). Please ensure attendance in upcoming lectures to maintain examination clearance.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">Academic Attendance Compliant</h4>
            <p className="text-xs text-text-secondary mt-1">
              All registered course attendance rates are compliant with university attendance regulations.
            </p>
          </div>
        </div>
      )}

      {/* Course Cards Grid */}
      {courses.length > 0 ? (
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
      ) : (
        <GlassCard className="p-8 text-center">
          <Clock className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-text-primary">No Recorded Attendance Records</p>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            Your biometric attendance logs will automatically appear here once class sessions are marked by the Edge AI cameras.
          </p>
        </GlassCard>
      )}

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
              {fullLogs.length > 0 ? (
                fullLogs.map((log, i) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                    No individual session check-ins recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
