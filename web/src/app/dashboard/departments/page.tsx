"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getDepartments, type Department } from "@/lib/mock/departments";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDepartments().then((data) => {
      setDepartments(data);
      setLoading(false);
    });
  }, []);

  const totalStudents = departments.reduce((sum, d) => sum + d.studentCount, 0);
  const totalTeachers = departments.reduce((sum, d) => sum + d.teacherCount, 0);
  const totalClassrooms = departments.reduce((sum, d) => sum + d.classroomCount, 0);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Department Management</h2>
          <p className="text-xs text-text-muted">Manage academic departments across the institution</p>
        </div>
        <Button size="sm">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Department
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Total Departments</p>
          <p className="text-xl font-bold text-text-primary">{departments.length}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Total Students</p>
          <p className="text-xl font-bold text-text-primary">{totalStudents.toLocaleString()}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Total Teachers</p>
          <p className="text-xl font-bold text-text-primary">{totalTeachers}</p>
        </GlassCard>
      </div>

      {/* Department Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, i) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-card p-5 border border-glass-border hover:border-ai-blue/20 transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-ai-blue to-ai-cyan flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">{dept.code}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{dept.name}</p>
                  <p className="text-[10px] text-text-muted">HOD: {dept.hodName}</p>
                </div>
              </div>

              <p className="text-[10px] text-text-muted mb-4 line-clamp-2">{dept.description}</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-glass-light">
                  <p className="text-sm font-bold text-ai-blue">{dept.studentCount.toLocaleString()}</p>
                  <p className="text-[9px] text-text-muted">Students</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-glass-light">
                  <p className="text-sm font-bold text-ai-purple">{dept.teacherCount}</p>
                  <p className="text-[9px] text-text-muted">Teachers</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-glass-light">
                  <p className="text-sm font-bold text-ai-cyan">{dept.classroomCount}</p>
                  <p className="text-[9px] text-text-muted">Rooms</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-glass-border flex items-center justify-between">
                <span className="text-[10px] text-text-muted">{dept.courseCount} Courses</span>
                <Button variant="ghost" size="sm">View Details</Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
