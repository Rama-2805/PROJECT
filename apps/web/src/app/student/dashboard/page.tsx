"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedText } from "@/components/ui/animated-text";
import { getUsers } from "@/lib/userStore";
import { 
  CheckSquare, 
  ScanFace, 
  Bell, 
  User, 
  Clock, 
  MapPin, 
  Calendar, 
  ShieldCheck,
  TrendingUp
} from "lucide-react";

import { apiRequest } from "@/lib/api/client";

export default function StudentDashboardPage() {
  const [studentInfo, setStudentInfo] = useState({
    fullName: "",
    email: "",
    department: "Computer Science & Engineering",
    semester: "Semester 4",
    id: "—"
  });

  useEffect(() => {
    async function loadStudentProfile() {
      try {
        const res = await apiRequest<any>("/auth/profile");
        if (res && res.success && res.data) {
          const user = res.data;
          const stu = user.student || {};
          const name = stu.fullName || user.fullName || "Student";
          const usn = stu.studentId || user.studentId || "—";
          const dept = stu.department?.name || user.department || "Computer Science & Engineering";
          const sem = stu.semester ? `Semester ${stu.semester}` : "Semester 4";

          setStudentInfo({
            fullName: name,
            email: user.email,
            department: dept,
            semester: sem,
            id: usn
          });
          localStorage.setItem("currentUserName", name);
          localStorage.setItem("currentUserEmail", user.email);
          localStorage.setItem("currentUserUSN", usn);
          return;
        }
      } catch (err) {}

      if (typeof window !== "undefined") {
        const email = localStorage.getItem("currentUserEmail") || "";
        const name = localStorage.getItem("currentUserName");
        const usn = localStorage.getItem("currentUserUSN");
        const users = getUsers();
        if (email && users[email]) {
          setStudentInfo({
            fullName: users[email].fullName,
            email: users[email].email,
            department: users[email].department || "Computer Science & Engineering",
            semester: users[email].semester ? `Semester ${users[email].semester}` : "Semester 4",
            id: users[email].studentId || "—"
          });
        } else if (email) {
          setStudentInfo({
            fullName: name || "Student",
            email: email,
            department: "Computer Science & Engineering",
            semester: "Semester 4",
            id: usn || "—"
          });
        }
      }
    }
    loadStudentProfile();
  }, []);

  const stats = [
    { label: "Overall Attendance", value: "94.2%", icon: CheckSquare, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "AI Biometric Status", value: "Enrolled", icon: ScanFace, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Registered Courses", value: "6 Classes", icon: Clock, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Alerts & Notifications", value: "2 Unread", icon: Bell, color: "text-amber-400", bg: "bg-amber-500/10" }
  ];

  const todayClasses = [
    { code: "CS-301", name: "Advanced Data Structures", time: "10:00 AM - 11:30 AM", room: "Room 402", professor: "Dr. Sarah Jenkins", status: "Present" },
    { code: "CS-402", name: "Artificial Intelligence & ML", time: "02:00 PM - 03:30 PM", room: "Seminar Hall 1", professor: "Dr. Vikram Singh", status: "Upcoming" },
    { code: "CS-101", name: "Introduction to Programming Lab", time: "04:00 PM - 05:30 PM", room: "Lab 3", professor: "Dr. Priya Sharma", status: "Upcoming" }
  ];

  const recentScans = [
    { date: "June 19, 2026", time: "10:02 AM", course: "Advanced Data Structures", device: "CAM-402-A", confidence: "99.4%", status: "Present" },
    { date: "June 18, 2026", time: "02:05 PM", course: "Artificial Intelligence & ML", device: "CAM-SEM-1", confidence: "98.7%", status: "Present" },
    { date: "June 17, 2026", time: "10:03 AM", course: "Advanced Data Structures", device: "CAM-402-A", confidence: "99.1%", status: "Present" },
    { date: "June 16, 2026", time: "09:05 AM", course: "Introduction to Programming", device: "CAM-LAB-3", confidence: "98.9%", status: "Present" }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Greeting */}
      <div className="border-b border-glass-border pb-4">
        <AnimatedText
          text={`Welcome back, ${studentInfo.fullName}`}
          className="items-start justify-start"
          textClassName="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-text-primary via-text-primary to-text-secondary bg-clip-text text-transparent tracking-tight text-left"
          underlineClassName="text-blue-500/80"
        />
        <p className="text-xs text-text-muted mt-1.5 font-mono">ID: {studentInfo.id} • {studentInfo.department} Department • Semester {studentInfo.semester}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="p-4 flex items-center justify-between hover:border-blue-500/20 transition-all">
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-mono">{stat.label}</p>
                <p className="text-xl font-bold text-text-primary mt-1">{stat.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns (Schedule) */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-5 relative overflow-hidden">
            {/* Ambient subtle light gradient */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent blur-xs" />
            <div className="flex items-center justify-between mb-4 border-b border-glass-border pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-text-primary font-mono uppercase tracking-wider">Today's Class Schedule</h3>
              </div>
              <span className="text-[10px] font-mono text-text-muted uppercase">June 20, 2026</span>
            </div>

            <div className="space-y-3">
              {todayClasses.map((cls) => (
                <div 
                  key={cls.code}
                  className="p-4 rounded-xl border border-glass-border bg-glass-light/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-blue-500/20 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                        {cls.code}
                      </span>
                      <h4 className="text-xs font-semibold text-text-primary">{cls.name}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-text-muted">
                      <span className="flex items-center gap-1 font-mono"><Clock className="w-3.5 h-3.5" /> {cls.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {cls.room}</span>
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {cls.professor}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                      cls.status === "Present" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }`}>
                      {cls.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Biometric Verification log */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-glass-border pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-text-primary font-mono uppercase tracking-wider">AI Face Attendance Logs</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-glass-border text-text-muted font-mono uppercase tracking-wider">
                    <th className="pb-2 font-medium">Date / Time</th>
                    <th className="pb-2 font-medium">Course</th>
                    <th className="pb-2 font-medium">Scanner</th>
                    <th className="pb-2 font-medium text-right">Confidence</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border/30">
                  {recentScans.map((scan, i) => (
                    <tr key={i} className="hover:bg-glass-light/10 transition-colors">
                      <td className="py-2.5 font-mono text-text-primary">
                        <div>{scan.date}</div>
                        <div className="text-[10px] text-text-muted">{scan.time}</div>
                      </td>
                      <td className="py-2.5 font-medium text-text-primary">{scan.course}</td>
                      <td className="py-2.5 font-mono text-text-muted">{scan.device}</td>
                      <td className="py-2.5 text-right font-mono text-emerald-400 font-semibold">{scan.confidence}</td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono">
                          {scan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Right Column (Status Cards / Actions) */}
        <div className="space-y-6">
          <GlassCard className="p-5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 p-0.5 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <div className="w-full h-full rounded-full bg-bg-secondary flex items-center justify-center border border-glass-border">
                <ScanFace className="w-9 h-9 text-blue-400" />
              </div>
            </div>

            <h4 className="text-sm font-semibold text-text-primary font-mono uppercase tracking-wider">AI Biometric Identity</h4>
            <p className="text-[10px] text-text-muted mt-1">Enrollment active. Verified via campus neural net templates.</p>
            
            <div className="w-full border-t border-glass-border/50 mt-4 pt-4 space-y-2 text-left font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-text-muted">Template ID:</span>
                <span className="text-text-secondary">FACE-STU-10024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Verification Status:</span>
                <span className="text-emerald-400 font-bold">MATCH SECURED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Last Verified:</span>
                <span className="text-text-secondary">Today, 10:02 AM</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-400" /> Performance Metrics
            </h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">Attendance Target</span>
                  <span className="font-mono text-text-primary">94.2% / 85.0%</span>
                </div>
                <div className="w-full h-2 bg-glass-border rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "94.2%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">AI Verification Success</span>
                  <span className="font-mono text-text-primary">100% (24/24)</span>
                </div>
                <div className="w-full h-2 bg-glass-border rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
