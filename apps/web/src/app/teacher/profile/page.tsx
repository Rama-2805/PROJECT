"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { 
  User, Mail, Shield, BookOpen, Clock, 
  MapPin, Phone, Bell, Key, Settings 
} from "lucide-react";

export default function TeacherProfilePage() {
  const teacher = {
    name: "Dr. Sarah Jenkins",
    title: "Senior Professor of Computer Science",
    id: "FAC-88402",
    email: "sarah.jenkins@collegename.edu.in",
    phone: "+91 98765 43210",
    office: "Block C, Room 402",
    department: "Computer Science & Engineering",
    joiningDate: "August 12, 2019",
    activeClasses: [
      { code: "CS-301", name: "Advanced Data Structures", room: "Room 402", schedule: "Mon, Wed • 10:00 AM" },
      { code: "CS-402", name: "Artificial Intelligence & ML", room: "Seminar Hall 1", schedule: "Tue, Thu • 2:00 PM" },
      { code: "CS-101", name: "Introduction to Programming", room: "Lab 3", schedule: "Fri • 9:00 AM" },
    ]
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary">My Faculty Profile</h2>
        <p className="text-xs text-text-muted">Manage your personal details, teaching schedule, and account settings</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <GlassCard className="text-center p-6 flex flex-col items-center">
            {/* Avatar container */}
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 p-[2px] mb-4">
              <div className="h-full w-full rounded-full bg-bg-secondary flex items-center justify-center border border-glass-border">
                <User className="h-10 w-10 text-text-primary" />
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-text-primary">{teacher.name}</h3>
            <p className="text-xs text-text-muted mb-2">{teacher.title}</p>
            <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              {teacher.id}
            </span>

            <div className="w-full border-t border-glass-border mt-6 pt-6 space-y-3.5 text-left">
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <Mail className="w-4 h-4 text-text-muted" />
                <span className="truncate">{teacher.email}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <Phone className="w-4 h-4 text-text-muted" />
                <span>{teacher.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <MapPin className="w-4 h-4 text-text-muted" />
                <span>{teacher.office}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <Shield className="w-4 h-4 text-text-muted" />
                <span>{teacher.department}</span>
              </div>
            </div>
          </GlassCard>

          {/* Account Settings Shortcut */}
          <GlassCard className="p-4 space-y-2">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">Quick Actions</h4>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-glass-light transition-colors text-xs text-text-secondary text-left">
              <Key className="w-4 h-4 text-text-muted" /> Change Password
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-glass-light transition-colors text-xs text-text-secondary text-left">
              <Bell className="w-4 h-4 text-text-muted" /> Notification Preferences
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-glass-light transition-colors text-xs text-text-secondary text-left">
              <Settings className="w-4 h-4 text-text-muted" /> System Settings
            </button>
          </GlassCard>
        </div>

        {/* Right Column: Teaching Schedule & Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Active Classes / Timetable */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4 border-b border-glass-border pb-3">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-text-primary">Active Course Assignments</h3>
            </div>
            
            <div className="space-y-3">
              {teacher.activeClasses.map((cls) => (
                <div 
                  key={cls.code}
                  className="p-4 rounded-xl border border-glass-border bg-glass-light/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-blue-500/20 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {cls.code}
                      </span>
                      <h4 className="text-xs font-semibold text-text-primary">{cls.name}</h4>
                    </div>
                    <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> {cls.room}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium font-mono shrink-0">
                    <Clock className="w-3.5 h-3.5 text-text-muted" />
                    {cls.schedule}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Professional Details */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4 border-b border-glass-border pb-3">
              <User className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-semibold text-text-primary">Professional Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-text-muted mb-0.5">Faculty Title</p>
                <p className="font-semibold text-text-primary">{teacher.title}</p>
              </div>
              <div>
                <p className="text-text-muted mb-0.5">Primary Department</p>
                <p className="font-semibold text-text-primary">{teacher.department}</p>
              </div>
              <div>
                <p className="text-text-muted mb-0.5">Office Location</p>
                <p className="font-semibold text-text-primary">{teacher.office}</p>
              </div>
              <div>
                <p className="text-text-muted mb-0.5">Date of Affiliation</p>
                <p className="font-semibold text-text-primary">{teacher.joiningDate}</p>
              </div>
            </div>
          </GlassCard>
        </div>

      </div>

    </div>
  );
}
