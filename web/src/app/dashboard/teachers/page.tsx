"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { TeacherCard } from "@/components/teachers/TeacherCard";
import { getTeachers, type Teacher } from "@/lib/mock/teachers";
import { getDepartments, type Department } from "@/lib/mock/departments";
import { cn } from "@/lib/utils/cn";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("");

  useEffect(() => {
    Promise.all([getTeachers(), getDepartments()]).then(([teachersData, deptsData]) => {
      setTeachers(teachersData);
      setDepartments(deptsData);
      setLoading(false);
    });
  }, []);

  const filtered = selectedDept
    ? teachers.filter((t) => t.departmentId === selectedDept)
    : teachers;

  const activeTeachers = filtered.filter((t) => t.isActive).length;
  const totalSessions = filtered.reduce((sum, t) => sum + t.classSessionsCount, 0);
  const totalSubjects = filtered.reduce((sum, t) => sum + t.subjectsCount, 0);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Teacher Management</h2>
          <p className="text-xs text-text-muted">Manage faculty members, assignments, and schedules</p>
        </div>
        <Button size="sm">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Teacher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Total Faculty</p>
          <p className="text-xl font-bold text-text-primary">{filtered.length}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Active Teachers</p>
          <p className="text-xl font-bold text-success">{activeTeachers}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Weekly Sessions</p>
          <p className="text-xl font-bold text-ai-purple">{totalSessions}</p>
        </GlassCard>
      </div>

      {/* Department Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedDept("")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            !selectedDept ? "bg-ai-blue text-black font-semibold" : "glass text-text-dim hover:text-text-primary",
          )}
        >
          All Departments
        </button>
        {departments.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDept(d.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              selectedDept === d.id ? "bg-ai-blue text-black font-semibold" : "glass text-text-dim hover:text-text-primary",
            )}
          >
            {d.code}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((teacher, i) => (
            <motion.div
              key={teacher.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <TeacherCard teacher={teacher} />
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
