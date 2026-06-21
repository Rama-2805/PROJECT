"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { Teacher } from "@/lib/mock/teachers";
import { Key, X } from "lucide-react";

interface TeacherCardProps {
  teacher: Teacher & { isCustom?: boolean };
  onView?: (id: string) => void;
  onResetPassword?: (email: string) => void;
  onEdit?: (email: string) => void;
  onDelete?: (email: string) => void;
}

export function TeacherCard({ teacher, onView, onResetPassword, onEdit, onDelete }: TeacherCardProps) {
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

      <div className="pt-3 border-t border-glass-border flex justify-between items-center">
        <a
          href={`mailto:${teacher.email}`}
          className="text-[10px] text-ai-blue hover:underline truncate max-w-[120px]"
          onClick={(e) => e.stopPropagation()}
        >
          {teacher.email}
        </a>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {teacher.isCustom && (
            <>
              <button
                className="p-1 rounded hover:bg-glass-light transition-colors text-text-muted hover:text-blue-500"
                onClick={() => onEdit?.(teacher.email)}
                title="Edit Faculty Details"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                className="p-1 rounded hover:bg-glass-light transition-colors text-text-muted hover:text-red-500"
                onClick={() => onDelete?.(teacher.email)}
                title="Delete Faculty Account"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            className="p-1 rounded hover:bg-glass-light transition-colors text-text-muted hover:text-amber-400"
            onClick={() => onResetPassword?.(teacher.email)}
            title="Reset Password directly"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
