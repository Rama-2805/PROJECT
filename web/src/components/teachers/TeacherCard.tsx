"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { Teacher } from "@/lib/mock/teachers";

interface TeacherCardProps {
  teacher: Teacher;
  onView?: (id: string) => void;
}

export function TeacherCard({ teacher, onView }: TeacherCardProps) {
  const initials = teacher.fullName.replace("Dr. ", "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      className="glass rounded-card p-4 border border-glass-border hover:border-ai-purple/20 transition-all duration-300 group cursor-pointer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => onView?.(teacher.id)}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-ai-purple to-ai-cyan flex items-center justify-center text-sm font-bold text-white shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary">{teacher.fullName}</p>
          <p className="text-[10px] text-text-muted">{teacher.employeeId} • {teacher.specialization}</p>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
          teacher.isActive
            ? "bg-success/10 text-success border-success/20"
            : "bg-error/10 text-error border-error/20",
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full", teacher.isActive ? "bg-success" : "bg-error")} />
          {teacher.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Department</span>
          <span className="text-text-secondary">{teacher.departmentName}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Subjects</span>
          <span className="text-text-secondary">{teacher.subjectsCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Weekly Sessions</span>
          <span className="text-text-secondary">{teacher.classSessionsCount}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-glass-border">
        <a
          href={`mailto:${teacher.email}`}
          className="text-[10px] text-ai-blue hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {teacher.email}
        </a>
      </div>
    </motion.div>
  );
}
