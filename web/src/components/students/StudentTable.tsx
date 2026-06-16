"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { EnrollmentStatusBadge } from "./EnrollmentStatusBadge";
import { AttendanceProgress } from "./AttendanceProgress";
import type { Student, StudentTableParams } from "@/lib/mock/students";

interface StudentTableProps {
  data: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSort: (field: string) => void;
  onRowClick: (student: Student) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  loading?: boolean;
}

export function StudentTable({
  data,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onSort,
  onRowClick,
  sortBy,
  sortOrder,
  loading,
}: StudentTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((s) => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const SortIcon = ({ field }: { field: string }) => (
    <span className="inline-flex flex-col items-center leading-none opacity-40 group-hover:opacity-100 transition-opacity">
      <svg className={cn("w-2.5 h-2.5 -mb-0.5", sortBy === field && sortOrder === "asc" ? "text-ai-blue" : "text-text-dim")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
      <svg className={cn("w-2.5 h-2.5", sortBy === field && sortOrder === "desc" ? "text-ai-blue" : "text-text-dim")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </span>
  );

  const columns = [
    { key: "studentId", label: "Student ID", sortable: true },
    { key: "fullName", label: "Name", sortable: true },
    { key: "departmentName", label: "Department", sortable: true },
    { key: "semester", label: "Sem", sortable: true },
    { key: "section", label: "Sec", sortable: true },
    { key: "faceEnrolled", label: "AI Status", sortable: false },
    { key: "attendancePercentage", label: "Attendance", sortable: true },
    { key: "engagementScore", label: "Engagement", sortable: true },
    { key: "status", label: "Status", sortable: true },
  ];

  return (
    <div className="glass rounded-card border border-glass-border overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-glass-border">
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === data.length && data.length > 0}
                  onChange={toggleAll}
                  className="rounded border-glass-border bg-glass-light text-ai-blue focus:ring-ai-blue"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider",
                    col.sortable && "cursor-pointer group select-none",
                  )}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    {col.label}
                    {col.sortable && <SortIcon field={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-12 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-text-muted">Loading students...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-12 text-center">
                  <p className="text-sm text-text-muted">No students found matching your filters</p>
                </td>
              </tr>
            ) : (
              <AnimatePresence>
                {data.map((student, i) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      "border-b border-glass-border/50 transition-colors cursor-pointer",
                      "hover:bg-glass-light",
                      i % 2 === 0 ? "bg-transparent" : "bg-glass-light/30",
                    )}
                    onClick={() => onRowClick(student)}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student.id)}
                        onChange={() => toggleOne(student.id)}
                        className="rounded border-glass-border bg-glass-light text-ai-blue focus:ring-ai-blue"
                      />
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-text-secondary font-mono">{student.studentId}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                          student.faceEnrolled
                            ? "bg-gradient-to-br from-ai-blue to-ai-purple text-white"
                            : "bg-glass-heavy text-text-muted",
                        )}>
                          {student.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-text-primary truncate">{student.fullName}</p>
                          <p className="text-[10px] text-text-muted">{student.rollNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-text-secondary">{student.departmentName}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-text-secondary">{student.semester}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-text-secondary">{student.section}</span>
                    </td>
                    <td className="p-3">
                      <EnrollmentStatusBadge
                        enrolled={student.faceEnrolled}
                        confidence={student.enrollmentConfidence}
                      />
                    </td>
                    <td className="p-3">
                      <div className="w-24">
                        <AttendanceProgress percentage={student.attendancePercentage} size="sm" />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="w-24">
                        <AttendanceProgress percentage={student.engagementScore} size="sm" />
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                        student.status === "ACTIVE"
                          ? "bg-success/10 text-success border border-success/20"
                          : student.status === "GRADUATED"
                            ? "bg-ai-blue/10 text-ai-blue border border-ai-blue/20"
                            : student.status === "INACTIVE"
                              ? "bg-warning/10 text-warning border border-warning/20"
                              : "bg-error/10 text-error border border-error/20",
                      )}>
                        <span className={cn(
                          "h-1 w-1 rounded-full",
                          student.status === "ACTIVE" ? "bg-success" : student.status === "GRADUATED" ? "bg-ai-blue" : student.status === "INACTIVE" ? "bg-warning" : "bg-error",
                        )} />
                        {student.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-glass-border">
        <span className="text-[10px] text-text-muted">
          Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-xs text-text-dim hover:text-text-primary hover:bg-glass-light disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Previous page"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-lg text-xs font-medium transition-all",
                  p === page
                    ? "bg-ai-blue text-black font-semibold"
                    : "text-text-dim hover:text-text-primary hover:bg-glass-light",
                )}
              >
                {p}
              </button>
            );
          })}
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-xs text-text-dim hover:text-text-primary hover:bg-glass-light disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Next page"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
