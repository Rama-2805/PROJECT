"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { DeviceStatusIndicator } from "./DeviceStatusIndicator";
import type { Classroom } from "@/lib/mock/classrooms";

interface ClassroomCardProps {
  classroom: Classroom;
  onView?: (id: string) => void;
  onEdit?: (classroom: Classroom) => void;
  onDelete?: (id: string) => void;
}

export function ClassroomCard({ classroom, onView, onEdit, onDelete }: ClassroomCardProps) {
  const availabilityConfig = {
    available: { label: "Available", color: "text-success", dot: "bg-success" },
    occupied: { label: "Occupied", color: "text-warning", dot: "bg-warning" },
    maintenance: { label: "Maintenance", color: "text-error", dot: "bg-error" },
  };

  const avail = availabilityConfig[classroom.availability];

  return (
    <motion.div
      className="glass rounded-card p-4 border border-glass-border hover:border-ai-blue/20 transition-all duration-300 group cursor-pointer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => onView?.(classroom.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-ai-cyan to-ai-blue flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{classroom.roomNumber}</p>
              <p className="text-[10px] text-text-muted">{classroom.building} • Floor {classroom.floor}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", avail.color.replace("text-", "border-").replace("success", "success/20").replace("warning", "warning/20").replace("error", "error/20"), avail.color.replace("text-", "bg-").replace("success", "success/10").replace("warning", "warning/10").replace("error", "error/10"))}>
            <span className={cn("h-1.5 w-1.5 rounded-full", avail.dot)} />
            {avail.label}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(classroom);
              }}
              className="p-1 rounded hover:bg-glass-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Edit Classroom"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(classroom.id);
              }}
              className="p-1 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
              title="Delete Classroom"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">Capacity</p>
          <p className="text-xs text-text-secondary">{classroom.capacity} seats</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">Department</p>
          <p className="text-xs text-text-secondary truncate">{classroom.departmentName}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-glass-border">
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">Devices</p>
          <DeviceStatusIndicator online={classroom.deviceOnline} total={classroom.deviceTotal} />
        </div>
        {classroom.currentSession && (
          <div className="text-right">
            <p className="text-[10px] text-text-muted">Current</p>
            <p className="text-xs text-text-primary">{classroom.currentSession}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
