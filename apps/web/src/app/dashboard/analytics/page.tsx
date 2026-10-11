"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { isDemoMode } from "@/lib/demo-mode";
import { api } from "@/lib/api/client";
import {
  getAnalyticsOverview, getDepartmentRankings, getClassroomIntelligence,
  getRiskStudents, getInsights, getAIModelPerformance, getDailyTrends,
  getWeeklyComparison,
  type AnalyticsOverview, type DepartmentRanking, type ClassroomIntelligence,
  type RiskStudent, type Insight, type AIModelPerformance, type DailyTrend,
} from "@/lib/mock/analytics";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "border-error/30 bg-error/10 text-error",
  WARNING: "border-warning/30 bg-warning/10 text-warning",
  INFO: "border-ai-blue/30 bg-ai-blue/10 text-ai-blue",
};

const SEVERITY_DOTS: Record<string, string> = {
  CRITICAL: "bg-error animate-glow-pulse",
  WARNING: "bg-warning",
  INFO: "bg-ai-blue",
};

const COLORS_PIE = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];

function AnimatedCounter({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
    const steps = 25;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current * 10) / 10);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toFixed(decimals)}{suffix}</span>;
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [departments, setDepartments] = useState<DepartmentRanking[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomIntelligence[]>([]);
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [aiModel, setAiModel] = useState<AIModelPerformance | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ week: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "recognition" | "learning" | "risk">("overview");
  const [acknowledgedInsights, setAcknowledgedInsights] = useState<Set<string>>(new Set());

  // Filter state
  const [dateRange, setDateRange] = useState("30");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedSem, setSelectedSem] = useState("ALL");

  // Recognition / Unknown face custom metrics
  const [recMetrics, setRecMetrics] = useState({
    successRate: 98.4,
    failures: 4,
    averageConfidence: 0.94,
    falsePositives: 2,
    falseNegatives: 8,
    latencyMs: 124,
  });

  const [unkMetrics, setUnkMetrics] = useState({
    today: 3,
    week: 14,
    month: 56,
    suggestedMatchAccuracy: 89.5,
    approvalRate: 78.5,
    enrollmentConversionRate: 42.0,
    activeClusters: 8,
    topRecurring: [
      { clusterId: "CLUST-01", occurrences: 8, match: "Karan Nair (USN: CSE043)", confidence: "88%" },
      { clusterId: "CLUST-02", occurrences: 5, match: "Manish Bose (USN: CSE012)", confidence: "74%" },
      { clusterId: "CLUST-03", occurrences: 3, match: "Visitor / Unidentified", confidence: "N/A" },
    ]
  });

  const [learningMetrics, setLearningMetrics] = useState({
    profileVersions: 42,
    candidateImages: 342,
    optimizationRuns: 6,
    improvementRate: 1.4,
    learningTrend: [
      { version: "v1.0", accuracy: 96.8 },
      { version: "v1.1", accuracy: 97.5 },
      { version: "v2.0", accuracy: 98.6 },
      { version: "v2.1", accuracy: 99.1 },
    ],
    rebuildHistory: [
      { id: "rb-1", date: "June 05", status: "SUCCESS", vectors: 128, latency: "14ms" },
      { id: "rb-2", date: "June 12", status: "SUCCESS", vectors: 129, latency: "14ms" },
      { id: "rb-3", date: "June 19", status: "SUCCESS", vectors: 130, latency: "14ms" },
    ]
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (isDemoMode()) {
          const [ov, depts, rooms, risk, ins, ai, trends, weekly] = await Promise.all([
            getAnalyticsOverview(),
            getDepartmentRankings(),
            getClassroomIntelligence(),
            getRiskStudents(),
            getInsights(),
            getAIModelPerformance(),
            getDailyTrends(),
            getWeeklyComparison(),
          ]);
          setOverview(ov);
          setDepartments(depts);
          setClassrooms(rooms);
          setRiskStudents(risk);
          setInsights(ins);
          setAiModel(ai);
          setDailyTrends(trends);
          setWeeklyData(weekly);
        } else {
          let ovRes: any = null, deptsRes: any = null, riskRes: any = null;
          let insRes: any = null, recRes: any = null, unkRes: any = null, lrRes: any = null;
          
          try {
            [ovRes, deptsRes, riskRes, insRes, recRes, unkRes, lrRes] = await Promise.all([
              api.get<any>("/analytics/overview"),
              api.get<any>("/analytics/departments"),
              api.get<any>("/analytics/risk-students"),
              api.get<any>("/analytics/insights"),
              api.get<any>("/analytics/recognition"),
              api.get<any>("/analytics/unknown-faces"),
              api.get<any>("/analytics/continuous-learning"),
            ]);
          } catch (apiErr) {
            console.error("API error fetching analytics, will fall back to mocks:", apiErr);
          }

          const hasValidOverview = ovRes && ovRes.success && ovRes.data;

          if (!hasValidOverview) {
            console.warn("Analytics API returned failure or unauthorized. Falling back to mocks.");
            const [ov, depts, rooms, risk, ins, ai, trends, weekly] = await Promise.all([
              getAnalyticsOverview(),
              getDepartmentRankings(),
              getClassroomIntelligence(),
              getRiskStudents(),
              getInsights(),
              getAIModelPerformance(),
              getDailyTrends(),
              getWeeklyComparison(),
            ]);
            setOverview(ov);
            setDepartments(depts);
            setClassrooms(rooms);
            setRiskStudents(risk);
            setInsights(ins);
            setAiModel(ai);
            setDailyTrends(trends);
            setWeeklyData(weekly);
          } else {
            // Process successful API responses
            setOverview({
              totalStudents: ovRes.data.snapshot?.totalStudents ?? 130,
              totalTeachers: ovRes.data.totalTeachers ?? 5,
              averageAttendance: ovRes.data.snapshot?.attendanceRate ?? 93.8,
              aiRecognitionAccuracy: ovRes.data.snapshot?.aiAccuracy ?? 99.2,
              activeDevicesPercent: ovRes.data.snapshot?.totalDevices ? (ovRes.data.snapshot.activeDevices / ovRes.data.snapshot.totalDevices) * 100 : 100,
              presentToday: ovRes.data.snapshot?.presentToday ?? 122,
              averageEngagement: ovRes.data.snapshot?.averageEngagement ?? 88.5,
              totalAlerts: ovRes.data.snapshot?.behaviorAlerts ?? 0,
              studentsAtRisk: ovRes.data.snapshot?.studentsAtRisk ?? 2,
            });
            
            if (ovRes.data.snapshots) {
              setDailyTrends(ovRes.data.snapshots.map((s: any) => ({
                date: new Date(s.date).toLocaleDateString("en-US", { weekday: "short" }),
                attendance: s.attendanceRate,
                present: s.presentToday,
                total: s.totalStudents,
                engagement: s.averageEngagement,
                devices: s.activeDevices,
              })));
            }

            if (deptsRes && deptsRes.success && deptsRes.data?.departments?.length > 0) {
              setDepartments(deptsRes.data.departments.map((d: any) => ({
                name: d.departmentName || "Computer Science & Engineering",
                attendance: d.attendanceAverage || 93.8,
                engagement: d.engagementAverage || 88.5,
                performanceScore: d.performanceScore || 93.8,
                totalStudents: d.totalStudents || 130,
                alerts: d.totalAlerts || 0,
                trend: "up" as const,
              })));
            } else {
              getDepartmentRankings().then(setDepartments);
            }

            if (riskRes && riskRes.success && riskRes.data) {
              setRiskStudents(riskRes.data.students || []);
            } else {
              getRiskStudents().then(setRiskStudents);
            }

            if (insRes && insRes.success && insRes.data) {
              setInsights(insRes.data || []);
            } else {
              getInsights().then(setInsights);
            }

            if (recRes && recRes.success && recRes.data) {
              setRecMetrics({
                successRate: recRes.data.successRate,
                failures: recRes.data.failures,
                averageConfidence: recRes.data.averageConfidence,
                falsePositives: recRes.data.falsePositives,
                falseNegatives: recRes.data.falseNegatives,
                latencyMs: recRes.data.latencyMs,
              });
            }

            if (unkRes && unkRes.success && unkRes.data) {
              setUnkMetrics({
                today: unkRes.data.today,
                week: unkRes.data.week,
                month: unkRes.data.month,
                suggestedMatchAccuracy: unkRes.data.suggestedMatchAccuracy,
                approvalRate: unkRes.data.approvalRate,
                enrollmentConversionRate: unkRes.data.enrollmentConversionRate,
                activeClusters: unkRes.data.clusterStats?.activeClusters || 8,
                topRecurring: unkRes.data.topRecurring.map((r: any) => ({
                  clusterId: r.clusterId,
                  occurrences: r.occurrences,
                  match: r.possibleMatch ? `${r.possibleMatch} (${(r.confidence * 100).toFixed(0)}%)` : "Visitor / Unidentified",
                  confidence: r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : "N/A",
                })),
              });
            }

            if (lrRes && lrRes.success && lrRes.data) {
              setLearningMetrics({
                profileVersions: lrRes.data.profileVersionsCreated,
                candidateImages: lrRes.data.candidateImagesCaptured,
                optimizationRuns: lrRes.data.optimizationRuns,
                improvementRate: lrRes.data.recognitionImprovement,
                learningTrend: lrRes.data.learningAccuracyTrend,
                rebuildHistory: lrRes.data.faissRebuildHistory.map((h: any) => ({
                  id: h.id,
                  date: new Date(h.timestamp).toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
                  status: h.status,
                  vectors: h.vectorCount,
                  latency: `${h.timeTakenMs}ms`,
                })),
              });
            }

            getWeeklyComparison().then(setWeeklyData);
            getClassroomIntelligence().then(setClassrooms);
          }
        }
      } catch (err) {
        console.error("Error reading analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [dateRange, selectedDept, selectedClass, selectedSem]);

  const handleDismissInsight = (id: string) => {
    setAcknowledgedInsights((prev) => new Set(prev).add(id));
  };

  const activeInsights = insights.filter((i) => !i.isRead && !acknowledgedInsights.has(i.id));

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted">Analyzing Campus Telemetry...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: "University Overview" },
    { key: "attendance" as const, label: "Attendance Trends" },
    { key: "recognition" as const, label: "Recognition & Unknowns" },
    { key: "learning" as const, label: "Continuous Learning" },
    { key: "risk" as const, label: "Risk Profiles" },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">University Intelligence Center</h2>
          <p className="text-xs text-text-muted">AI-powered analytics, visual trends, and continuous learning diagnostics</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()} className="min-h-[40px]">Export Dashboard</Button>
          <a href="/dashboard/reports?tab=generate">
            <Button size="sm" className="min-h-[40px]">Generate Reports</Button>
          </a>
        </div>
      </div>

      {/* Filters Panel */}
      <GlassCard className="p-4" subtle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Time Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 3 Months</option>
              <option value="180">This Semester</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              <option value="CSE">Computer Science (CSE)</option>
              <option value="ECE">Electronics (ECE)</option>
              <option value="ME">Mechanical (ME)</option>
              <option value="BT">Biotechnology (BT)</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Classroom</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
            >
              <option value="ALL">All Classes</option>
              <option value="CSE301">CSE Lab 301</option>
              <option value="AI_RES">AI Research Lab</option>
              <option value="ECE202">ECE Lab 202</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Semester</label>
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
            >
              <option value="ALL">All Semesters</option>
              <option value="1">1st Sem</option>
              <option value="3">3rd Sem</option>
              <option value="5">5th Sem</option>
              <option value="7">7th Sem</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-glass-light border border-glass-border w-full sm:w-fit overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap",
              activeTab === tab.key
                ? "bg-ai-blue/20 text-ai-blue border border-ai-blue/20"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}

      {/* 1. OVERVIEW */}
      {activeTab === "overview" && (
        <motion.div key="overview" className="space-y-6" {...fadeUp}>
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Total Students</p>
              <p className="text-2xl font-bold text-text-primary">
                <AnimatedCounter value={overview.totalStudents} />
              </p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Total Teachers</p>
              <p className="text-2xl font-bold text-text-primary">
                <AnimatedCounter value={overview.totalTeachers ?? 5} />
              </p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Average Attendance</p>
              <p className="text-2xl font-bold text-success">
                <AnimatedCounter value={overview.averageAttendance} suffix="%" />
              </p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Recognition Accuracy</p>
              <p className="text-2xl font-bold text-ai-cyan">
                <AnimatedCounter value={overview.aiRecognitionAccuracy} suffix="%" />
              </p>
            </GlassCard>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Unknown Faces Today</p>
              <p className="text-xl font-bold text-warning">{unkMetrics.today}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Present Today</p>
              <p className="text-xl font-bold text-success">{overview.presentToday}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">AI Device Health</p>
              <p className="text-xl font-bold text-ai-purple">{overview.activeDevicesPercent.toFixed(0)}%</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Students at Risk</p>
              <p className="text-xl font-bold text-error">{overview.studentsAtRisk}</p>
            </GlassCard>
          </div>

          {/* Two-Column Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-4 font-mono">Daily Attendance & Engagement</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends.length ? dailyTrends : [
                    { date: "Mon", attendance: 92.5, engagement: 88, present: 120, total: 130, devices: 6 },
                    { date: "Tue", attendance: 92.9, engagement: 88, present: 121, total: 130, devices: 6 },
                    { date: "Wed", attendance: 93.3, engagement: 89, present: 121, total: 130, devices: 6 },
                    { date: "Thu", attendance: 93.7, engagement: 89, present: 122, total: 130, devices: 6 },
                    { date: "Fri", attendance: 94.1, engagement: 89, present: 122, total: 130, devices: 6 },
                    { date: "Sat", attendance: 94.9, engagement: 89, present: 123, total: 130, devices: 6 },
                  ]}>
                    <defs>
                      <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-glass-border)" />
                    <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={10} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={10} domain={[60, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="attendance" name="Attendance" stroke="#3B82F6" fillOpacity={1} fill="url(#colorAtt)" />
                    <Area type="monotone" dataKey="engagement" name="Engagement" stroke="#10B981" fillOpacity={1} fill="url(#colorEng)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-4 font-mono">Department Performance Ranking</h3>
              <div className="space-y-3">
                {departments.slice(0, 5).map((dept, i) => (
                  <div key={dept.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-primary font-medium">{i + 1}. {dept.name}</span>
                      <span className="font-semibold text-text-primary">{dept.performanceScore.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-glass-light overflow-hidden flex">
                      <div className="h-full bg-gradient-to-r from-ai-blue to-ai-purple rounded-full" style={{ width: `${dept.performanceScore}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* 2. ATTENDANCE TRENDS */}
      {activeTab === "attendance" && (
        <motion.div key="attendance" className="space-y-6" {...fadeUp}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Heatmap simulation */}
            <GlassCard className="lg:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2 font-mono">Attendance Heatmap (Hours vs Days)</h3>
              <p className="text-[10px] text-text-muted mb-4">Darker cells indicate higher recognition & attendance densities</p>
              
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[420px]">
                  <div className="grid grid-cols-8 gap-1 text-[9px] font-mono text-center">
                    <span />
                    {["9 AM", "10 AM", "11 AM", "12 PM", "2 PM", "3 PM", "4 PM"].map((h) => <span key={h} className="text-text-muted font-bold">{h}</span>)}
                    
                    {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, dIdx) => (
                      <>
                        <span key={day} className="text-left text-text-muted font-bold self-center">{day}</span>
                        {Array.from({ length: 7 }).map((_, hIdx) => {
                          const baseOpacity = 0.45 + (dIdx * 0.1) - (hIdx * 0.05) + Math.random() * 0.15;
                          const opacityVal = Math.min(1, Math.max(0.1, baseOpacity));
                          return (
                            <div
                              key={hIdx}
                              className="aspect-square rounded-md transition-all hover:scale-105 cursor-pointer"
                              style={{ backgroundColor: `rgba(16, 185, 129, ${opacityVal})` }}
                              title={`Density: ${(opacityVal * 100).toFixed(0)}%`}
                            />
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-4 font-mono">Attendance Rankings</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold text-success uppercase mb-2">Most Present Students</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span>Arjun Sharma</span><span className="font-mono text-success">100%</span></div>
                    <div className="flex justify-between"><span>Sneha Reddy</span><span className="font-mono text-success">99.2%</span></div>
                    <div className="flex justify-between"><span>Neha Joshi</span><span className="font-mono text-success">98.5%</span></div>
                  </div>
                </div>
                <div className="pt-2 border-t border-glass-border">
                  <h4 className="text-[10px] font-bold text-error uppercase mb-2">Most Absent Students</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span>Karan Nair</span><span className="font-mono text-error">42.1%</span></div>
                    <div className="flex justify-between"><span>Manish Bose</span><span className="font-mono text-error">58.4%</span></div>
                    <div className="flex justify-between"><span>Siddharth Saxena</span><span className="font-mono text-error">68.0%</span></div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <GlassCard>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-4 font-mono">Monthly Attendance Trends</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData.length ? weeklyData : [
                  { week: "Week 1", rate: 93.2 },
                  { week: "Week 2", rate: 94.8 },
                  { week: "Week 3", rate: 94.1 },
                  { week: "Week 4", rate: 95.6 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-glass-border)" />
                  <XAxis dataKey="week" stroke="var(--color-text-muted)" fontSize={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={10} domain={[80, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" name="Attendance Rate %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* 3. RECOGNITION & UNKNOWN FACES */}
      {activeTab === "recognition" && (
        <motion.div key="recognition" className="space-y-6" {...fadeUp}>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Recognition Success Rate</p>
              <p className="text-xl font-bold text-success">{recMetrics.successRate}%</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Avg AI Confidence</p>
              <p className="text-xl font-bold text-ai-blue">{(recMetrics.averageConfidence * 100).toFixed(0)}%</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">False Positives</p>
              <p className="text-xl font-bold text-error">{recMetrics.falsePositives}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">False Negatives</p>
              <p className="text-xl font-bold text-warning">{recMetrics.falseNegatives}</p>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Unknown Face Stats */}
            <GlassCard className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Unknown Face Analytics</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-glass-border pb-1">
                  <span className="text-text-secondary">Capture Rate Today:</span>
                  <span className="font-semibold text-text-primary">{unkMetrics.today} events</span>
                </div>
                <div className="flex justify-between border-b border-glass-border pb-1">
                  <span className="text-text-secondary">Capture Rate This Week:</span>
                  <span className="font-semibold text-text-primary">{unkMetrics.week} events</span>
                </div>
                <div className="flex justify-between border-b border-glass-border pb-1">
                  <span className="text-text-secondary">Match Accuracy Avg:</span>
                  <span className="font-semibold text-ai-cyan">{unkMetrics.suggestedMatchAccuracy}%</span>
                </div>
                <div className="flex justify-between border-b border-glass-border pb-1">
                  <span className="text-text-secondary">Cluster Approval Rate:</span>
                  <span className="font-semibold text-success">{unkMetrics.approvalRate}%</span>
                </div>
                <div className="flex justify-between border-b border-glass-border pb-1">
                  <span className="text-text-secondary">Enrollment Conversion:</span>
                  <span className="font-semibold text-text-primary">{unkMetrics.enrollmentConversionRate}%</span>
                </div>
              </div>
            </GlassCard>

            {/* Top Recurring Unknowns */}
            <GlassCard className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Top Recurring Unknown Face Clusters</h3>
              <div className="space-y-2.5">
                {unkMetrics.topRecurring.map((item) => (
                  <div key={item.clusterId} className="flex items-center justify-between p-2.5 rounded-lg border border-glass-border bg-glass-light hover:bg-glass-medium transition-all">
                    <div>
                      <p className="text-xs font-bold text-text-primary">{item.clusterId}</p>
                      <p className="text-[10px] text-text-muted">Detected {item.occurrences} times</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-ai-blue/10 text-ai-blue border border-ai-blue/20">
                        Suggest: {item.match}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* 4. CONTINUOUS LEARNING & MLOPS */}
      {activeTab === "learning" && (
        <motion.div key="learning" className="space-y-6" {...fadeUp}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Face Profiles Optimized</p>
              <p className="text-xl font-bold text-text-primary">{learningMetrics.profileVersions}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Candidate Images</p>
              <p className="text-xl font-bold text-ai-blue">{learningMetrics.candidateImages}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Model Optimization Runs</p>
              <p className="text-xl font-bold text-ai-purple">{learningMetrics.optimizationRuns}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-1">Accuracy Increase</p>
              <p className="text-xl font-bold text-success">+{learningMetrics.improvementRate}%</p>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accuracy Line Chart */}
            <GlassCard>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-4 font-mono">Learning Accuracy Trend</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={learningMetrics.learningTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" />
                    <XAxis dataKey="version" stroke="var(--color-text-muted)" fontSize={10} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={10} domain={[95, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Directory Synchronization Logs */}
            <GlassCard className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Directory Index Synchronization History</h3>
              <div className="divide-y divide-glass-border">
                {learningMetrics.rebuildHistory.map((log) => (
                  <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-text-primary">{log.date} Synchronization Log</p>
                      <p className="text-[10px] text-text-muted">{log.vectors.toLocaleString()} biometric profiles indexed</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-text-muted block">Duration: {log.latency}</span>
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-success/15 text-success">
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* 5. RISK PROFILES */}
      {activeTab === "risk" && (
        <motion.div key="risk" className="space-y-6" {...fadeUp}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">High Risk Students</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted uppercase text-[9px]">
                      <th className="py-2">Student</th>
                      <th className="py-2">Dept</th>
                      <th className="py-2 text-center">Attendance Risk</th>
                      <th className="py-2 text-center">Engagement Risk</th>
                      <th className="py-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {riskStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-glass-light transition-colors">
                        <td className="py-2.5">
                          <p className="font-medium text-text-primary">{s.name}</p>
                          <p className="text-[9px] text-text-muted">{s.studentId}</p>
                        </td>
                        <td className="py-2.5 text-text-secondary">{s.department}</td>
                        <td className="py-2.5 text-center font-mono">{s.attendanceRisk}%</td>
                        <td className="py-2.5 text-center font-mono">{s.engagementRisk}%</td>
                        <td className="py-2.5 text-right font-mono font-bold text-error">{s.overallRisk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Risk Distribution Pie Chart */}
            <GlassCard className="space-y-4 flex flex-col items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary self-start font-mono">Risk Distribution</h3>
              <div className="h-48 w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Low", value: 45 },
                        { name: "Medium", value: 30 },
                        { name: "High", value: 15 },
                        { name: "Critical", value: 10 },
                      ]}
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {[
                        { name: "Low", value: 45 },
                        { name: "Medium", value: 30 },
                        { name: "High", value: 15 },
                        { name: "Critical", value: 10 },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] w-full text-center">
                <div className="flex items-center gap-1.5 justify-center"><span className="h-2 w-2 rounded bg-[#10B981]" /> Low (45%)</div>
                <div className="flex items-center gap-1.5 justify-center"><span className="h-2 w-2 rounded bg-[#3B82F6]" /> Medium (30%)</div>
                <div className="flex items-center gap-1.5 justify-center"><span className="h-2 w-2 rounded bg-[#F59E0B]" /> High (15%)</div>
                <div className="flex items-center gap-1.5 justify-center"><span className="h-2 w-2 rounded bg-[#EF4444]" /> Critical (10%)</div>
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}
    </div>
  );
}
