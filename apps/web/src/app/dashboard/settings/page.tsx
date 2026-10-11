"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { 
  Building, Library, Users, Camera, Palette, Mail, 
  Database, Shield, Save, RefreshCw, Plus, Trash2, Key, Eye, EyeOff
} from "lucide-react";
import { getUsers, saveUsers } from "@/lib/userStore";

const TABS = [
  { id: "institution", label: "Institution Settings", icon: Building },
  { id: "department", label: "Department Settings", icon: Library },
  { id: "users", label: "User Management", icon: Users },
  { id: "cameras", label: "Camera Settings", icon: Camera },
  { id: "theme", label: "Theme Settings", icon: Palette },
  { id: "email", label: "Email Settings", icon: Mail },
  { id: "backup", label: "Backup & Restore", icon: Database },
  { id: "security", label: "Security Settings", icon: Shield },
];

const DEPARTMENTS_LIST = ["CSE", "ISE", "ECE", "EEE", "AIML", "CSE(AI)", "MECH", "CIVIL"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("institution");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Institution Settings
  const [instSettings, setInstSettings] = useState({
    collegeName: "Vemana Institute of Technology",
    collegeCode: "VI",
    officialEmail: "contact@vemana.edu.in",
    phoneNumber: "+91-80-25535193",
    website: "https://vemana.edu.in",
    city: "Bengaluru",
    state: "Karnataka",
  });
  const [instFeedback, setInstFeedback] = useState<string | null>(null);

  // 2. Department Settings
  const [selectedDept, setSelectedDept] = useState("CSE");
  const [deptConfigs, setDeptConfigs] = useState<Record<string, { hodName: string; maxStudents: number; maxTeachers: number }>>({
    CSE: { hodName: "Dr. Manjunatha Prasad", maxStudents: 450, maxTeachers: 25 },
    ISE: { hodName: "Dr. Latha R", maxStudents: 180, maxTeachers: 12 },
    ECE: { hodName: "Prof. S. R. Kumar", maxStudents: 240, maxTeachers: 18 },
    EEE: { hodName: "Dr. Ramesh Babu", maxStudents: 120, maxTeachers: 10 },
    AIML: { hodName: "Dr. Asha Gowda", maxStudents: 120, maxTeachers: 8 },
    "CSE(AI)": { hodName: "Dr. Girish V", maxStudents: 120, maxTeachers: 8 },
    MECH: { hodName: "Prof. Shivashankar M", maxStudents: 180, maxTeachers: 15 },
    CIVIL: { hodName: "Dr. T. Venkat", maxStudents: 120, maxTeachers: 10 },
  });
  const [deptFeedback, setDeptFeedback] = useState<string | null>(null);

  // 3. User Management
  const [systemLogs, setSystemLogs] = useState([
    { id: 1, user: "admin@collegename.edu.in", action: "Changed password rules", time: "Just now" },
    { id: 2, user: "hod@vemana.edu.in", action: "Created teacher Anil Kumar", time: "1 hour ago" },
    { id: 3, user: "admin@collegename.edu.in", action: "Authorized CCTV Camera Node-CSE", time: "2 hours ago" },
  ]);

  // 4. Camera Settings
  const [cameras, setCameras] = useState([
    { id: "CAM-01", name: "CSE Seminar Room 301", ip: "192.168.1.55", fps: 30, active: true },
    { id: "CAM-02", name: "Main Building Entrance", ip: "192.168.1.56", fps: 25, active: true },
    { id: "CAM-03", name: "ECE Lab Ground Floor", ip: "192.168.1.58", fps: 30, active: false },
  ]);
  const [camName, setCamName] = useState("");
  const [camIp, setCamIp] = useState("");

  // 5. Theme Settings
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [glassOpacity, setGlassOpacity] = useState(80);
  const [blurDepth, setBlurDepth] = useState(16);

  // 6. Email Settings
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: "smtp.smartcampusai.com",
    smtpPort: 587,
    senderEmail: "alerts@smartcampusai.com",
    authRequired: true,
  });
  const [emailLogs, setEmailLogs] = useState([
    { id: 1, to: "contact@smartcampusai.com", subject: "New Demo Request Notification", date: "Today" },
    { id: 2, to: "anil.cs@vemana.edu.in", subject: "Compulsory Password Reset Alert", date: "Yesterday" },
  ]);

  // 8. Security Settings
  const [securityForm, setSecurityForm] = useState({
    currentPass: "",
    newPass: "",
    confirmPass: "",
    sessionTimeout: 30,
  });
  const [showPass, setShowPass] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleSaveInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    setInstFeedback("Institution configurations updated successfully.");
    setTimeout(() => setInstFeedback(null), 3000);
  };

  const handleSaveDeptConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setDeptFeedback(`Updated department configuration for ${selectedDept}.`);
    setTimeout(() => setDeptFeedback(null), 3000);
  };

  const handleAddCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!camName.trim() || !camIp.trim()) return;
    const newCam = {
      id: `CAM-0${cameras.length + 1}`,
      name: camName,
      ip: camIp,
      fps: 30,
      active: true,
    };
    setCameras([...cameras, newCam]);
    setCamName("");
    setCamIp("");
  };

  const handleToggleCamera = (id: string) => {
    setCameras(cameras.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const handleRemoveCamera = (id: string) => {
    setCameras(cameras.filter(c => c.id !== id));
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    alert("SMTP Configuration updated successfully.");
  };

  const handleBackup = () => {
    const backupData = {
      users: getUsers(),
      instSettings,
      deptConfigs,
      cameras,
      emailConfig,
      backupTimestamp: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartcampus_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.users) saveUsers(parsed.users);
        if (parsed.instSettings) setInstSettings(parsed.instSettings);
        if (parsed.deptConfigs) setDeptConfigs(parsed.deptConfigs);
        if (parsed.cameras) setCameras(parsed.cameras);
        if (parsed.emailConfig) setEmailConfig(parsed.emailConfig);
        alert("System restore completed successfully!");
      } catch (err) {
        alert("Failed to parse restore snapshot. Please upload a valid JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityFeedback(null);
    if (!securityForm.currentPass) {
      setSecurityFeedback({ type: "error", msg: "Please enter your current password." });
      return;
    }
    if (securityForm.newPass.length < 6) {
      setSecurityFeedback({ type: "error", msg: "New password must be at least 6 characters long." });
      return;
    }
    if (securityForm.newPass !== securityForm.confirmPass) {
      setSecurityFeedback({ type: "error", msg: "New passwords do not match." });
      return;
    }
    setSecurityFeedback({ type: "success", msg: "Security password updated successfully." });
    setSecurityForm({ currentPass: "", newPass: "", confirmPass: "", sessionTimeout: 30 });
    setTimeout(() => setSecurityFeedback(null), 3000);
  };

  const handleToggleTheme = () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
    // Apply class to body or dashboard container for global theme
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (nextMode === "light") {
        root.classList.add("light");
        root.classList.remove("dark");
      } else {
        root.classList.add("dark");
        root.classList.remove("light");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary tracking-tight">System Settings</h2>
        <p className="text-xs text-text-muted">Configure profiles, departments, camera grids, backups, and security policies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Tabs */}
        <GlassCard className="p-2 md:col-span-1 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 shrink-0 md:w-full px-4 py-3 rounded-xl text-left text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-white/10 text-white border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    : "text-text-muted hover:text-text-primary hover:bg-white/[0.02]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-text-muted")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </GlassCard>

        {/* Content Area */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            
            {/* 1. INSTITUTION SETTINGS */}
            {activeTab === "institution" && (
              <motion.div key="inst" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard>
                  <h3 className="text-sm font-semibold text-text-primary mb-5">Institution Profile</h3>
                  {instFeedback && (
                    <div className="mb-4 px-3 py-2 rounded-lg border border-success/30 bg-success/10 text-success text-xs">
                      {instFeedback}
                    </div>
                  )}
                  <form onSubmit={handleSaveInstitution} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">College Name</label>
                        <input
                          type="text"
                          required
                          value={instSettings.collegeName}
                          onChange={(e) => setInstSettings({ ...instSettings, collegeName: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">VTU College Code</label>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          value={instSettings.collegeCode}
                          onChange={(e) => setInstSettings({ ...instSettings, collegeCode: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Official Contact Email</label>
                        <input
                          type="email"
                          required
                          value={instSettings.officialEmail}
                          onChange={(e) => setInstSettings({ ...instSettings, officialEmail: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Official Phone Number</label>
                        <input
                          type="text"
                          required
                          value={instSettings.phoneNumber}
                          onChange={(e) => setInstSettings({ ...instSettings, phoneNumber: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Website</label>
                        <input
                          type="text"
                          value={instSettings.website}
                          onChange={(e) => setInstSettings({ ...instSettings, website: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">City</label>
                        <input
                          type="text"
                          value={instSettings.city}
                          onChange={(e) => setInstSettings({ ...instSettings, city: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">State</label>
                        <input
                          type="text"
                          value={instSettings.state}
                          onChange={(e) => setInstSettings({ ...instSettings, state: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button size="sm" type="submit" className="flex items-center gap-1.5">
                        <Save className="w-4 h-4" />
                        Save Configurations
                      </Button>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}

            {/* 2. DEPARTMENT SETTINGS */}
            {activeTab === "department" && (
              <motion.div key="dept" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard className="space-y-4">
                  <h3 className="text-sm font-semibold text-text-primary">Department Settings</h3>
                  
                  {/* Select Department Selector */}
                  <div className="flex flex-wrap gap-2 mb-4 pb-2 border-b border-glass-border">
                    {DEPARTMENTS_LIST.map((dept) => (
                      <button
                        key={dept}
                        onClick={() => setSelectedDept(dept)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer border border-glass-border",
                          selectedDept === dept 
                            ? "bg-text-primary text-bg-primary font-bold shadow-md" 
                            : "bg-glass-light text-text-secondary hover:text-text-primary hover:bg-glass-medium"
                        )}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>

                  {deptFeedback && (
                    <div className="px-3 py-2 rounded-lg border border-success/30 bg-success/10 text-success text-xs">
                      {deptFeedback}
                    </div>
                  )}

                  <form onSubmit={handleSaveDeptConfig} className="space-y-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Head of Department Name</label>
                      <input
                        type="text"
                        required
                        value={deptConfigs[selectedDept]?.hodName || ""}
                        onChange={(e) => setDeptConfigs({
                          ...deptConfigs,
                          [selectedDept]: { ...deptConfigs[selectedDept], hodName: e.target.value }
                        })}
                        className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Max Student Intake Limit</label>
                        <input
                          type="number"
                          required
                          min={10}
                          value={deptConfigs[selectedDept]?.maxStudents || 0}
                          onChange={(e) => setDeptConfigs({
                            ...deptConfigs,
                            [selectedDept]: { ...deptConfigs[selectedDept], maxStudents: Number(e.target.value) }
                          })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Max Faculty Staff Capacity</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={deptConfigs[selectedDept]?.maxTeachers || 0}
                          onChange={(e) => setDeptConfigs({
                            ...deptConfigs,
                            [selectedDept]: { ...deptConfigs[selectedDept], maxTeachers: Number(e.target.value) }
                          })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button size="sm" type="submit" className="flex items-center gap-1.5">
                        <Save className="w-4 h-4" />
                        Save Department Configuration
                      </Button>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}

            {/* 3. USER MANAGEMENT */}
            {activeTab === "users" && (
              <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard className="space-y-4">
                  <h3 className="text-sm font-semibold text-text-primary">User Audit Logging</h3>
                  <p className="text-[11px] text-text-muted">A summary list of administrative actions performed by campus managers.</p>
                  
                  <div className="space-y-2 mt-2">
                    {systemLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-glass-light border border-glass-border rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-text-primary">{log.action}</p>
                          <p className="text-[10px] text-text-muted">By {log.user}</p>
                        </div>
                        <span className="text-[10px] text-text-dim shrink-0">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* 4. CAMERA SETTINGS */}
            {activeTab === "cameras" && (
              <motion.div key="cams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Camera Node Configuration</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Configure active camera nodes and frame rates for face recognition feeds.</p>
                  </div>

                  <form onSubmit={handleAddCamera} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Camera Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. EB Classroom 201"
                        value={camName}
                        onChange={(e) => setCamName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">CCTV Camera IP/Endpoint</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 192.168.1.15"
                        value={camIp}
                        onChange={(e) => setCamIp(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                      />
                    </div>
                    <Button size="sm" type="submit" className="flex items-center justify-center gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      Add Camera Node
                    </Button>
                  </form>

                  <div className="space-y-2 pt-2 border-t border-glass-border">
                    {cameras.map((c) => (
                      <div key={c.id} className="p-3 bg-glass-light border border-glass-border rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-text-primary flex items-center gap-2">
                            <span className={cn("h-1.5 w-1.5 rounded-full", c.active ? "bg-success" : "bg-text-muted")} />
                            {c.name}
                          </p>
                          <p className="text-[10px] text-text-muted font-mono">{c.ip} • target {c.fps} FPS</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleCamera(c.id)}
                            className={cn("px-2.5 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer", c.active ? "bg-success/15 border-success/30 text-success" : "bg-glass-medium border-glass-border text-text-muted")}
                          >
                            {c.active ? "ACTIVE" : "INACTIVE"}
                          </button>
                          <button
                            onClick={() => handleRemoveCamera(c.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* 5. THEME SETTINGS */}
            {activeTab === "theme" && (
              <motion.div key="theme" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Theme & Glassmorphism Preferences</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Customize UI transparency, contrast, and visual layouts.</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between p-3.5 bg-glass-light rounded-xl border border-glass-border">
                      <div>
                        <h4 className="font-semibold text-text-primary">Theme Color Mode</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Toggle between dark mode and light mode templates.</p>
                      </div>
                      <Button size="sm" onClick={handleToggleTheme}>
                        Set {themeMode === "dark" ? "Light Mode" : "Dark Mode"}
                      </Button>
                    </div>

                    <div className="space-y-2 p-3.5 bg-glass-light rounded-xl border border-glass-border">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-text-primary">Glass Opacity</h4>
                        <span className="font-mono text-text-muted">{glassOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={glassOpacity}
                        onChange={(e) => setGlassOpacity(Number(e.target.value))}
                        className="w-full h-1 bg-glass-heavy rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2 p-3.5 bg-glass-light rounded-xl border border-glass-border">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-text-primary">Background Blur Depth</h4>
                        <span className="font-mono text-text-muted">{blurDepth}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={blurDepth}
                        onChange={(e) => setBlurDepth(Number(e.target.value))}
                        className="w-full h-1 bg-glass-heavy rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* 6. EMAIL SETTINGS */}
            {activeTab === "email" && (
              <motion.div key="email" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">SMTP Configuration</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Configure mail servers for official alerts and notification routing.</p>
                  </div>

                  <form onSubmit={handleSaveEmail} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">SMTP Server Host</label>
                        <input
                          type="text"
                          required
                          value={emailConfig.smtpHost}
                          onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">SMTP Port</label>
                        <input
                          type="number"
                          required
                          value={emailConfig.smtpPort}
                          onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: Number(e.target.value) })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Sender Email Address</label>
                      <input
                        type="email"
                        required
                        value={emailConfig.senderEmail}
                        onChange={(e) => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
                      />
                    </div>

                    <Button size="sm" type="submit" className="flex items-center gap-1.5">
                      <Save className="w-4 h-4" />
                      Save SMTP Settings
                    </Button>
                  </form>

                  <div className="space-y-2 pt-4 border-t border-glass-border text-xs">
                    <h4 className="font-bold text-text-primary uppercase tracking-wider text-[10px] mb-2">Simulated Outbox Log</h4>
                    {emailLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-glass-light border border-glass-border rounded-xl flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-text-primary">{log.subject}</p>
                          <p className="text-[10px] text-text-muted">To {log.to}</p>
                        </div>
                        <span className="text-[10px] text-text-dim shrink-0">{log.date}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* 7. BACKUP & RESTORE */}
            {activeTab === "backup" && (
              <motion.div key="backup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">System Backup & Restore</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Download system configs, local user database records, or restore from snapshot files.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-glass-light border border-glass-border space-y-3 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-text-primary">Create Local Snapshot</h4>
                        <p className="text-[10px] text-text-muted mt-1">Saves all configuration data and custom local storage users to an exportable JSON file.</p>
                      </div>
                      <Button size="sm" onClick={handleBackup} className="w-full flex items-center justify-center gap-1.5">
                        <Database className="w-4 h-4" />
                        Download Backup Snapshot
                      </Button>
                    </div>

                    <div className="p-4 rounded-xl bg-glass-light border border-glass-border space-y-3 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-text-primary">Restore Snapshot Snapshot</h4>
                        <p className="text-[10px] text-text-muted mt-1">Upload a previously generated JSON backup file to restore system configurations.</p>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/json"
                        onChange={handleRestore}
                        className="hidden"
                      />
                      <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-1.5">
                        <RefreshCw className="w-4 h-4" />
                        Restore From JSON File
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* 8. SECURITY SETTINGS */}
            {activeTab === "security" && (
              <motion.div key="sec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Security & Passwords</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Configure authentication requirements and password changes.</p>
                  </div>

                  {securityFeedback && (
                    <div className={cn(
                      "px-3 py-2 rounded-lg border text-xs",
                      securityFeedback.type === "success" ? "border-success/30 bg-success/10 text-success" : "border-error/30 bg-error/10 text-error"
                    )}>
                      {securityFeedback.msg}
                    </div>
                  )}

                  <form onSubmit={handleSecuritySubmit} className="space-y-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          required
                          value={securityForm.currentPass}
                          onChange={(e) => setSecurityForm({ ...securityForm, currentPass: e.target.value })}
                          className="w-full pl-3 pr-10 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">New Password</label>
                        <input
                          type="password"
                          required
                          value={securityForm.newPass}
                          onChange={(e) => setSecurityForm({ ...securityForm, newPass: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Confirm New Password</label>
                        <input
                          type="password"
                          required
                          value={securityForm.confirmPass}
                          onChange={(e) => setSecurityForm({ ...securityForm, confirmPass: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Session Idle Inactivity Timeout (Minutes)</label>
                      <input
                        type="number"
                        required
                        min={5}
                        max={1440}
                        value={securityForm.sessionTimeout}
                        onChange={(e) => setSecurityForm({ ...securityForm, sessionTimeout: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 rounded-lg bg-glass-light border border-glass-border text-xs text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                      />
                    </div>

                    <Button size="sm" type="submit" className="flex items-center gap-1.5">
                      <Key className="w-4 h-4" />
                      Update Security Settings
                    </Button>
                  </form>
                </GlassCard>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
