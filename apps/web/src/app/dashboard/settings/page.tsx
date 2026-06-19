"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { 
  User, 
  Lock, 
  Key, 
  Sliders, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff,
  ShieldAlert
} from "lucide-react";

// Types
interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

const TABS = [
  { id: "profile", label: "User Profile", icon: User },
  { id: "security", label: "Security & Passwords", icon: Lock },
  { id: "system", label: "AI & System Preferences", icon: Sliders },
  { id: "api", label: "Developer APIs", icon: Key },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  // Profile State
  const [profile, setProfile] = useState({
    username: "admin_specialist",
    displayName: "Dr. Alexander Vance",
    email: "alexander.vance@smartcampus.edu",
    role: "AI System Architect",
  });
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  // Security State
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [securityFeedback, setSecurityFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // System State
  const [systemConfig, setSystemConfig] = useState({
    eventStream: true,
    predictiveEnrollment: true,
    webXrMode: false,
    edgeSync: true,
    logArchiving: false,
  });

  // API State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { id: "key-1", name: "Campus Hub Telemetry", key: "sk_live_51N8c2P9f2c...", createdAt: "2026-05-12" },
    { id: "key-2", name: "Face Enrollment Service", key: "sk_live_9a4f21b7ce...", createdAt: "2026-06-01" },
  ]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback("Profile changes saved successfully.");
    setTimeout(() => setProfileFeedback(null), 3000);
  };

  // Password Update
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityFeedback(null);

    // Secure validations
    if (!passwords.current) {
      setSecurityFeedback({ type: "error", msg: "Please enter your current password." });
      return;
    }
    if (passwords.new.length < 8) {
      setSecurityFeedback({ type: "error", msg: "New password must be at least 8 characters long." });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setSecurityFeedback({ type: "error", msg: "New passwords do not match." });
      return;
    }

    setSecurityFeedback({ type: "success", msg: "Password updated successfully." });
    setPasswords({ current: "", new: "", confirm: "" });
    setTimeout(() => setSecurityFeedback(null), 4000);
  };

  // API Key Generation
  const handleGenerateApiKey = () => {
    if (!newKeyName.trim()) return;
    const suffix = Math.random().toString(36).substring(2, 8);
    const fullKey = `sk_live_${Math.random().toString(36).substring(2, 12)}${suffix}`;
    const maskedKey = `${fullKey.substring(0, 16)}...${suffix}`;
    
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      key: maskedKey,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setApiKeys((prev) => [newKey, ...prev]);
    setGeneratedKey(fullKey); // Temporary display of the full key to copy
    setNewKeyName("");
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  // PII Masking utility
  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    return `${name[0]}***@${domain[0]}***.${domain.split(".").pop()}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary tracking-tight">System Settings</h2>
        <p className="text-xs text-text-muted">Configure profile information, credentials, AI system components, and API accesses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Tabs */}
        <GlassCard className="p-2 md:col-span-1 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setGeneratedKey(null);
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-xs font-medium transition-all whitespace-nowrap",
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
            {/* ─── PROFILE ─── */}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <GlassCard>
                  <h3 className="text-sm font-semibold text-text-primary mb-5">Admin Profile Details</h3>

                  {profileFeedback && (
                    <div className="mb-4 px-3 py-2 rounded-lg border border-success/30 bg-success/10 text-success text-xs">
                      {profileFeedback}
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Display Name</label>
                        <input
                          type="text"
                          value={profile.displayName}
                          onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-[#18181B] border border-white/10 text-xs text-text-primary focus:outline-none focus:border-white/40 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Username</label>
                        <input
                          type="text"
                          value={profile.username}
                          onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-[#18181B] border border-white/10 text-xs text-text-primary focus:outline-none focus:border-white/40 transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Email Address (Masked)</label>
                        <div className="w-full px-3 py-2.5 rounded-lg bg-[#18181B]/50 border border-white/5 text-xs text-text-muted select-none">
                          {maskEmail(profile.email)}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Security Role</label>
                        <div className="w-full px-3 py-2.5 rounded-lg bg-[#18181B]/50 border border-white/5 text-xs text-text-muted font-mono select-none">
                          {profile.role}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button size="sm" type="submit">Save Profile Changes</Button>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}

            {/* ─── SECURITY ─── */}
            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <GlassCard>
                  <h3 className="text-sm font-semibold text-text-primary mb-5">Credential Updates</h3>

                  {securityFeedback && (
                    <div className={cn(
                      "mb-4 px-3 py-2 rounded-lg border text-xs",
                      securityFeedback.type === "success" 
                        ? "border-success/30 bg-success/10 text-success" 
                        : "border-error/30 bg-error/10 text-error"
                    )}>
                      {securityFeedback.msg}
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPass.current ? "text" : "password"}
                          value={passwords.current}
                          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                          className="w-full pl-3 pr-10 py-2.5 rounded-lg bg-[#18181B] border border-white/10 text-xs text-text-primary focus:outline-none focus:border-white/40 transition-colors font-mono"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                          {showPass.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-medium text-text-muted mb-1.5 block">New Password</label>
                        <div className="relative">
                          <input
                            type={showPass.new ? "text" : "password"}
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                            className="w-full pl-3 pr-10 py-2.5 rounded-lg bg-[#18181B] border border-white/10 text-xs text-text-primary focus:outline-none focus:border-white/40 transition-colors font-mono"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                          >
                            {showPass.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showPass.confirm ? "text" : "password"}
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            className="w-full pl-3 pr-10 py-2.5 rounded-lg bg-[#18181B] border border-white/10 text-xs text-text-primary focus:outline-none focus:border-white/40 transition-colors font-mono"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                          >
                            {showPass.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-[10px] text-text-muted flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-text-secondary">Password Security Requirements:</p>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                          <li>Minimum length of 8 characters</li>
                          <li>Must match the confirmation input exactly</li>
                        </ul>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button size="sm" type="submit">Update Password</Button>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}

            {/* ─── SYSTEM CONFIG ─── */}
            {activeTab === "system" && (
              <motion.div
                key="system"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <GlassCard>
                  <h3 className="text-sm font-semibold text-text-primary mb-5">AI Engine & Telemetry Configurations</h3>

                  <div className="space-y-4">
                    {/* Event Stream Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-white/5">
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary">Real-time Event Stream</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Streams IoT event warnings and AI notifications into the dashboard console feed</p>
                      </div>
                      <button
                        onClick={() => setSystemConfig({ ...systemConfig, eventStream: !systemConfig.eventStream })}
                        className={cn(
                          "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          systemConfig.eventStream ? "bg-white" : "bg-white/10"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#050505] shadow ring-0 transition duration-200 ease-in-out",
                            systemConfig.eventStream ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Predictive Modeling Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-white/5">
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary">Predictive Enrollment Analytics</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Enables AI computation models for predictive performance and attendance analysis overlays</p>
                      </div>
                      <button
                        onClick={() => setSystemConfig({ ...systemConfig, predictiveEnrollment: !systemConfig.predictiveEnrollment })}
                        className={cn(
                          "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          systemConfig.predictiveEnrollment ? "bg-white" : "bg-white/10"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#050505] shadow ring-0 transition duration-200 ease-in-out",
                            systemConfig.predictiveEnrollment ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* WebXR Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-white/5">
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary">3D WebXR Support</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Allows AR/VR headsets to synchronize with the Digital Twin scene</p>
                      </div>
                      <button
                        onClick={() => setSystemConfig({ ...systemConfig, webXrMode: !systemConfig.webXrMode })}
                        className={cn(
                          "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          systemConfig.webXrMode ? "bg-white" : "bg-white/10"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#050505] shadow ring-0 transition duration-200 ease-in-out",
                            systemConfig.webXrMode ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Edge Telemetry Sync */}
                    <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-white/5">
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary">Edge Device Synchronization</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Automates synchronization intervals for active campus IoT microcontrollers</p>
                      </div>
                      <button
                        onClick={() => setSystemConfig({ ...systemConfig, edgeSync: !systemConfig.edgeSync })}
                        className={cn(
                          "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          systemConfig.edgeSync ? "bg-white" : "bg-white/10"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#050505] shadow ring-0 transition duration-200 ease-in-out",
                            systemConfig.edgeSync ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Auto Archiving */}
                    <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-white/5">
                      <div>
                        <h4 className="text-xs font-semibold text-text-primary">Automatic Log Archiving</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Compresses and archives logs over 30 days old into cold cloud storage automatically</p>
                      </div>
                      <button
                        onClick={() => setSystemConfig({ ...systemConfig, logArchiving: !systemConfig.logArchiving })}
                        className={cn(
                          "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          systemConfig.logArchiving ? "bg-white" : "bg-white/10"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#050505] shadow ring-0 transition duration-200 ease-in-out",
                            systemConfig.logArchiving ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* ─── DEVELOPER API KEYS ─── */}
            {activeTab === "api" && (
              <motion.div
                key="api"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <GlassCard className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-2">Integration & API Credentials</h3>
                    <p className="text-[10px] text-text-muted">Generate access keys to authenticate custom microcontrollers or query university statistics externally.</p>
                  </div>

                  {/* Create New Key input */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] font-medium text-text-muted mb-1.5 block">API Key Identifier</label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g., Library Gateway Sync"
                        className="w-full px-3 py-2 rounded-lg bg-[#18181B] border border-white/10 text-xs text-text-primary focus:outline-none focus:border-white/40 transition-colors"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleGenerateApiKey}
                      disabled={!newKeyName.trim()}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Generate Key
                    </Button>
                  </div>

                  {/* Dynamic Alert displaying the full newly generated key */}
                  <AnimatePresence>
                    {generatedKey && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-white/[0.03] border border-white/10 rounded-lg text-xs"
                      >
                        <p className="font-semibold text-text-primary">New API Key Created:</p>
                        <p className="text-[10px] text-text-muted mt-0.5">Please copy this secret token now. For security purposes, it will not be displayed again.</p>
                        
                        <div className="flex items-center gap-2 mt-2 p-2 bg-black/40 border border-white/5 rounded font-mono text-[10px] text-white">
                          <span className="truncate flex-1 select-all">{generatedKey}</span>
                          <button
                            onClick={() => handleCopy(generatedKey, "new-gen")}
                            className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white transition-colors"
                          >
                            {copiedKeyId === "new-gen" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* API Key List */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-text-muted block">Active Keys</label>
                    {apiKeys.map((keyItem) => (
                      <div
                        key={keyItem.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#18181B] border border-white/5"
                      >
                        <div>
                          <p className="text-xs font-semibold text-text-primary">{keyItem.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-text-muted font-mono">{keyItem.key}</span>
                            <span className="text-[9px] text-text-dim">· Created {keyItem.createdAt}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(keyItem.key, keyItem.id)}
                            className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-colors"
                            title="Copy Key Reference"
                          >
                            {copiedKeyId === keyItem.id ? <Check className="h-4.5 w-4.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => handleRevokeKey(keyItem.id)}
                            className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-error transition-colors"
                            title="Revoke Access"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {apiKeys.length === 0 && (
                      <div className="text-center py-6 text-text-muted text-xs">
                        No active developer credentials found.
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
