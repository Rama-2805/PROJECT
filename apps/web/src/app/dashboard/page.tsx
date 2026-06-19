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
import type { DashboardData } from "@/lib/mock/dashboard";
import { getDashboardData, getRecentEvents } from "@/lib/mock/dashboard";
import type { ActivityEvent } from "@/lib/mock/dashboard";
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

  useEffect(() => {
    setMounted(true);
    async function load() {
      const [dashData, recentEvents] = await Promise.all([
        getDashboardData(),
        getRecentEvents(),
      ]);
      setData(dashData);
      setEvents(recentEvents);
      setLoading(false);
    }
    load();
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
        <motion.div variants={fadeInUp} className="border-b border-glass-border pb-4 flex flex-col items-start justify-start gap-1">
          <AnimatedText
            text={data.greeting}
            className="items-start justify-start animate-gradient-shift"
            textClassName="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-text-primary via-text-primary to-text-secondary bg-clip-text text-transparent tracking-tight text-left"
            underlineClassName="text-blue-500/80 dark:text-blue-400/80"
          />
          <p className="text-sm text-text-secondary mt-4 font-medium">{data.aiSummary}</p>
        </motion.div>

        {/* KPI Metrics */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
          variants={staggerContainer}
        >
          <MetricCard
            label="Total Students"
            value={stats.totalStudents}
            suffix="K+"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
            accent="from-blue-600 to-cyan-500"
          />
          <MetricCard
            label="Attendance Today"
            value={stats.attendanceToday * 10}
            suffix="%"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            trend={{ value: 2.1, positive: true }}
            accent="from-emerald-500 to-cyan-500"
          />
          <MetricCard
            label="AI Recognition"
            value={stats.aiRecognitionAccuracy * 10}
            suffix="%"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.545m9.546 0a6.75 6.75 0 010 9.545M3.879 19.122a9.75 9.75 0 010-14.244m16.242 0a9.75 9.75 0 010 14.244" /></svg>}
            trend={{ value: 0.3, positive: true }}
            accent="from-purple-600 to-blue-500"
          />
          <MetricCard
            label="Active Classrooms"
            value={stats.activeClassrooms}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>}
            accent="from-cyan-500 to-purple-600"
          />
          <MetricCard
            label="Connected Devices"
            value={stats.connectedDevices.online}
            suffix={`/${stats.connectedDevices.total} Online`}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>}
            accent="from-blue-600 to-emerald-500"
          />
          <MetricCard
            label="Monthly Growth"
            value={stats.monthlyAttendanceGrowth * 10}
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

            <div className="flex items-center justify-between mb-6 border-b border-glass-border pb-4 relative z-10">
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
