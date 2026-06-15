"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getSubjects, type Subject } from "@/lib/mock/subjects";
import { getDepartments, type Department } from "@/lib/mock/departments";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  useEffect(() => {
    Promise.all([getSubjects(), getDepartments()]).then(([subjectsData, deptsData]) => {
      setSubjects(subjectsData);
      setDepartments(deptsData);
      setLoading(false);
    });
  }, []);

  const semesters = [...new Set(subjects.map((s) => s.semester))].sort((a, b) => a - b);

  const filtered = subjects.filter((s) => {
    if (selectedDept && s.departmentId !== selectedDept) return false;
    if (selectedSemester && s.semester !== parseInt(selectedSemester)) return false;
    return true;
  });

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Subject Management</h2>
          <p className="text-xs text-text-muted">Manage subjects, teacher assignments, and syllabus information</p>
        </div>
        <Button size="sm">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Subject
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Total Subjects</p>
          <p className="text-xl font-bold text-text-primary">{subjects.length}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Active Subjects</p>
          <p className="text-xl font-bold text-success">{subjects.filter((s) => s.isActive).length}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">With Teachers Assigned</p>
          <p className="text-xl font-bold text-ai-blue">{subjects.filter((s) => s.teacherId).length}</p>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDept("")}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", !selectedDept ? "bg-ai-blue text-white" : "glass text-text-dim hover:text-text-primary")}
          >
            All Departments
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDept(d.id)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", selectedDept === d.id ? "bg-ai-blue text-white" : "glass text-text-dim hover:text-text-primary")}
            >
              {d.code}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-glass-border mx-1 hidden sm:block" />
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="h-8 px-2.5 rounded-lg text-xs bg-glass-light border border-glass-border text-text-primary focus:outline-none focus:border-ai-blue/40"
        >
          <option value="">All Semesters</option>
          {semesters.map((s) => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>
      </div>

      {/* Subjects List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((subject, i) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-card p-4 border border-glass-border hover:border-ai-blue/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-ai-cyan to-ai-blue flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-white">{subject.code}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{subject.name}</p>
                    <p className="text-[10px] text-text-muted">
                      {subject.departmentName} • Sem {subject.semester} • {subject.credits} credits
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted">Teacher</p>
                    <p className="text-xs text-text-secondary">{subject.teacherName || <span className="italic text-warning">Unassigned</span>}</p>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", subject.isActive ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
                    {subject.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
