"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getCourses, type Course } from "@/lib/mock/courses";
import { getDepartments, type Department } from "@/lib/mock/departments";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("");

  useEffect(() => {
    Promise.all([getCourses(), getDepartments()]).then(([coursesData, deptsData]) => {
      setCourses(coursesData);
      setDepartments(deptsData);
      setLoading(false);
    });
  }, []);

  const filtered = selectedDept
    ? courses.filter((c) => c.departmentId === selectedDept)
    : courses;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Course Management</h2>
          <p className="text-xs text-text-muted">Manage academic programs and courses across departments</p>
        </div>
        <Button size="sm">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Course
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Total Courses</p>
          <p className="text-xl font-bold text-text-primary">{courses.length}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Total Students Enrolled</p>
          <p className="text-xl font-bold text-ai-blue">
            {courses.reduce((sum, c) => sum + c.studentsCount, 0).toLocaleString()}
          </p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Departments</p>
          <p className="text-xl font-bold text-ai-purple">{departments.length}</p>
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

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-card p-4 border border-glass-border hover:border-ai-blue/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-ai-purple to-ai-cyan flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">{course.code}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{course.name}</p>
                    <p className="text-[10px] text-text-muted">{course.departmentName} • {course.duration} • {course.credits} credits</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-bold text-ai-blue">{course.studentsCount.toLocaleString()}</p>
                    <p className="text-[9px] text-text-muted">Students</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-ai-purple">{course.subjectsCount}</p>
                    <p className="text-[9px] text-text-muted">Subjects</p>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                    course.isActive ? "bg-success/10 text-success" : "bg-error/10 text-error",
                  )}>
                    {course.isActive ? "Active" : "Inactive"}
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
