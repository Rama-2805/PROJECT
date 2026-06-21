"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Brain, TrendingUp, AlertTriangle, 
  Clock, Shield, CheckCircle2, Book, FileText, BarChart3, User, Calendar, Award
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { initializeUserStore, getUsers } from "@/lib/userStore";

const TABS = ["Overview", "Attendance", "Subjects", "Reports", "Analytics", "AI Insights"];

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.id as string;
  const [activeTab, setActiveTab] = useState("Overview");

  // Load student profile dynamically
  const student = useMemo(() => {
    if (typeof window === "undefined") return {
      name: "John Doe",
      studentId: "1VI23CS001",
      email: "john.doe@vemana.edu.in",
      department: "CSE",
      semester: 1,
      attendance: 94,
      engagement: 90,
      riskLevel: "LOW",
      status: "ACTIVE"
    };

    initializeUserStore();
    const users = getUsers();
    const customUser = users[studentId] || Object.values(users).find(u => u.studentId === studentId);
    
    if (customUser) {
      return {
        name: customUser.fullName,
        studentId: customUser.studentId || "1VI23CS001",
        email: customUser.email,
        department: customUser.department || "CSE",
        semester: customUser.semester || 1,
        attendance: 94,
        engagement: 90,
        riskLevel: "LOW",
        status: "ACTIVE"
      };
    }
    
    // Match mock list pattern
    const mockNum = parseInt(studentId.replace(/[^\d]/g, ""), 10);
    if (!isNaN(mockNum)) {
      return {
        name: `Student ${mockNum - 10000 + 1}`,
        studentId: studentId,
        email: `student.${studentId.toLowerCase()}@vemana.edu.in`,
        department: "CSE",
        semester: 6,
        attendance: 88,
        engagement: 82,
        riskLevel: "MEDIUM",
        status: "ACTIVE"
      };
    }

    return {
      name: "Manjunatha Prasad",
      studentId: "1VI23CS001",
      email: "manjunatha.cs2023@vemana.edu.in",
      department: "CSE",
      semester: 1,
      attendance: 91,
      engagement: 88,
      riskLevel: "LOW",
      status: "ACTIVE"
    };
  }, [studentId]);

  // Generate subjects dynamically based on semester
  const subjects = useMemo(() => {
    const sem = student.semester;
    return [
      { code: `BCS${sem}01`, name: "Advanced Mathematics", credits: 4, type: "Core" },
      { code: `BCS${sem}02`, name: "Computer Networks & Security", credits: 4, type: "Core" },
      { code: `BCS${sem}03`, name: "Design & Analysis of Algorithms", credits: 4, type: "Core" },
      { code: `BCS${sem}04`, name: "Software Engineering & MLOps", credits: 3, type: "Core" },
      { code: `BCS${sem}05`, name: "AI & Neural Networks Lab", credits: 2, type: "Practical" }
    ];
  }, [student.semester]);

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/dashboard/students')}
          className="p-2 rounded-full bg-glass-light border border-glass-border hover:bg-glass-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">Student Profile</h1>
          <p className="text-sm text-text-muted mt-1">Institutional Academic & Attendance Analytics</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Identity Card */}
        <div className="col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-bg-secondary/95 border border-glass-border backdrop-blur-md relative overflow-hidden shadow-glass">
            <div className="absolute top-0 right-0 p-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-3 h-3" /> ACTIVE
              </span>
            </div>

            <div className="flex flex-col items-center mt-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-[1px]">
                <div className="w-full h-full rounded-full border-2 border-bg-primary overflow-hidden bg-bg-secondary flex items-center justify-center">
                  <span className="text-3xl font-bold text-text-primary">{student.name.charAt(0)}</span>
                </div>
              </div>
              <h2 className="mt-4 text-xl font-bold text-text-primary">{student.name}</h2>
              <p className="text-xs text-text-muted font-mono mt-1">{student.studentId}</p>
              
              <div className="mt-6 w-full space-y-3.5 border-t border-glass-border pt-4 text-xs text-text-secondary">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted flex items-center gap-2"><User className="w-3.5 h-3.5"/> Department</span>
                  <span className="text-text-primary font-semibold">{student.department}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted flex items-center gap-2"><Calendar className="w-3.5 h-3.5"/> Semester</span>
                  <span className="text-text-primary font-semibold">{student.semester} (Sem)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> Email</span>
                  <span className="text-text-primary font-semibold truncate max-w-[160px]" title={student.email}>{student.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent border border-glass-border backdrop-blur-md shadow-glass">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-text-primary text-sm tracking-wide">AI Campus Brain Insights</h3>
            </div>
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-200 leading-normal">
                  <span className="font-bold text-emerald-400">Streak:</span> 100% presence registered across all classes in the last 7 working days.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-200 leading-normal">
                  <span className="font-bold text-blue-400">Profile:</span> Highly collaborative class participant with excellent focus engagement index (91%).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Tabs & Content */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Tab Selector */}
          <div className="flex overflow-x-auto gap-1.5 p-1.5 bg-glass-light border border-glass-border rounded-xl backdrop-blur-md">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all whitespace-nowrap cursor-pointer",
                  activeTab === tab 
                    ? "bg-text-primary text-bg-primary font-bold shadow-md" 
                    : "text-text-secondary hover:text-text-primary hover:bg-glass-medium"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Display Panel */}
          <div className="p-6 rounded-2xl bg-bg-secondary/95 border border-glass-border backdrop-blur-md min-h-[500px] shadow-glass">
            
            {/* 1. Overview */}
            {activeTab === "Overview" && (
              <div className="space-y-6 text-xs text-text-secondary">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-glass-light border border-glass-border">
                    <div className="text-text-muted mb-1 text-[10px] uppercase font-bold tracking-wider">Attendance</div>
                    <div className="text-xl font-bold text-text-primary">{student.attendance}%</div>
                    <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Healthy threshold</div>
                  </div>
                  <div className="p-4 rounded-xl bg-glass-light border border-glass-border">
                    <div className="text-text-muted mb-1 text-[10px] uppercase font-bold tracking-wider">Engagement</div>
                    <div className="text-xl font-bold text-text-primary">{student.engagement}%</div>
                    <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +2.1% focus today</div>
                  </div>
                  <div className="p-4 rounded-xl bg-glass-light border border-glass-border">
                    <div className="text-text-muted mb-1 text-[10px] uppercase font-bold tracking-wider">Behavior Index</div>
                    <div className="text-xl font-bold text-text-primary">98/100</div>
                    <div className="text-[10px] text-text-muted mt-1">Excellent character</div>
                  </div>
                  <div className="p-4 rounded-xl bg-glass-light border border-glass-border">
                    <div className="text-text-muted mb-1 text-[10px] uppercase font-bold tracking-wider">Risk Level</div>
                    <div className="text-xl font-bold text-emerald-400">{student.riskLevel}</div>
                    <div className="text-[10px] text-emerald-400 mt-1">No alerts</div>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-sm font-bold text-text-primary mb-3">AI 30-Day Activity Trends</h3>
                  <div className="h-44 w-full flex items-end gap-2 border-b border-l border-glass-border p-4 pb-0 relative">
                    <div className="flex-1 bg-blue-500/30 border border-blue-500/50 h-[80%] rounded-t" />
                    <div className="flex-1 bg-purple-500/30 border border-purple-500/50 h-[92%] rounded-t" />
                    <div className="flex-1 bg-blue-500/30 border border-blue-500/50 h-[85%] rounded-t" />
                    <div className="flex-1 bg-purple-500/30 border border-purple-500/50 h-[97%] rounded-t" />
                    <div className="flex-1 bg-blue-500/30 border border-blue-500/50 h-[90%] rounded-t" />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Attendance */}
            {activeTab === "Attendance" && (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-glass-border">
                  <h3 className="font-bold text-text-primary text-sm">Attendance Records</h3>
                  <span className="text-text-muted">Filtered by Active Semester</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-text-secondary">
                    <thead>
                      <tr className="border-b border-glass-border text-text-muted">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Subject</th>
                        <th className="py-2.5">Classroom</th>
                        <th className="py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border/30">
                      <tr>
                        <td className="py-2.5">2026-06-21</td>
                        <td>BCS{student.semester}01</td>
                        <td>Room 302</td>
                        <td><span className="text-emerald-400 font-bold">PRESENT (AI Camera)</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5">2026-06-20</td>
                        <td>BCS{student.semester}02</td>
                        <td>Room 104</td>
                        <td><span className="text-emerald-400 font-bold">PRESENT (AI Camera)</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5">2026-06-19</td>
                        <td>BCS{student.semester}03</td>
                        <td>Lab 2</td>
                        <td><span className="text-emerald-400 font-bold">PRESENT (Selfie Check)</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. Subjects */}
            {activeTab === "Subjects" && (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-glass-border">
                  <h3 className="font-bold text-text-primary text-sm">Curriculum Subjects</h3>
                  <span className="text-text-muted">Auto-assigned for Semester {student.semester}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((sub) => (
                    <div key={sub.code} className="p-4 rounded-xl bg-glass-light border border-glass-border flex justify-between items-center">
                      <div>
                        <div className="font-mono text-[10px] text-blue-400 uppercase tracking-wider font-bold">{sub.code}</div>
                        <h4 className="font-bold text-text-primary text-sm mt-0.5">{sub.name}</h4>
                        <div className="text-[10px] text-text-muted mt-1">{sub.credits} Credits • {sub.type}</div>
                      </div>
                      <Book className="w-5 h-5 text-text-muted" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Reports */}
            {activeTab === "Reports" && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-text-primary text-sm pb-2 border-b border-glass-border">Available Reports</h3>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-glass-light border border-glass-border flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-text-primary">Monthly Attendance Report</h4>
                      <p className="text-[10px] text-text-muted mt-0.5">Comprehensive PDF log of daily presence alerts</p>
                    </div>
                    <button className="px-3.5 py-1.5 rounded-lg bg-text-primary text-bg-primary text-[10px] font-bold cursor-pointer">Download PDF</button>
                  </div>
                  <div className="p-3.5 rounded-xl bg-glass-light border border-glass-border flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-text-primary">AI Engagement Summary</h4>
                      <p className="text-[10px] text-text-muted mt-0.5">Focus tracking trends and anomalies across classes</p>
                    </div>
                    <button className="px-3.5 py-1.5 rounded-lg bg-text-primary text-bg-primary text-[10px] font-bold cursor-pointer">Download CSV</button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Analytics */}
            {activeTab === "Analytics" && (
              <div className="space-y-6 text-xs">
                <h3 className="font-bold text-text-primary text-sm pb-2 border-b border-glass-border">Advanced AI Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-glass-light border border-glass-border">
                    <h4 className="font-bold text-text-primary mb-2 flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-purple-400"/> Subject Focus Index</h4>
                    <p className="text-text-muted mb-4">Focus percentage across class durations.</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>BCS{student.semester}01</span>
                          <span>94%</span>
                        </div>
                        <div className="w-full h-1.5 bg-glass-border rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: "94%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>BCS{student.semester}02</span>
                          <span>88%</span>
                        </div>
                        <div className="w-full h-1.5 bg-glass-border rounded-full overflow-hidden">
                          <div className="bg-purple-500 h-full" style={{ width: "88%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-glass-light border border-glass-border flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-text-primary mb-1 flex items-center gap-1.5"><Award className="w-4 h-4 text-blue-400"/> Behavior Rank</h4>
                      <p className="text-text-muted mt-1 leading-relaxed">Student ranks in top 5% of department for system safety, camera verification compliance, and rule compliance.</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold rounded-lg text-center mt-4">
                      Excellent Compliance Record
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. AI Insights */}
            {activeTab === "AI Insights" && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-text-primary text-sm pb-2 border-b border-glass-border">AI Campus Brain Logs</h3>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-glass-border bg-glass-light flex gap-3 items-start">
                    <Brain className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-text-primary">High Focus Alert</div>
                      <p className="text-text-secondary mt-0.5">Algorithm detected 95% focus metric for Advanced Mathematics class. Highly cooperative behaviors verified.</p>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-glass-border bg-glass-light flex gap-3 items-start">
                    <Shield className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-text-primary">Camera Check In Verified</div>
                      <p className="text-text-secondary mt-0.5">Matched model embeddings at Main Block Gate. Confidence coefficient: 99.8%.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
