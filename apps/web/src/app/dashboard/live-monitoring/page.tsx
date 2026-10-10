"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getLiveMonitoringData, generateLiveEvent, type LiveMonitoringData, type LiveAttendanceEvent } from "@/lib/mock/attendance";
import { isDemoMode } from "@/lib/demo-mode";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import {
  Smartphone,
  Moon,
  Eye,
  AlertTriangle,
  CheckCircle,
  Bell,
  RefreshCw,
  Zap,
  Users,
  Search,
  ShieldAlert,
  Sparkles,
  Volume2,
} from "lucide-react";

/* ─── Student Behavior Interface ──────────────────────────────── */
export interface StudentBehaviorState {
  id: string;
  usn: string;
  name: string;
  section: string;
  status: "ALERT" | "SLEEPING" | "PHONE_USAGE" | "DISTRACTED";
  attentionScore: number; // 0 - 100
  posture: string;
  gaze: string;
  phoneDetected: boolean;
  sleepingDetected: boolean;
  lastUpdated: string;
}

interface LiveNotificationToast {
  id: string;
  type: "PHONE" | "SLEEP" | "DISTRACTED";
  title: string;
  message: string;
  time: string;
  severity: "WARNING" | "CRITICAL" | "INFO";
}

/* ─── Camera Feed Component ───────────────────────────────────── */
function LiveCameraFeed({
  sessionActive,
  streamKey,
  cameraId,
}: {
  sessionActive: boolean;
  streamKey: number;
  cameraId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useFallback, setUseFallback] = useState(false);
  const aiUrl = process.env.NEXT_PUBLIC_AI_HTTP_URL || "http://localhost:8000";

  // Polling fallback if MJPEG stream is blocked
  useEffect(() => {
    if (!sessionActive || !useFallback) return;
    let isMounted = true;

    const img = new Image();
    img.crossOrigin = "anonymous";

    const refreshFrame = () => {
      if (!isMounted) return;
      img.src = `${aiUrl}/api/v1/camera/frame?camera_id=${cameraId}&_t=${Date.now()}`;
    };

    img.onload = () => {
      if (!isMounted) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width || 1280;
            canvas.height = img.height || 720;
          }
          ctx.drawImage(img, 0, 0);
        }
      }
      setTimeout(refreshFrame, 35); // ~28 FPS
    };

    img.onerror = () => {
      if (!isMounted) return;
      setTimeout(refreshFrame, 200);
    };

    refreshFrame();

    return () => {
      isMounted = false;
    };
  }, [sessionActive, useFallback, cameraId, aiUrl]);

  if (!sessionActive) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-ai-blue/20 to-ai-purple/20 mx-auto mb-4 flex items-center justify-center border border-ai-blue/30">
            <svg
              className="w-10 h-10 text-ai-blue/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-primary">Classroom Camera Standby</p>
          <p className="text-xs text-text-muted mt-1">Click &quot;Start Session&quot; to begin AI recognition stream</p>
        </div>
      </div>
    );
  }

  if (useFallback) {
    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        width={1280}
        height={720}
      />
    );
  }

  return (
    <img
      key={streamKey}
      src={`${aiUrl}/api/v1/camera/stream?camera_id=${cameraId}&_t=${streamKey}`}
      className="w-full h-full object-cover"
      alt="Classroom AI Live Stream"
      onError={() => {
        console.warn("MJPEG stream error, switching to canvas frame renderer");
        setUseFallback(true);
      }}
    />
  );
}

