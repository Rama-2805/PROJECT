"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { EnrollmentStatusBadge } from "./EnrollmentStatusBadge";
import { AttendanceProgress } from "./AttendanceProgress";
import type { Student } from "@/lib/mock/students";

interface StudentCardProps {
  student: Student;
  onView?: (id: string) => void;
}

export function StudentCard({ student, onView }: StudentCardProps) {
  const initials = student.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      className="glass rounded-card p-4 border border-glass-border hover:border-ai-blue/20 transition-all duration-300 group cursor-pointer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => onView?.(student.id)}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
          student.faceEnrolled
            ? "bg-gradient-to-br from-ai-blue to-ai-purple text-white"
            : "bg-glass-heavy text-text-muted",
        )}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">{student.fullName}</p>
          <p className="text-[10px] text-text-muted">{student.studentId} • {student.rollNumber}</p>
        </div>
        <EnrollmentStatusBadge
          enrolled={student.faceEnrolled}
          confidence={student.enrollmentConfidence}
          samples={student.faceSamples}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">Department</p>
          <p className="text-xs text-text-secondary truncate">{student.departmentName}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">Semester</p>
          <p className="text-xs text-text-secondary">{student.semester} • Section {student.section}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Attendance</span>
          <span className="text-[10px] text-text-muted">Engagement</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <AttendanceProgress percentage={student.attendancePercentage} size="sm" showLabel={false} />
          </div>
          <div className="flex-1">
            <AttendanceProgress percentage={student.engagementScore} size="sm" showLabel={false} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-[10px] font-medium",
            student.attendancePercentage >= 90 ? "text-success" : student.attendancePercentage >= 75 ? "text-warning" : "text-error",
          )}>
            {student.attendancePercentage}%
          </span>
          <span className={cn(
            "text-[10px] font-medium",
            student.engagementScore >= 85 ? "text-success" : student.engagementScore >= 70 ? "text-warning" : "text-error",
          )}>
            {student.engagementScore}%
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            student.status === "ACTIVE" ? "bg-success" : student.status === "GRADUATED" ? "bg-ai-blue" : "bg-error",
          )} />
          <span className="text-[10px] text-text-muted">{student.status}</span>
        </div>
        <span className="text-[10px] text-text-muted">{student.section} • Sem {student.semester}</span>
      </div>
    </motion.div>
  );
}
