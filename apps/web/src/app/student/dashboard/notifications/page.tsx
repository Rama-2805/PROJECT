"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bell, ShieldAlert, BookOpen, Clock, Calendar, CheckSquare } from "lucide-react";

export default function StudentNotificationsPage() {
  const [unreadCount, setUnreadCount] = useState(2);

  const notifications = [
    {
      id: 1,
      type: "warning",
      title: "Attendance Warning Limit",
      message: "Your attendance in Computer Networks has fallen to 75%. If it drops below 75%, you will be restricted from taking exams.",
      time: "2 hours ago",
      icon: ShieldAlert,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      unread: true
    },
    {
      id: 2,
      type: "info",
      title: "Biometric Attendance Registered",
      message: "Successfully logged attendance for Advanced Data Structures in Room 402 using Face Recognition (99.42% Match).",
      time: "Today, 10:02 AM",
      icon: CheckSquare,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      unread: true
    },
    {
      id: 3,
      type: "class",
      title: "Class Rescheduled",
      message: "Software Engineering lecture scheduled for Monday at 9:00 AM has been shifted to Room 501. Timings remain unchanged.",
      time: "Yesterday",
      icon: BookOpen,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      unread: false
    },
    {
      id: 4,
      type: "system",
      title: "Biometric Template Enrolled",
      message: "Your face biometric templates have been verified and pushed to edge server scanner arrays.",
      time: "3 days ago",
      icon: Clock,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      unread: false
    }
  ];

  const handleMarkAllRead = () => {
    setUnreadCount(0);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-glass-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Notification Center</h2>
          <p className="text-xs text-text-muted">Review important academic updates, class changes, and biometric log alerts.</p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className="text-xs text-blue-400 hover:underline font-mono uppercase tracking-wider"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.map((notif) => (
          <GlassCard 
            key={notif.id} 
            className={`p-4 relative hover:border-blue-500/10 transition-all ${
              notif.unread ? "border-l-2 border-l-blue-500" : ""
            }`}
          >
            {notif.unread && (
              <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            )}

            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-xl ${notif.bg} ${notif.color} shrink-0`}>
                <notif.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1 pr-6">
                <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2">
                  {notif.title}
                  {notif.unread && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono uppercase">
                      New
                    </span>
                  )}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">{notif.message}</p>
                <p className="text-[9px] text-text-muted font-mono">{notif.time}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
