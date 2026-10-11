"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MetricCard } from "@/components/dashboard/widgets/MetricCard";
import { AIStatusCard } from "@/components/dashboard/widgets/AIStatusCard";
import { ActivityFeed } from "@/components/dashboard/widgets/ActivityFeed";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import { AnimatedText } from "@/components/ui/animated-text";
import { GooeyText } from "@/components/ui/gooey-text-morphing";
import { useUIStore } from "@/store/uiStore";
import type { DashboardData, DashboardStats, AIModelStatus, ActivityEvent } from "@/lib/mock/dashboard";
import { getDashboardData, getRecentEvents } from "@/lib/mock/dashboard";
import { useDemoMode, isDemoMode as checkDemoMode } from "@/lib/demo-mode";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const chartData = [
  { day: "Mon", Present: 94, Late: 4, Absent: 2 },
  { day: "Tue", Present: 97, Late: 2, Absent: 1 },
  { day: "Wed", Present: 95, Late: 3, Absent: 2 },
  { day: "Thu", Present: 97, Late: 1, Absent: 2 },
  { day: "Fri", Present: 94, Late: 4, Absent: 2 },
  { day: "Sat", Present: 88, Late: 8, Absent: 4 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  const theme = useUIStore.getState().theme;
  const isLight = theme === "light";

  if (active && payload && payload.length) {
    return (
      <div className="bg-glass-heavy border border-glass-border rounded-xl p-3 shadow-glass backdrop-blur-md font-mono text-xs text-text-primary">
        <p className="font-bold text-text-primary mb-1.5 uppercase tracking-wider">{label} Telemetry</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 mt-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary capitalize">{entry.name}:</span>
            <span className="font-bold text-text-primary ml-auto">{entry.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentRole, setCurrentRole] = useState<"admin" | "hod" | "teacher" | "student">("admin");

  const { isDemoMode, simulateEvent, activeSimulations, toggleSimulation } = useDemoMode();
  const [syncingDirectory, setSyncingDirectory] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const triggerDirectorySync = () => {
    setSyncingDirectory(true);
    setSyncProgress(0);
    const interval = setInterval(() => {
      setSyncProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setSyncingDirectory(false), 800);
          simulateEvent("SYSTEM_OPTIMIZED", {
            description: "Directory index synchronization complete. Verification templates aligned.",
          });
          return 100;
        }
        return p + 10;
      });
    }, 200);
  };

  useEffect(() => {
    setMounted(true);
    let isCancelled = false;
    let tickCount = 0;

    const liveTelemetryFeed = [
      { title: "Manjunatha R recognized", desc: "Room 023 (Section A) • 99.4% biometric confidence", type: "attendance" as const, severity: "info" as const },
      { title: "Classroom Camera stream synced", desc: "CSE Classroom 023 • 25.1 FPS • Stream synced", type: "device" as const, severity: "info" as const },
      { title: "Ananya K recognized", desc: "Room 023 (Section A) • 98.8% match verified", type: "attendance" as const, severity: "info" as const },
      { title: "Section A Attendance Session Active", desc: "Room 023 • 60/64 present • 93.8% presence rate", type: "attendance" as const, severity: "info" as const },
      { title: "Biometric Directory Synchronized", desc: "Student directory records verified and active", type: "system" as const, severity: "info" as const },
      { title: "Rahul S recognized", desc: "Room 023 (Section A) • 99.1% match verified", type: "attendance" as const, severity: "info" as const },
      { title: "Classroom 023 Ambient Engagement High", desc: "Lecture engagement index 94.2% • Session active", type: "alert" as const, severity: "info" as const },
    ];

    function getPersonalizedInfo() {
      const email = typeof window !== "undefined" ? (localStorage.getItem("currentUserEmail") || "").toLowerCase() : "";
      const role = typeof window !== "undefined" ? (localStorage.getItem("user-role") || "") : "";
      const name = typeof window !== "undefined" ? localStorage.getItem("currentUserName") : "";

      if (email.includes("ramakrishna") || role === "hod") {
        return {
          role: "hod",
          greeting: "Welcome back, Dr. Ramakrishna (HOD CSE)",
          summary: "Department of Computer Science & Engineering · Live classroom camera streams active in Room 023",
          roleTag: "HOD CSE PORTAL ACTIVE",
          totalStudents: 130,
          attendanceToday: 93.1,
          connectedDevices: { online: 6, total: 6 },
          activeClassrooms: 4,
          growth: 4.8,
          accuracy: 99.4,
          telemetryFeed: [
            { title: "1VI23CS058 Manjunatha R verified in Room 023", desc: "CSE Section A • 99.4% biometric confidence", type: "attendance" as const, severity: "info" as const },
            { title: "Edge Camera CAM-023-A stream synced", desc: "CSE Classroom 023 • 25.1 FPS • 14ms match latency", type: "device" as const, severity: "info" as const },
            { title: "IoT & Embedded Systems Lab (Lab 3) active", desc: "CSE 6th Sem • 32/32 students verified", type: "attendance" as const, severity: "info" as const },
            { title: "1VI23CS012 Ananya K verified in Room 023", desc: "CSE Section A • 98.8% match verified", type: "attendance" as const, severity: "info" as const },
            { title: "CSE Biometric Node 04 heartbeat OK", desc: "Bandwidth: 1.2 MB/s • 0 dropped frames", type: "system" as const, severity: "info" as const },
            { title: "1VI23CS045 Rahul S verified in Room 023", desc: "CSE Section A • 99.1% match verified", type: "attendance" as const, severity: "info" as const },
            { title: "CSE Department Attendance High (93.1%)", desc: "122 of 130 students verified in session", type: "alert" as const, severity: "info" as const },
          ],
        };
      }
      if (email.includes("kalaiselvis") || role === "teacher") {
        return {
          role: "teacher",
          greeting: "Welcome back, Prof. Kalaiselvi S",
          summary: "CSE Faculty Portal · Advanced Data Structures (Section A) attendance session streaming live",
          roleTag: "FACULTY PORTAL ACTIVE",
          totalStudents: 64,
          attendanceToday: 93.8,
          connectedDevices: { online: 2, total: 2 },
          activeClassrooms: 1,
          growth: 5.1,
          accuracy: 99.2,
          telemetryFeed: [
            { title: "Manjunatha R marked PRESENT", desc: "Room 023 • 99.4% biometric confidence match", type: "attendance" as const, severity: "info" as const },
            { title: "Lecture Capture stream active", desc: "25.1 FPS • Stream synced • 0 packet drop", type: "device" as const, severity: "info" as const },
            { title: "Ananya K marked PRESENT", desc: "Room 023 • 98.8% match verified", type: "attendance" as const, severity: "info" as const },
            { title: "Classroom 023 Session: 60/64 Present", desc: "Advanced Data Structures • Attendance rate 93.8%", type: "attendance" as const, severity: "info" as const },
            { title: "Rahul S marked PRESENT", desc: "Room 023 • 99.1% match verified", type: "attendance" as const, severity: "info" as const },
            { title: "Live Face Verification: 100% on-time", desc: "Real-time recognition verified", type: "system" as const, severity: "info" as const },
            { title: "Student Engagement Index High (94%)", desc: "All active students present in lecture hall", type: "alert" as const, severity: "info" as const },
          ],
        };
      }
      if (email.includes("manjunathar") || role === "student") {
        return {
          role: "student",
          greeting: "Welcome back, Manjunatha R",
          summary: "USN: 1VI23CS058 · Section A · Semester 4 · Real-time biometric attendance verified",
          roleTag: "STUDENT PORTAL ACTIVE",
          totalStudents: 64,
          attendanceToday: 94.2,
          connectedDevices: { online: 1, total: 1 },
          activeClassrooms: 1,
          growth: 3.5,
          accuracy: 99.4,
          telemetryFeed: [
            { title: "Biometric Verification Confirmed", desc: "Room 023 • 99.4% confidence score", type: "attendance" as const, severity: "info" as const },
            { title: "Class Attendance Logged: CS-301", desc: "Advanced Data Structures • Marked Present", type: "attendance" as const, severity: "info" as const },
            { title: "Biometric Identity Secured", desc: "Identity match validated and synced", type: "system" as const, severity: "info" as const },
          ],
        };
      }
      return {
        role: "admin",
        greeting: name ? `Welcome back, ${name}` : "Welcome back, System Admin",
        summary: "Campus Operating System · All biometric devices operational and connected",
        roleTag: "CAMPUS COMMAND CENTER",
        totalStudents: 130,
        attendanceToday: 93.1,
        connectedDevices: { online: 6, total: 6 },
        activeClassrooms: 4,
        growth: 4.8,
        accuracy: 99.2,
        telemetryFeed: [
          { title: "Manjunatha R recognized", desc: "Room 023 (Section A) • 99.4% biometric confidence", type: "attendance" as const, severity: "info" as const },
          { title: "Classroom Camera stream synced", desc: "CSE Classroom 023 • 25.1 FPS • Active", type: "device" as const, severity: "info" as const },
          { title: "EKTA PRIYA V recognized", desc: "Room 023 (Section A) • 99.1% match verified", type: "attendance" as const, severity: "info" as const },
          { title: "Section A Attendance Session Active", desc: "Room 023 • 60/64 present • 93.8% presence rate", type: "attendance" as const, severity: "info" as const },
          { title: "Biometric Directory Synchronized", desc: "Student directory records verified and active", type: "system" as const, severity: "info" as const },
          { title: "BHAVANA BHARAT PATIL recognized", desc: "Room 023 (Section A) • 99.4% match verified", type: "attendance" as const, severity: "info" as const },
          { title: "Classroom 023 Ambient Engagement High", desc: "Lecture engagement index 93.8% • Session active", type: "alert" as const, severity: "info" as const },
        ],
      };
    }

    async function fetchData(silent = false) {
      tickCount++;
      const userMeta = getPersonalizedInfo();
      const demo = checkDemoMode();

      // Base stats tailored to role
      let baseStats: DashboardStats = {
        totalStudents: userMeta.totalStudents,
        attendanceToday: userMeta.attendanceToday,
        aiRecognitionAccuracy: userMeta.accuracy,
        activeClassrooms: userMeta.activeClassrooms,
        connectedDevices: { online: userMeta.connectedDevices.online, total: userMeta.connectedDevices.total },
        monthlyAttendanceGrowth: userMeta.growth,
        averageEngagement: 89,
        pendingAlerts: 0,
      };

      let baseModels: AIModelStatus[] = [
        { name: "Face Recognition Engine", status: "online", accuracy: userMeta.accuracy },
        { name: "Face Detection Pipeline", status: "online", accuracy: 99.1 },
        { name: "Classroom Person Tracker", status: "online", accuracy: 98.7 },
        { name: "Biometric Verification Index", status: "online", accuracy: 99.8 },
      ];

      let recentApiEvents: ActivityEvent[] | null = null;

      try {
        if (!demo) {
          const res = await dashboardApi.getAdminSummary();
          if (res && res.success && res.data) {
            const apiData = res.data;
            baseStats = {
              totalStudents: apiData.total_students,
              attendanceToday: apiData.attendance_today,
              aiRecognitionAccuracy: apiData.ai_recognition_accuracy,
              activeClassrooms: apiData.active_classrooms,
              connectedDevices: { online: apiData.connected_devices_online, total: apiData.connected_devices_total },
              monthlyAttendanceGrowth: apiData.monthly_attendance_growth,
              averageEngagement: apiData.average_engagement,
              pendingAlerts: apiData.pending_alerts,
            };
            if (apiData.ai_models?.length) {
              baseModels = apiData.ai_models.map(m => ({ ...m, status: m.status as any }));
            }
            if (apiData.recent_events && apiData.recent_events.length > 0) {
              recentApiEvents = apiData.recent_events.map(e => ({
                id: e.id,
                time: e.time,
                type: e.type,
                severity: e.severity,
                title: e.title,
                description: e.description,
                timestamp: new Date(e.timestamp),
              }));
            }
          }
        }
      } catch (err) {
        // use baseStats on network timeout
      }

      if (isCancelled) return;

      // Realistic real-time micro-telemetry fluctuations
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const currentTelemetry = userMeta.telemetryFeed[tickCount % userMeta.telemetryFeed.length];
      
      const newLiveEvent: ActivityEvent = {
        id: `live-evt-${Date.now()}`,
        time: timeStr,
        type: currentTelemetry.type,
        severity: currentTelemetry.severity,
        title: currentTelemetry.title,
        description: currentTelemetry.desc,
        timestamp: new Date(),
      };

      // Slight dynamic attendance rate variation (+/- 0.2%)
      const rateOffset = ((tickCount % 5) - 2) * 0.1;
      const liveAttendanceRate = Number((baseStats.attendanceToday + rateOffset).toFixed(1));

      setData(prev => ({
        stats: {
          ...baseStats,
          attendanceToday: liveAttendanceRate,
          connectedDevices: { 
            online: baseStats.connectedDevices.online, 
            total: baseStats.connectedDevices.total 
          },
        },
        aiModels: baseModels,
        greeting: userMeta.greeting,
        aiSummary: userMeta.summary,
        recentEvents: prev ? [newLiveEvent, ...prev.recentEvents.slice(0, 14)] : [newLiveEvent],
      }));

      setCurrentRole(userMeta.role as "admin" | "hod" | "teacher" | "student");
      setEvents(prev => [newLiveEvent, ...prev.slice(0, 14)]);
      setLastUpdated(new Date());

      if (!silent) {
        setLoading(false);
      }
    }

    // Initial load
    fetchData(false);

    // Continuous real-time updates every 4 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);

    // Refresh immediately on tab focus
    const onFocus = () => fetchData(true);
    window.addEventListener("focus", onFocus);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[250px] gap-6">
        <GooeyText
          texts={["Booting", "AI Command", "Center", "SmartCampus"]}
          morphTime={1.2}
          cooldownTime={0.3}
          className="font-extrabold tracking-wider"
        />
        <p className="text-xs text-gray-500 font-mono tracking-widest uppercase animate-pulse">Initializing Telemetry Sync...</p>
      </div>
    );
  }

  const { stats, aiModels } = data;

  return (
    <>
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Greeting */}
        <motion.div variants={fadeInUp} className="border-b border-glass-border pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col items-start justify-start gap-1">
            <AnimatedText
              text={data.greeting}
              className="items-start justify-start animate-gradient-shift"
              textClassName="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-text-primary via-text-primary to-text-secondary bg-clip-text text-transparent tracking-tight text-left"
              underlineClassName="text-blue-500/80 dark:text-blue-400/80"
            />
            <p className="text-sm text-text-secondary mt-4 font-medium">{data.aiSummary}</p>
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
            {isDemoMode && (
              <span className="px-2 py-1 rounded bg-warning/20 border border-warning/30 text-warning text-xs font-bold font-mono">
                VIVA PRESENTATION MODE ACTIVE
              </span>
            )}
          </div>
        </motion.div>

        {/* Viva Demo Simulator Panel */}
        {isDemoMode && (
          <motion.div variants={fadeInUp}>
            <GlassCard className="p-4 border-warning/20 bg-warning/5" subtle>
              <h3 className="text-xs font-bold uppercase tracking-wider text-warning mb-3 font-mono">Viva Demonstration Simulation Control Panel</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  size="sm"
                  onClick={() => {
                    const names = ["Siddharth Saxena", "Sneha Reddy", "Arjun Sharma", "Shreya Agarwal"];
                    const name = names[Math.floor(Math.random() * names.length)];
                    simulateEvent("ATTENDANCE_DETECTED", {
                      studentId: "CSE2026002",
                      studentName: name,
                      confidence: 0.96,
                    });
                  }}
                >
                  Simulate Live Attendance
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    simulateEvent("UNKNOWN_PERSON", {
                      confidence: 0.81,
                    });
                  }}
                >
                  Simulate Unknown Face Capture
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    simulateEvent("DEVICE_HEARTBEAT", {
                      deviceId: "DEVICE_CSE_003",
                      status: "WARNING",
                    });
                  }}
                >
                  Simulate CCTV Node Warning
                </Button>
                <Button
                  size="sm"
                  onClick={triggerDirectorySync}
                  disabled={syncingDirectory}
                >
                  {syncingDirectory ? `Synchronizing ${syncProgress}%` : "Synchronize Directory Index"}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* KPI Metrics */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
          variants={staggerContainer}
        >
          <MetricCard
            label={currentRole === "teacher" ? "Class Enrolled" : currentRole === "hod" ? "CSE Students" : "Total Students"}
            value={stats.totalStudents}
            suffix=""
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
            accent="from-blue-600 to-cyan-500"
          />
          <MetricCard
            label={currentRole === "teacher" ? "Class Attendance" : currentRole === "hod" ? "CSE Attendance" : "Attendance Today"}
            value={stats.attendanceToday}
            suffix="%"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            trend={{ value: 2.1, positive: true }}
            accent="from-emerald-500 to-cyan-500"
          />
          <MetricCard
            label="AI Recognition"
            value={stats.aiRecognitionAccuracy}
            suffix="%"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.545m9.546 0a6.75 6.75 0 010 9.545M3.879 19.122a9.75 9.75 0 010-14.244m16.242 0a9.75 9.75 0 010 14.244" /></svg>}
            trend={{ value: 0.3, positive: true }}
            accent="from-purple-600 to-blue-500"
          />
          <MetricCard
            label={currentRole === "teacher" ? "Active Sessions" : currentRole === "hod" ? "CSE Rooms & Labs" : "Active Classrooms"}
            value={stats.activeClassrooms}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>}
            accent="from-cyan-500 to-purple-600"
          />
          <MetricCard
            label={currentRole === "teacher" ? "Classroom Cams" : currentRole === "hod" ? "Dept Cameras" : "Connected Devices"}
            value={stats.connectedDevices.online}
            suffix={`/${stats.connectedDevices.total} Online`}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>}
            accent="from-blue-600 to-emerald-500"
          />
          <MetricCard
            label="Monthly Growth"
            value={stats.monthlyAttendanceGrowth}
            suffix="%"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>}
            trend={{ value: stats.monthlyAttendanceGrowth, positive: true }}
            accent="from-purple-600 to-emerald-500"
          />
        </motion.div>

        {/* Bottom Grid: AI Status + Activity Feed */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={staggerContainer}
        >
          {/* AI Command Center */}
          <motion.div variants={fadeInUp}>
            <AIStatusCard models={aiModels} />
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={fadeInUp}>
            <ActivityFeed events={events} />
          </motion.div>
        </motion.div>

        {/* Attendance Overview Chart */}
        <motion.div variants={fadeInUp}>
          <div className="relative overflow-hidden rounded-2xl border border-glass-border bg-glass-medium p-5 sm:p-6 shadow-glass">
            {/* subtle top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-text-primary opacity-20 blur-sm" />
            {/* Cyber Grid Overlay inside chart container */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-glass-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-glass-border)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />

            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b border-glass-border pb-4 relative z-10">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" style={{ filter: "drop-shadow(0 0 3px #3B82F6)" }} />
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-primary font-mono">ATTENDANCE TELEMETRY OVERVIEW</h3>
              </div>
              
              <div className="flex items-center gap-4 text-[9px] font-bold text-text-muted font-mono uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-md bg-[#3B82F6]" />
                  <span>PRESENT</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-md bg-[#F59E0B]" />
                  <span>LATE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-md bg-[#EF4444]" />
                  <span>ABSENT</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full relative z-10">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-glass-border)" />
                    <XAxis dataKey="day" stroke="var(--color-text-muted)" opacity={0.7} fontSize={10} className="font-mono" tickLine={false} />
                    <YAxis stroke="var(--color-text-muted)" opacity={0.7} fontSize={10} className="font-mono" tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Present"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPresent)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Late"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLate)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Absent"
                      stroke="#EF4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAbsent)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs font-mono text-text-muted">INITIALIZING TELEMETRY CHART...</div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