/* ─── Main Live Monitoring Page ────────────────────────────────── */
export default function LiveMonitoringPage() {
  const user = useAuthStore((s) => s.user);

  // Determine user role
  const isHod = Boolean(user?.roles?.includes("HOD") || user?.email?.includes("ramakrishna"));
  const isTeacher = Boolean(user?.roles?.includes("TEACHER") || user?.email?.includes("kalaiselvi"));
  const isAdmin = Boolean(user?.roles?.includes("SUPER_ADMIN") || user?.roles?.includes("INSTITUTION_ADMIN") || user?.email?.includes("admin"));

  // Section Selector: Teacher locked/defaults to 'A'; HOD/Admin can switch 'A', 'B', 'ALL'
  const [selectedSection, setSelectedSection] = useState<"A" | "B" | "ALL">(
    isTeacher && !isHod && !isAdmin ? "A" : "A",
  );

  const [data, setData] = useState<LiveMonitoringData>({
    session: {
      sessionId: "SESS_LIVE_CCTV",
      classroomId: "room-023",
      classroomName: "Classroom 023 (CCTV)",
      subjectName: "CSE-2027 Section A Live Monitoring (1VI23CS001 - 064)",
      teacherName: "Prof. Kalaiselvi S",
      status: "INACTIVE" as any,
      totalPresent: 0,
      totalStudents: 59,
      startedAt: new Date().toISOString(),
      recognitionAccuracy: 98.6,
      unknownFaces: 0,
    },
    events: [],
    presentStudents: [],
    cameraStatus: "OFFLINE",
    fps: 0,
  });

  const [events, setEvents] = useState<LiveAttendanceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [streamKey, setStreamKey] = useState<number>(Date.now());
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [controlToast, setControlToast] = useState<string | null>(null);

  // Behavioral Analytics State
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [studentBehaviors, setStudentBehaviors] = useState<Record<string, StudentBehaviorState>>({});
  const [behaviorFilter, setBehaviorFilter] = useState<"ALL" | "FLAGGED" | "ALERT">("ALL");
  const [studentSearch, setStudentSearch] = useState("");
  const [autoScannerActive, setAutoScannerActive] = useState(true);
  const [activeLiveToast, setActiveLiveToast] = useState<LiveNotificationToast | null>(null);

  // Load real students from backend PostgreSQL
  useEffect(() => {
    async function loadStudents() {
      try {
        const res: any = await api.get("/students?limit=130");
        if (res && res.data && Array.isArray(res.data)) {
          setEnrolledStudents(res.data);
        }
      } catch (e) {
        console.warn("Failed to load students:", e);
      }
    }
    loadStudents();
  }, []);

  // Fetch active alerts from backend to synchronize initial state
  useEffect(() => {
    async function syncAlerts() {
      try {
        const res = await api.get<any[]>("/behavior/alerts");
        if (Array.isArray(res)) {
          setStudentBehaviors((prev) => {
            const next = { ...prev };
            res.forEach((alert) => {
              const usn = alert.studentUsn || alert.studentId;
              if (usn && next[usn]) {
                const isPhone = alert.title.includes("Phone") || alert.description?.includes("phone");
                const isSleep = alert.title.includes("Sleeping") || alert.title.includes("Inactive") || alert.description?.includes("sleeping");
                if (isPhone) {
                  next[usn] = {
                    ...next[usn],
                    status: "PHONE_USAGE",
                    attentionScore: 24,
                    phoneDetected: true,
                    posture: "Device in Hands",
                    gaze: "Looking Down",
                  };
                } else if (isSleep) {
                  next[usn] = {
                    ...next[usn],
                    status: "SLEEPING",
                    attentionScore: 14,
                    sleepingDetected: true,
                    posture: "Head Down on Desk",
                    gaze: "Eyes Closed",
                  };
                }
              }
            });
            return next;
          });
        }
      } catch (err) {
        console.warn("Alerts sync note:", err);
      }
    }
    syncAlerts();
  }, [enrolledStudents]);

  // Initialize behavior states for enrolled students
  useEffect(() => {
    if (enrolledStudents.length === 0) return;

    setStudentBehaviors((prev) => {
      const next = { ...prev };
      enrolledStudents.forEach((s) => {
        const usn = s.rollNumber || s.usn || s.studentId;
        const sec = s.section || (usn.startsWith("1VI23CS") && parseInt(usn.replace("1VI23CS", ""), 10) <= 64 ? "A" : "B");
        if (!next[usn]) {
          next[usn] = {
            id: s.id,
            usn,
            name: s.fullName,
            section: sec,
            status: "ALERT",
            attentionScore: 92 + Math.floor(Math.random() * 7),
            posture: "Upright",
            gaze: "Blackboard",
            phoneDetected: false,
            sleepingDetected: false,
            lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        }
      });
      return next;
    });
  }, [enrolledStudents]);

  // Session Duration Timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (sessionActive) {
      timer = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setSessionDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sessionActive]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Filter students for the currently selected section
  const sectionStudents = useMemo(() => {
    const all = Object.values(studentBehaviors);
    if (selectedSection === "ALL") return all;
    return all.filter((s) => s.section === selectedSection);
  }, [studentBehaviors, selectedSection]);

  // Filtered students according to search and status pill
  const displayedStudents = useMemo(() => {
    return sectionStudents.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.usn.toLowerCase().includes(studentSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (behaviorFilter === "FLAGGED") {
        return s.status === "PHONE_USAGE" || s.status === "SLEEPING" || s.status === "DISTRACTED";
      }
      if (behaviorFilter === "ALERT") {
        return s.status === "ALERT";
      }
      return true;
    });
  }, [sectionStudents, behaviorFilter, studentSearch]);

  // Behavioral Stats Aggregations
  const stats = useMemo(() => {
    const total = sectionStudents.length || 1;
    const alertCount = sectionStudents.filter((s) => s.status === "ALERT").length;
    const phoneCount = sectionStudents.filter((s) => s.status === "PHONE_USAGE").length;
    const sleepCount = sectionStudents.filter((s) => s.status === "SLEEPING").length;
    const distractedCount = sectionStudents.filter((s) => s.status === "DISTRACTED").length;

    const avgAttention = Math.round(
      sectionStudents.reduce((acc, curr) => acc + curr.attentionScore, 0) / total,
    );

    return {
      total: sectionStudents.length,
      alertCount,
      alertPct: ((alertCount / total) * 100).toFixed(1),
      phoneCount,
      sleepCount,
      distractedCount,
      avgAttention: isNaN(avgAttention) ? 94 : avgAttention,
    };
  }, [sectionStudents]);

  // Update total students in data.session when section changes
  useEffect(() => {
    setData((prev) => ({
      ...prev,
      session: {
        ...prev.session,
        subjectName:
          selectedSection === "A"
            ? "CSE-2027 Section A Live Monitoring (1VI23CS001 - 064)"
            : selectedSection === "B"
            ? "CSE-2027 Section B Live Monitoring (1VI23CS065 - 120, 1VI24CS401 - 412)"
            : "CSE-2027 Department Live Monitoring (All Sections)",
        totalStudents: sectionStudents.length || (selectedSection === "A" ? 59 : 71),
      },
    }));
  }, [selectedSection, sectionStudents.length]);

  // Auto AI Behavior Scanner (simulates realistic micro-movements)
  useEffect(() => {
    if (!autoScannerActive || !sessionActive) return;

    const interval = setInterval(() => {
      setStudentBehaviors((prev) => {
        const next = { ...prev };
        const keys = Object.keys(next);
        if (keys.length === 0) return prev;

        // Pick 2 random alert students and oscillate their attention slightly
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        if (next[randomKey] && next[randomKey].status === "ALERT") {
          const delta = (Math.random() - 0.5) * 4;
          next[randomKey] = {
            ...next[randomKey],
            attentionScore: Math.min(100, Math.max(85, Math.round(next[randomKey].attentionScore + delta))),
            lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        }
        return next;
      });
    }, 12000);

    return () => clearInterval(interval);
  }, [autoScannerActive, sessionActive]);

  // Helper to trigger behavioral detection and persist alert in backend
  const triggerBehaviorDetection = async (
    targetType: "PHONE_USAGE" | "SLEEPING",
    specifiedStudent?: StudentBehaviorState,
  ) => {
    // Pick an enrolled student in current section
    const student =
      specifiedStudent ||
      sectionStudents.find((s) => s.status === "ALERT") ||
      sectionStudents[0];

    if (!student) return;

    const isPhone = targetType === "PHONE_USAGE";
    const newScore = isPhone ? 22 : 14;
    const postureStr = isPhone ? "Device in Hands • Looking Down" : "Head Down on Desk • Eyes Closed";

    // 1. Update frontend student behavior state
    setStudentBehaviors((prev) => ({
      ...prev,
      [student.usn]: {
        ...prev[student.usn],
        status: targetType,
        attentionScore: newScore,
        posture: postureStr,
        phoneDetected: isPhone,
        sleepingDetected: !isPhone,
        lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    }));

    // 2. Add event to Live Activity feed
    const newEvent: LiveAttendanceEvent = {
      type: targetType,
      studentId: student.usn,
      studentName: student.name,
      confidence: 0.94,
      time: new Date().toLocaleTimeString(),
    };
    setEvents((prev) => [newEvent, ...prev].slice(0, 50));

    // 3. Show prominent live toast notification in the monitoring interface
    setActiveLiveToast({
      id: `toast-${Date.now()}`,
      type: isPhone ? "PHONE" : "SLEEP",
      title: isPhone
        ? `[Section ${student.section}] 📱 Phone Detected: ${student.name}`
        : `[Section ${student.section}] 💤 Inactive / Sleeping: ${student.name}`,
      message: isPhone
        ? `Student ${student.name} (${student.usn}) in Section ${student.section} detected using a mobile phone. Dispatched to Teacher & HOD.`
        : `Student ${student.name} (${student.usn}) in Section ${student.section} is inactive (head down). Dispatched to Teacher & HOD.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      severity: isPhone ? "WARNING" : "CRITICAL",
    });

    // 4. Ingest into NestJS API to persist BehaviorEvent and create BehaviorAlert
    try {
      await api.post("/behavior/ingest", {
        studentId: student.usn,
        behaviorType: targetType,
        confidence: 0.94,
        classroomId: student.section === "B" ? "room-024" : "room-023",
        metadata: {
          section: student.section,
          studentName: student.name,
          location: `Row ${Math.floor(Math.random() * 3) + 1}, Desk ${Math.floor(Math.random() * 5) + 1}`,
        },
      });
    } catch (e) {
      console.warn("Failed to persist behavior event to backend:", e);
    }
  };

  // Reset all students back to alert
  const handleResetAllAlert = () => {
    setStudentBehaviors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (selectedSection === "ALL" || next[k].section === selectedSection) {
          next[k] = {
            ...next[k],
            status: "ALERT",
            attentionScore: 95,
            posture: "Upright",
            gaze: "Blackboard",
            phoneDetected: false,
            sleepingDetected: false,
            lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        }
      });
      return next;
    });
    setControlToast("All students marked Alert & Attentive");
    setTimeout(() => setControlToast(null), 2500);
  };

  // Video Controls
  const handleVideoControl = async (
    action: "forward" | "next" | "prev" | "speed",
    seconds: number = 30,
    speed: number = 1,
  ) => {
    const aiUrl = process.env.NEXT_PUBLIC_AI_HTTP_URL || "http://localhost:8000";
    try {
      if (action === "speed") {
        setPlaybackSpeed(speed);
      }
      const res = await fetch(`${aiUrl}/api/v1/camera/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera_id: selectedSection === "B" ? "room-024" : "room-023",
          action,
          seconds,
          speed: action === "speed" ? speed : playbackSpeed,
        }),
      });
      const resData = await res.json();
      if (action === "next") {
        setControlToast(`Skipped to ${resData.current_video || "next video"}`);
      } else if (action === "prev") {
        setControlToast(`Skipped to ${resData.current_video || "previous video"}`);
      } else if (action === "forward") {
        setControlToast(`Fast forwarded +${seconds}s`);
      } else if (action === "speed") {
        setControlToast(`Playback speed: ${speed}x`);
      }
      setTimeout(() => setControlToast(null), 2500);
    } catch (e) {
      console.error("Failed to execute video control:", e);
    }
  };

  // Toggle Session
  const handleToggleSession = async () => {
    const aiUrl = process.env.NEXT_PUBLIC_AI_HTTP_URL || "http://localhost:8000";

    if (sessionActive) {
      setSessionActive(false);
      const prevSid = activeSessionId;
      setActiveSessionId(null);
      setData((prev) => ({
        ...prev,
        cameraStatus: "OFFLINE",
        fps: 0,
        session: { ...prev.session, status: "ENDED" as any },
      }));
      window.history.pushState({}, "", window.location.pathname);

      fetch(`${aiUrl}/api/v1/attendance/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_id: selectedSection === "B" ? "room-024" : "room-023" }),
      }).catch((e) => console.warn("AI stop note:", e));

      if (prevSid) {
        api.post(`/attendance/sessions/${prevSid}/end`).catch((e) => console.warn("NestJS end session note:", e));
      }
    } else {
      try {
        setLoading(true);
        const newSessId = `SESS_${Date.now().toString(36).toUpperCase()}`;

        try {
          await fetch(`${aiUrl}/api/v1/attendance/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              camera_id: selectedSection === "B" ? "room-024" : "room-023",
              class_id: newSessId,
              source_path: "footage",
            }),
          });
        } catch (aiErr) {
          console.error("AI service start request error:", aiErr);
        }

        try {
          const res = await api.post<any>("/attendance/sessions/start", {
            institutionId: user?.institutionId || "cmqnr5ypa0005p16e5ri9s2hh",
            classroomId: selectedSection === "B" ? "room-024" : "room-023",
            teacherId: user?.id || "teacher-1",
            subjectName:
              selectedSection === "A"
                ? "CSE-2027 Section A Live Monitoring (1VI23CS001 - 064)"
                : "CSE-2027 Section B Live Monitoring",
            totalStudents: sectionStudents.length || 59,
          });
          const rawRes: any = res;
          if (rawRes && (rawRes.data?.sessionId || rawRes.sessionId)) {
            setActiveSessionId(rawRes.data?.sessionId || rawRes.sessionId);
          } else {
            setActiveSessionId(newSessId);
          }
        } catch (apiErr) {
          console.warn("NestJS session register note:", apiErr);
          setActiveSessionId(newSessId);
        }

        setSessionActive(true);
        setStreamKey(Date.now());
        setData((prev) => ({
          ...prev,
          cameraStatus: "ONLINE",
          fps: 25,
          session: { ...prev.session, status: "ACTIVE" as any, sessionId: newSessId },
        }));
        window.history.pushState({}, "", `${window.location.pathname}?sessionId=${newSessId}`);
      } catch (err) {
        console.error("Error starting session:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Event Filtering
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (eventFilter === "all") return true;
      if (eventFilter === "behavior") return e.type === "PHONE_USAGE" || e.type === "SLEEPING" || e.type === "DISTRACTED";
      if (eventFilter === "detected") return e.type === "ATTENDANCE_DETECTED";
      if (eventFilter === "unknown") return e.type === "UNKNOWN_PERSON";
      return true;
    });
  }, [events, eventFilter]);

  const eventColor = (type: string) => {
    switch (type) {
      case "PHONE_USAGE":
        return { bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400" };
      case "SLEEPING":
        return { bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-500 animate-pulse" };
      case "ATTENDANCE_DETECTED":
        return { bg: "bg-success/10", border: "border-success/20", dot: "bg-success" };
      case "UNKNOWN_PERSON":
        return { bg: "bg-warning/10", border: "border-warning/20", dot: "bg-warning" };
      default:
        return { bg: "bg-glass-subtle", border: "border-glass-border", dot: "bg-text-dim" };
    }
  };

  const eventLabel = (type: string) => {
    switch (type) {
      case "PHONE_USAGE":
        return "📱 Phone Usage Detected";
      case "SLEEPING":
        return "💤 Inactive / Sleeping Detected";
      case "ATTENDANCE_DETECTED":
        return "Attendance Marked";
      case "UNKNOWN_PERSON":
        return "Unknown Face Alert";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Floating Real-time Notification Toast ─────────────── */}
      <AnimatePresence>
        {activeLiveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-20 right-6 z-50 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl border max-w-md w-full",
              activeLiveToast.severity === "CRITICAL"
                ? "bg-red-950/90 border-red-500/50 shadow-red-900/40 text-red-100"
                : "bg-amber-950/90 border-amber-500/50 shadow-amber-900/40 text-amber-100",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl shrink-0">
                  {activeLiveToast.type === "PHONE" ? "📱" : "💤"}
                </span>
                <div>
                  <h4 className="text-xs font-bold leading-snug">{activeLiveToast.title}</h4>
                  <p className="text-[11px] text-white/80 mt-1 leading-normal">
                    {activeLiveToast.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveLiveToast(null)}
                className="text-white/60 hover:text-white text-xs p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10 text-[10px]">
              <span className="text-white/70">
                Notification dispatched to: <b>Teacher & HOD Accounts</b>
              </span>
              <button
                onClick={() => setActiveLiveToast(null)}
                className="px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white font-medium"
              >
                Acknowledge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Header & Section Controls ────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Live Classroom AI Monitoring
            </h1>

            {/* Section Switcher for HOD / Admin */}
            {(isHod || isAdmin) ? (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-glass-heavy border border-glass-border">
                <button
                  onClick={() => setSelectedSection("A")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                    selectedSection === "A"
                      ? "bg-ai-blue text-black font-bold shadow-md shadow-ai-blue/30"
                      : "text-text-muted hover:text-text-primary",
                  )}
                >
                  Section A (59 Students)
                </button>
                <button
                  onClick={() => setSelectedSection("B")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                    selectedSection === "B"
                      ? "bg-ai-blue text-black font-bold shadow-md shadow-ai-blue/30"
                      : "text-text-muted hover:text-text-primary",
                  )}
                >
                  Section B (71 Students)
                </button>
                <button
                  onClick={() => setSelectedSection("ALL")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                    selectedSection === "ALL"
                      ? "bg-ai-blue text-black font-bold shadow-md shadow-ai-blue/30"
                      : "text-text-muted hover:text-text-primary",
                  )}
                >
                  All CSE (130)
                </button>
              </div>
            ) : (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                Section A (1VI23CS001 - 064) • Teacher View
              </span>
            )}

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                sessionActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-400 border border-slate-500/20",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  sessionActive ? "bg-emerald-400 animate-pulse" : "bg-slate-400",
                )}
              />
              {sessionActive ? "AI CCTV ONLINE" : "STANDBY"}
            </span>
          </div>

          <p className="text-sm text-text-muted mt-1">
            {isHod
              ? "HOD Executive Portal · Real-time Behavioral & Biometric Stream · Section Segregated Routing"
              : "Teacher Faculty Portal · Live Alertness & Phone Usage Detection · Room 023 (Section A)"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl glass text-xs text-text-muted">
            <span className="font-mono">{sessionActive ? "25" : "0"}</span> FPS
          </div>
          <Button
            variant={sessionActive ? "destructive" : "primary"}
            size="sm"
            onClick={handleToggleSession}
            disabled={loading}
            className="flex items-center gap-2 font-semibold shadow-lg shadow-ai-blue/20"
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : sessionActive ? (
              <>
                <span className="h-2 w-2 rounded-full bg-error" />
                End Session
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-success animate-glow-pulse" />
                Start Session
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Main Monitoring Layout ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Camera Feed + Behavioral Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Camera Feed */}
          <GlassCard noPadding className="overflow-hidden border border-glass-border/40 shadow-2xl">
            <div className="relative aspect-video bg-[#0b0f17] flex items-center justify-center">
              <LiveCameraFeed
                sessionActive={sessionActive}
                streamKey={streamKey}
                cameraId={selectedSection === "B" ? "room-024" : "room-023"}
              />

              {sessionActive && (
                <div className="absolute top-3 left-3 right-3 flex gap-2 pointer-events-none">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success/20 backdrop-blur-md border border-success/30 text-[11px] font-semibold text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-glow-pulse" />
                    AI CCTV ACTIVE
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-text-muted">
                    Accuracy: <span className="text-ai-blue font-semibold">{data.session.recognitionAccuracy}%</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-text-muted ml-auto font-mono">
                    SECTION {selectedSection} • {stats.total} MONITORED
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Footage Forwarding & Playback Controls */}
          {sessionActive && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-glass-heavy border border-glass-border shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVideoControl("prev")}
                  className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-white/5"
                >
                  ⏮ Prev Clip
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleVideoControl("forward", 30)}
                  className="px-3 py-1.5 text-xs font-semibold text-ai-blue bg-ai-blue/15 hover:bg-ai-blue/25 border border-ai-blue/40 shadow-sm"
                >
                  ⏩ Forward +30s
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVideoControl("next")}
                  className="px-3 py-1 text-xs font-semibold text-text-primary hover:bg-white/10"
                >
                  ⏭ Next Clip
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {controlToast && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] font-medium text-ai-blue bg-ai-blue/10 px-2 py-0.5 rounded border border-ai-blue/20"
                  >
                    {controlToast}
                  </motion.span>
                )}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-text-dim text-[11px] mr-1">Speed:</span>
                  {[1, 2, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleVideoControl("speed", 0, s)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all",
                        playbackSpeed === s
                          ? "bg-ai-blue text-black font-bold shadow-sm shadow-ai-blue/30"
                          : "text-text-muted hover:text-text-primary bg-white/5",
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BEHAVIORAL ANALYTICS & ALERTNESS PANEL ─────────── */}
          <GlassCard className="border border-ai-blue/20 bg-gradient-to-b from-bg-secondary/70 to-bg-secondary/40 shadow-2xl">
            {/* Header with Title and Auto Scanner Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-glass-border">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-ai-blue/20 border border-ai-blue/40 flex items-center justify-center text-ai-blue">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-text-primary">
                      Student Behavioral Analytics & Alertness
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ai-blue/15 text-ai-blue border border-ai-blue/30">
                      LIVE INFERENCE
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Automated attention scoring, posture analysis & mobile phone usage detector
                  </p>
                </div>
              </div>

              {/* Simulation & Scan Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoScannerActive(!autoScannerActive)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                    autoScannerActive
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-white/5 text-text-muted border-glass-border hover:text-text-primary",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      autoScannerActive ? "bg-emerald-400 animate-pulse" : "bg-text-dim",
                    )}
                  />
                  Auto-Scanner: {autoScannerActive ? "ACTIVE" : "PAUSED"}
                </button>
              </div>
            </div>

            {/* Behavioral Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              {/* Alert / Attentive */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <div className="flex items-center justify-between text-emerald-400 text-xs mb-1 font-semibold">
                  <span>🟢 Alert & Active</span>
                  <span className="text-[10px] font-mono">{stats.alertPct}%</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{stats.alertCount}</p>
                <p className="text-[10px] text-text-muted mt-0.5">Normal posture & gaze</p>
              </div>

              {/* Phone Usage Detected */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center justify-between text-amber-400 text-xs mb-1 font-semibold">
                  <span>📱 Phone Usage</span>
                  {stats.phoneCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
                <p className="text-2xl font-bold text-amber-400">{stats.phoneCount}</p>
                <p className="text-[10px] text-text-muted mt-0.5">Device in hands detected</p>
              </div>

              {/* Sleeping / Inactive */}
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center justify-between text-red-400 text-xs mb-1 font-semibold">
                  <span>💤 Sleeping / Inactive</span>
                  {stats.sleepCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>
                <p className="text-2xl font-bold text-red-400">{stats.sleepCount}</p>
                <p className="text-[10px] text-text-muted mt-0.5">Head down / prolonged inactivity</p>
              </div>

              {/* Engagement Index */}
              <div className="p-3 rounded-xl bg-ai-blue/10 border border-ai-blue/30">
                <div className="flex items-center justify-between text-ai-blue text-xs mb-1 font-semibold">
                  <span>Classroom Alertness</span>
                  <Zap className="w-3.5 h-3.5 text-ai-blue" />
                </div>
                <p className="text-2xl font-bold text-ai-blue">{stats.avgAttention}%</p>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      stats.avgAttention >= 80 ? "bg-emerald-400" : stats.avgAttention >= 60 ? "bg-amber-400" : "bg-red-400",
                    )}
                    style={{ width: `${stats.avgAttention}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Simulation & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/5 my-3">
              <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-ai-blue" />
                AI Test Suite & Notification Triggers:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerBehaviorDetection("PHONE_USAGE")}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 shadow-sm"
                  title="Detect mobile phone usage and dispatch instant notification to Teacher & HOD accounts"
                >
                  📱 Test Phone Detection
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerBehaviorDetection("SLEEPING")}
                  className="px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 shadow-sm"
                  title="Detect student sleeping/inactive and dispatch critical alert to Teacher & HOD accounts"
                >
                  💤 Test Sleep / Inactive Alert
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetAllAlert}
                  className="px-3 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-white/10"
                >
                  🟢 Mark All Alert
                </Button>
              </div>
            </div>

            {/* Student Search & Status Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-3 pt-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search students in this section..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-glass-light border border-glass-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ai-blue/40"
                />
              </div>

              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 w-full sm:w-auto justify-end">
                {[
                  { id: "ALL", label: `All (${sectionStudents.length})` },
                  { id: "FLAGGED", label: `⚠️ Flagged (${stats.phoneCount + stats.sleepCount + stats.distractedCount})` },
                  { id: "ALERT", label: `🟢 Alert (${stats.alertCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setBehaviorFilter(f.id as any)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                      behaviorFilter === f.id
                        ? "bg-ai-blue text-black font-bold shadow-sm"
                        : "text-text-muted hover:text-text-primary",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Students Alertness Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {displayedStudents.length === 0 ? (
                <div className="col-span-full text-center py-12 text-text-muted text-xs">
                  No students found matching current filters.
                </div>
              ) : (
                displayedStudents.map((student) => {
                  const isPhone = student.status === "PHONE_USAGE";
                  const isSleeping = student.status === "SLEEPING";
                  const isAlert = student.status === "ALERT";

                  return (
                    <div
                      key={student.usn}
                      className={cn(
                        "p-3 rounded-xl border transition-all relative group",
                        isSleeping
                          ? "bg-red-500/10 border-red-500/40 shadow-sm shadow-red-950"
                          : isPhone
                          ? "bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-950"
                          : "bg-glass-subtle border-glass-border hover:border-emerald-500/40",
                      )}
                    >
                      {/* Student Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-text-muted font-mono">
                            {student.usn} • Sec {student.section}
                          </p>
                        </div>

                        {/* Status Pill */}
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1",
                            isSleeping
                              ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                              : isPhone
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                          )}
                        >
                          {isSleeping ? "💤 Sleeping" : isPhone ? "📱 Phone Active" : "🟢 Alert"}
                        </span>
                      </div>

                      {/* Attention Meter */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-text-muted">Attention Score:</span>
                          <span
                            className={cn(
                              "font-bold font-mono",
                              student.attentionScore >= 75
                                ? "text-emerald-400"
                                : student.attentionScore >= 50
                                ? "text-amber-400"
                                : "text-red-400",
                            )}
                          >
                            {student.attentionScore}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              student.attentionScore >= 75
                                ? "bg-emerald-400"
                                : student.attentionScore >= 50
                                ? "bg-amber-400"
                                : "bg-red-400",
                            )}
                            style={{ width: `${student.attentionScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Posture & Gaze Details */}
                      <div className="mt-2 text-[10px] text-text-dim flex items-center justify-between border-t border-white/5 pt-1.5">
                        <span className="truncate">{student.posture}</span>
                        <span className="font-mono text-text-muted shrink-0">{student.lastUpdated}</span>
                      </div>

                      {/* Quick Action on Individual Student */}
                      <div className="mt-2 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => triggerBehaviorDetection("PHONE_USAGE", student)}
                          className="flex-1 py-1 px-1 rounded text-[9px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
                        >
                          📱 Flag Phone
                        </button>
                        <button
                          onClick={() => triggerBehaviorDetection("SLEEPING", student)}
                          className="flex-1 py-1 px-1 rounded text-[9px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-colors"
                        >
                          💤 Flag Sleep
                        </button>
                        {!isAlert && (
                          <button
                            onClick={() => {
                              setStudentBehaviors((prev) => ({
                                ...prev,
                                [student.usn]: {
                                  ...prev[student.usn],
                                  status: "ALERT",
                                  attentionScore: 96,
                                  posture: "Upright",
                                  gaze: "Blackboard",
                                  phoneDetected: false,
                                  sleepingDetected: false,
                                },
                              }));
                            }}
                            className="p-1 rounded text-[9px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                            title="Reset to Alert"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Timer & Live Feed */}
        <div className="space-y-4">
          {/* Timer Card */}
          <GlassCard>
            <div className="text-center">
              <p className="text-[11px] text-text-muted mb-1">Session Duration</p>
              <p className="text-3xl font-bold text-text-primary tabular-nums tracking-wider">
                {formatDuration(sessionDuration)}
              </p>
              <p className="text-xs text-text-muted mt-1">{data.session.subjectName}</p>
            </div>
          </GlassCard>

          {/* Event Filters */}
          <div className="flex gap-1 p-1 glass rounded-xl border border-glass-border">
            {[
              { id: "all", label: "All Events" },
              { id: "behavior", label: "Behavior Alerts ⚠️" },
              { id: "detected", label: "Attendance" },
              { id: "unknown", label: "Unknown" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setEventFilter(f.id)}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                  eventFilter === f.id
                    ? "bg-ai-blue text-black font-semibold shadow-md shadow-ai-blue/20"
                    : "text-text-dim hover:text-text-primary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Live Activity & Behavior Event Stream */}
          <GlassCard noPadding>
            <div className="p-3 border-b border-glass-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-ai-blue" />
                <h3 className="text-xs font-semibold text-text-primary">Live Activity Log</h3>
              </div>
              <span className="text-[10px] text-text-muted">{filteredEvents.length} events</span>
            </div>
            <div className="overflow-y-auto max-h-[560px] p-2 space-y-1.5">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-xs">
                  {sessionActive ? "Waiting for behavioral and face events..." : "Session is currently inactive."}
                </div>
              ) : (
                <AnimatePresence>
                  {filteredEvents.slice(0, 35).map((event, i) => {
                    const colors = eventColor(event.type);
                    const isBehaviorEvent = event.type === "PHONE_USAGE" || event.type === "SLEEPING";

                    return (
                      <motion.div
                        key={`${event.time}-${event.studentId}-${i}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={cn(
                          "flex items-start gap-2.5 p-2 rounded-lg border transition-all",
                          colors.bg,
                          colors.border,
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full mt-1 shrink-0", colors.dot)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "text-[11px] font-semibold",
                                event.type === "PHONE_USAGE"
                                  ? "text-amber-400"
                                  : event.type === "SLEEPING"
                                  ? "text-red-400"
                                  : event.type === "UNKNOWN_PERSON"
                                  ? "text-warning"
                                  : "text-text-primary",
                              )}
                            >
                              {eventLabel(event.type)}
                            </span>
                            <span className="text-[10px] text-text-muted shrink-0">{event.time}</span>
                          </div>
                          {event.studentName && (
                            <p className="text-[11px] text-text-secondary mt-0.5 font-medium">
                              {event.studentName} •{" "}
                              <span className="font-mono text-[10px] text-text-muted">
                                {event.studentId}
                              </span>
                            </p>
                          )}
                          {isBehaviorEvent && (
                            <p className="text-[10px] text-text-dim mt-0.5">
                              Alert dispatched to Teacher & HOD
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
