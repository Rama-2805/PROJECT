"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getAttendanceAnalytics } from "@/lib/mock/attendance";
import { isDemoMode as checkDemoMode } from "@/lib/demo-mode";
import { dashboardApi } from "@/lib/api/dashboardApi";

export default function AttendancePage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </>
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
          <Button variant="secondary" size="sm">Export CSV</Button>
          <Button size="sm">Generate Report</Button>
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
          <p className="text-2xl font-bold text-warning">{analytics?.lateArrivals}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Absence Rate</p>
          <p className="text-2xl font-bold text-error">{analytics?.absenceRate}%</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Above 90% Attendance</p>
          <p className="text-2xl font-bold text-success">{analytics?.distribution?.[0]?.value}%</p>
        </GlassCard>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Trend */}
        <GlassCard>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Weekly Attendance Trend</h3>
          <div className="flex items-end justify-between gap-2 h-48 pt-4">
            {analytics?.weeklyTrend?.map((day: any, i: number) => {
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
            {analytics?.departmentComparison?.map((dept: any, i: number) => (
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
                  const segs = analytics?.distribution || [];
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
              {analytics?.distribution?.map((d: any) => (
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
            {analytics?.monthlyTrend?.map((m: any, i: number) => (
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
    </>
  );
}
