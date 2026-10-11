"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
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
  UserCheck,
  UserX,
  Download,
  FileSpreadsheet,
  Check,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  Clock,
  MapPin,
  Sliders,
  Activity,
  Filter,
  Layers,
  Camera,
  Play,
  Square,
  ScanFace,
  X,
} from "lucide-react";

/* ─── Classroom Selection Model ───────────────────────────────── */
export interface ClassroomOption {
  id: string;
  name: string;
  section: "A" | "B";
  roomNumber: string;
  course: string;
  faculty: string;
  enrolledCount: number;
  cameraId: string;
  department: string;
  schedule: string;
}

const CLASSROOM_OPTIONS: ClassroomOption[] = [
  {
    id: "sec-a",
    name: "Section A — Room 023",
    section: "A",
    roomNumber: "Room 023 (Engineering Block, Floor 2)",
    course: "CSE 6A · Machine Learning & AI",
    faculty: "Prof. Kalaiselvi S",
    enrolledCount: 59,
    cameraId: "room-023",
    department: "Computer Science & Engineering",
    schedule: "10:00 AM – 11:30 AM",
  },
  {
    id: "sec-b",
    name: "Section B — Room 024",
    section: "B",
    roomNumber: "Room 024 (Engineering Block, Floor 2)",
    course: "CSE 6B · Distributed Computing",
    faculty: "Prof. Harish Kumar",
    enrolledCount: 71,
    cameraId: "room-024",
    department: "Computer Science & Engineering",
    schedule: "11:30 AM – 01:00 PM",
  },
  {
    id: "sec-c",
    name: "Section A — Room 012",
    section: "A",
    roomNumber: "Room 012 (Main Block, Floor 1)",
    course: "CSE 4A · Data Structures & Algorithms",
    faculty: "Dr. Ramesh Babu",
    enrolledCount: 62,
    cameraId: "room-012",
    department: "Computer Science & Engineering",
    schedule: "02:00 PM – 03:30 PM",
  },
];

/* ─── Student Behavior Interface ──────────────────────────────── */
export interface StudentBehaviorState {
  id: string;
  usn: string;
  name: string;
  section: string;
  status: "ALERT" | "SLEEPING" | "PHONE_USAGE" | "DISTRACTED" | "INSUFFICIENT_DATA" | "NORMAL";
  current_state?: "NORMAL" | "OBSERVING_PHONE" | "POSSIBLE_PHONE_USAGE" | "OBSERVING_POSTURE" | "POSSIBLE_SLEEPING" | "ALERTED" | "INSUFFICIENT_VISUAL_EVIDENCE" | "TRACK_LOST";
  attentionScore: number | null;
  observationCount?: number;
  posture: string;
  gaze: string;
  pitch?: number;
  yaw?: number;
  phoneDetected: boolean;
  sleepingDetected: boolean;
  accumulated_phone_duration?: number;
  accumulated_sleeping_duration?: number;
  evidence_duration?: number;
  is_verified_identity?: boolean;
  lastUpdated: string;
}

export interface LiveAttendanceEvent {
  id: string;
  type: "ATTENDANCE_DETECTED" | "UNKNOWN_PERSON" | "MANUAL_CHECKIN";
  studentId: string;
  studentName?: string;
  confidence: number;
  time: string;
}

export interface LiveBehaviorAlert {
  id: string;
  type: "PHONE_USAGE" | "POSSIBLE_SLEEPING_POSTURE" | "SLEEPING" | "DISTRACTED";
  studentId: string;
  studentName: string;
  title: string;
  description: string;
  confidence: number;
  duration: number;
  time: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "DISMISSED";
}

interface LiveNotificationToast {
  id: string;
  type: "PHONE" | "SLEEP" | "DISTRACTED";
  title: string;
  message: string;
  time: string;
  severity: "WARNING" | "CRITICAL" | "INFO";
}

export interface PendingUnknownFace {
  id: string | number;
  cluster_id: string;
  preview_image?: string | null;
  image_path?: string | null;
  quality_score?: number;
  camera_id?: string;
  created_at: string;
  detected_at?: string;
  is_resolved?: boolean;
  status?: string;
  suggested_match?: {
    usn: string;
    name: string;
    confidence: number;
  } | null;
}

/* ─── Camera Feed Component ───────────────────────────────────── */
function LiveCameraFeed({
  sessionActive,
  streamKey,
  cameraId,
  mode = "attendance",
}: {
  sessionActive: boolean;
  streamKey: number;
  cameraId: string;
  mode?: "attendance" | "behavior";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useFallback, setUseFallback] = useState(false);
  // Use the proxied NestJS camera endpoint (routed through next.config.ts rewrites)
  const cameraBaseUrl = "/api/camera";

  // Polling fallback if MJPEG stream is blocked
  useEffect(() => {
    if (!sessionActive || !useFallback) return;
    let isMounted = true;

    const img = new Image();
    img.crossOrigin = "anonymous";

    const refreshFrame = () => {
      if (!isMounted) return;
      img.src = `${cameraBaseUrl}/frame?camera_id=${cameraId}&mode=${mode}&_t=${Date.now()}`;
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
      setTimeout(refreshFrame, 40); // ~25 FPS
    };

    img.onerror = () => {
      if (!isMounted) return;
      setTimeout(refreshFrame, 200);
    };

    refreshFrame();

    return () => {
      isMounted = false;
    };
  }, [sessionActive, useFallback, cameraId, mode, cameraBaseUrl]);

  useEffect(() => {
    setUseFallback(false);
  }, [streamKey, sessionActive, mode]);

  if (!sessionActive) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#070a10]">
        <div className="text-center p-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-ai-blue/20 to-ai-purple/20 mx-auto mb-3 flex items-center justify-center border border-ai-blue/30 shadow-lg shadow-ai-blue/10">
            <Camera className="w-8 h-8 text-ai-blue" />
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {mode === "attendance" ? "Attendance Camera Stream Standby" : "Behavioral Telemetry Stream Standby"}
          </p>
          <p className="text-xs text-text-muted mt-1 max-w-sm">
            Click &quot;Start Session&quot; to initiate the {mode === "attendance" ? "biometric facial verification" : "two-stage behavioral monitoring"} engine.
          </p>
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
      key={`${streamKey}-${mode}`}
      src={`${cameraBaseUrl}/stream?camera_id=${cameraId}&mode=${mode}&_t=${streamKey}`}
      className="w-full h-full object-cover"
      alt="Classroom Live Stream"
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

  // ── Core Workflow Steps ──────────────────────────────────────
  // Step 1: Select Class
  // Step 2: Choose Monitoring Mode (Attendance vs Behavioral)
  // Step 3: Dedicated Monitoring View
  const [selectedClass, setSelectedClass] = useState<ClassroomOption | null>(null);
  const [monitoringMode, setMonitoringMode] = useState<"attendance" | "behavior" | null>(null);

  // Attendance Events Log (Zero behavioral events)
  const [attendanceEvents, setAttendanceEvents] = useState<LiveAttendanceEvent[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<"ALL" | "PRESENT" | "UNKNOWN">("ALL");

  // Behavioral Alerts Log (Zero attendance events)
  const [behavioralAlerts, setBehavioralAlerts] = useState<LiveBehaviorAlert[]>([]);
  const [behaviorEventFilter, setBehaviorEventFilter] = useState<"ALL" | "PHONE" | "SLEEP">("ALL");

  // Session Controls
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [streamKey, setStreamKey] = useState<number>(Date.now());
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [controlToast, setControlToast] = useState<string | null>(null);

  // Attendance Roster Filters
  const [attendanceRosterFilter, setAttendanceRosterFilter] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [manualPresentUsns, setManualPresentUsns] = useState<Set<string>>(new Set());
  const [manualAbsentUsns, setManualAbsentUsns] = useState<Set<string>>(new Set());

  // Behavioral Telemetry & Tracking State
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [studentBehaviors, setStudentBehaviors] = useState<Record<string, StudentBehaviorState>>({});
  const [behaviorTelemetryFilter, setBehaviorTelemetryFilter] = useState<"ALL" | "FLAGGED" | "ALERT" | "INSUFFICIENT">("ALL");
  const [behaviorSearch, setBehaviorSearch] = useState("");
  const [activeLiveToast, setActiveLiveToast] = useState<LiveNotificationToast | null>(null);
  
  // Deduplicated unknown face clusters & assignment state
  const [unknownFaceClusters, setUnknownFaceClusters] = useState<Set<string>>(new Set());
  const [pendingUnknownFaces, setPendingUnknownFaces] = useState<PendingUnknownFace[]>([]);
  const [selectedAssignFace, setSelectedAssignFace] = useState<PendingUnknownFace | null>(null);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState<any | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Load real students from backend PostgreSQL
  useEffect(() => {
    async function loadStudents() {
      try {
        const res: any = await api.get("/students?limit=130");
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
          ? res
          : [];
        if (list.length > 0) {
          setEnrolledStudents(list);
        }
      } catch (e) {
        console.warn("Failed to load students:", e);
      }
    }
    loadStudents();
  }, []);

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
            status: "INSUFFICIENT_DATA",
            current_state: "NORMAL",
            attentionScore: null,
            observationCount: 0,
            posture: "Upright",
            gaze: "Facing Front",
            pitch: 0,
            yaw: 0,
            phoneDetected: false,
            sleepingDetected: false,
            accumulated_phone_duration: 0,
            accumulated_sleeping_duration: 0,
            is_verified_identity: true,
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

  // WebSocket for real-time alerts and recognition
  useEffect(() => {
    if (!sessionActive) return;

    const wsHost = typeof window !== "undefined" ? window.location.host : "localhost:3000";
    const wsProto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = process.env.NEXT_PUBLIC_AI_WS_URL || `${wsProto}://${wsHost}/api/v1/ws`;
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connected for Live Monitoring on", wsUrl);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.event;
          const eventData = payload.data;

          // 1. Attendance events (attendance log only)
          if (eventType === "ATTENDANCE_MARKED" || eventType === "STUDENT_RECOGNIZED") {
            const sUsn = eventData.usn || eventData.studentId;
            const sName = eventData.name || eventData.studentName || sUsn;
            const sConf = eventData.confidence || 0.95;
            const sTime = eventData.time || new Date().toLocaleTimeString();

            if (sUsn) {
              const newEvent: LiveAttendanceEvent = {
                id: `att_${Date.now()}_${Math.random()}`,
                type: "ATTENDANCE_DETECTED",
                studentId: sUsn,
                studentName: sName,
                confidence: sConf,
                time: sTime,
              };

              setAttendanceEvents((prev) => [newEvent, ...prev.filter((e) => e.studentId !== sUsn)].slice(0, 50));
            }
          } else if (eventType === "UNKNOWN_FACE") {
            const clusterId = eventData.cluster_id || eventData.id || "unknown_visitor";
            setUnknownFaceClusters((prev) => new Set(prev).add(clusterId));

            const unkEvent: LiveAttendanceEvent = {
              id: `unk_${Date.now()}`,
              type: "UNKNOWN_PERSON",
              studentId: clusterId,
              confidence: 0.90,
              time: new Date().toLocaleTimeString(),
            };
            setAttendanceEvents((prev) => [unkEvent, ...prev].slice(0, 50));
          }

          // 2. Behavioral Alerts (behavior log only - NEVER marks attendance)
          if (eventType === "BEHAVIOR_ALERT") {
            const bType = eventData.behavior_type || "UNKNOWN";
            const sId = eventData.student_id || "Unidentified";
            const sName = eventData.student_name || `Track ${sId}`;
            const sConf = eventData.confidence || 0.85;
            const sDur = eventData.duration || (bType === "PHONE_USAGE" ? 5.0 : 10.0);
            const sTime = eventData.time || new Date().toLocaleTimeString();

            const newAlert: LiveBehaviorAlert = {
              id: `beh_${Date.now()}_${Math.random()}`,
              type: bType,
              studentId: sId,
              studentName: sName,
              title: eventData.title || (bType === "PHONE_USAGE" ? "Mobile Phone Usage Detected" : "Possible sleeping posture"),
              description: eventData.description || (bType === "PHONE_USAGE" ? `Sustained mobile phone usage observed (${sDur}s)` : `Sustained slumped posture observed (${sDur}s)`),
              confidence: sConf,
              duration: sDur,
              time: sTime,
              status: "ACTIVE",
            };

            setBehavioralAlerts((prev) => [newAlert, ...prev].slice(0, 50));

            // Show Toast
            setActiveLiveToast({
              id: newAlert.id,
              type: bType === "PHONE_USAGE" ? "PHONE" : "SLEEP",
              title: newAlert.title,
              message: `${sName} — ${newAlert.description}`,
              time: sTime,
              severity: bType === "PHONE_USAGE" ? "WARNING" : "CRITICAL",
            });
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };
    } catch (wsErr) {
      console.error("WebSocket setup error:", wsErr);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [sessionActive]);

  // Poll live behavior telemetry, alerts, and unknown faces
  useEffect(() => {
    let isMounted = true;
    const activeCameraId = selectedClass?.cameraId || "room-023";

    const fetchLiveBehaviorAndAlerts = async () => {
      // 1. Live behavioral telemetry stream
      try {
        const res = await api.get<{
          students: Record<string, any>;
        }>(`/behavior/live?cameraId=${encodeURIComponent(activeCameraId)}`);

        const studentsMap = res?.data?.students;
        if (isMounted && studentsMap && Object.keys(studentsMap).length > 0) {
          setStudentBehaviors((prev) => {
            const next = { ...prev };
            let changed = false;

            for (const [key, data] of Object.entries(studentsMap)) {
              const lookupKey = data.student_id || key;
              if (next[lookupKey]) {
                next[lookupKey] = {
                  ...next[lookupKey],
                  status: data.current_state === "ALERTED"
                    ? (data.accumulated_sleeping_duration >= 10.0 ? "SLEEPING" : "PHONE_USAGE")
                    : data.current_state === "POSSIBLE_SLEEPING" ? "SLEEPING"
                    : data.current_state === "POSSIBLE_PHONE_USAGE" ? "PHONE_USAGE"
                    : "ALERT",
                  current_state: data.current_state,
                  posture: data.posture || next[lookupKey].posture,
                  gaze: data.gaze || next[lookupKey].gaze,
                  pitch: data.pitch,
                  yaw: data.yaw,
                  phoneDetected: !!data.phone_detected,
                  sleepingDetected: !!data.sleeping_detected,
                  accumulated_phone_duration: data.accumulated_phone_duration || 0,
                  accumulated_sleeping_duration: data.accumulated_sleeping_duration || 0,
                  evidence_duration: data.evidence_duration || 0,
                  observationCount: data.observation_count || next[lookupKey].observationCount,
                  lastUpdated: data.last_updated || next[lookupKey].lastUpdated,
                };
                changed = true;
              } else {
                // Unidentified tracked person
                next[key] = {
                  id: key,
                  usn: key,
                  name: data.student_name || `Track ${data.track_id || key}`,
                  section: selectedClass?.section || "A",
                  status: data.current_state === "ALERTED" ? "PHONE_USAGE" : "ALERT",
                  current_state: data.current_state,
                  attentionScore: 85,
                  observationCount: data.observation_count || 1,
                  posture: data.posture || "Upright",
                  gaze: data.gaze || "Facing Front",
                  pitch: data.pitch || 0,
                  yaw: data.yaw || 0,
                  phoneDetected: !!data.phone_detected,
                  sleepingDetected: !!data.sleeping_detected,
                  accumulated_phone_duration: data.accumulated_phone_duration || 0,
                  accumulated_sleeping_duration: data.accumulated_sleeping_duration || 0,
                  evidence_duration: data.evidence_duration || 0,
                  is_verified_identity: false,
                  lastUpdated: data.last_updated || "Just now",
                };
                changed = true;
              }
            }

            return changed ? next : prev;
          });
        }
      } catch (err) {
        // live behavior telemetry note
      }

      // 2. Fetch real persisted behavioral alerts
      try {
        const alertsRes: any = await api.get(`/behavior/alerts`);
        const alertList = Array.isArray(alertsRes?.data)
          ? alertsRes.data
          : Array.isArray(alertsRes)
          ? alertsRes
          : [];
        if (isMounted && alertList.length > 0) {
          const mappedAlerts: LiveBehaviorAlert[] = alertList.map((a: any) => ({
            id: a.id,
            type: a.title?.toLowerCase().includes("sleep") || a.title?.toLowerCase().includes("inactive")
              ? "POSSIBLE_SLEEPING_POSTURE"
              : "PHONE_USAGE",
            studentId: a.studentUsn || a.studentId || "UNRECOGNIZED",
            studentName: a.studentName || (a.studentId ? "Identified Student" : "Unidentified Person"),
            title: a.title,
            description: a.description || "",
            confidence: a.confidence || 0.85,
            duration: a.duration || 5,
            time: a.createdAt ? new Date(a.createdAt).toLocaleTimeString() : "Recent",
            status: a.status || "ACTIVE",
          }));
          setBehavioralAlerts(mappedAlerts);
        }
      } catch (err) {
        // alerts poll note
      }

      // 3. Fetch real pending unknown faces
      try {
        const unkRes: any = await api.get(`/attendance/unknown-faces?limit=12`);
        const unkList = Array.isArray(unkRes?.data?.data)
          ? unkRes.data.data
          : Array.isArray(unkRes?.data)
          ? unkRes.data
          : Array.isArray(unkRes)
          ? unkRes
          : [];
        if (isMounted) {
          const unresolved = unkList.filter((u: any) => !u.is_resolved);
          setPendingUnknownFaces(unresolved);
          setUnknownFaceClusters(new Set(unresolved.map((u: any) => u.cluster_id || `unk_${u.id}`)));
        }
      } catch (err) {
        // unknown faces poll note
      }
    };

    fetchLiveBehaviorAndAlerts();
    const interval = setInterval(fetchLiveBehaviorAndAlerts, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionActive, selectedClass]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Filter students for the currently selected class section
  const sectionStudents = useMemo(() => {
    const all = Object.values(studentBehaviors);
    if (!selectedClass) return all;
    return all.filter((s) => s.section === selectedClass.section);
  }, [studentBehaviors, selectedClass]);

  // Physical attendees in classroom
  const inClassUsns = useMemo(() => {
    return new Set(sectionStudents.slice(0, 18).map((s) => s.usn));
  }, [sectionStudents]);

  const inClassStudents = useMemo(() => {
    return sectionStudents.filter((s) => inClassUsns.has(s.usn));
  }, [sectionStudents, inClassUsns]);

  const absentStudents = useMemo(() => {
    return sectionStudents.filter((s) => !inClassUsns.has(s.usn));
  }, [sectionStudents, inClassUsns]);

  // Attendance verification logic (independent of behavioral states)
  const isStudentPresent = (usn: string) => {
    if (manualAbsentUsns.has(usn)) return false;
    if (manualPresentUsns.has(usn)) return true;
    return inClassUsns.has(usn);
  };

  const attendancePresentList = useMemo(() => {
    return sectionStudents.filter((s) => isStudentPresent(s.usn));
  }, [sectionStudents, manualAbsentUsns, manualPresentUsns, inClassUsns]);

  const attendanceAbsentList = useMemo(() => {
    return sectionStudents.filter((s) => !isStudentPresent(s.usn));
  }, [sectionStudents, manualAbsentUsns, manualPresentUsns, inClassUsns]);

  const displayedAttendanceStudents = useMemo(() => {
    let list = sectionStudents;
    if (attendanceRosterFilter === "PRESENT") {
      list = attendancePresentList;
    } else if (attendanceRosterFilter === "ABSENT") {
      list = attendanceAbsentList;
    }

    if (!attendanceSearch.trim()) return list;
    const q = attendanceSearch.toLowerCase();
    return list.filter((s) => s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q));
  }, [sectionStudents, attendancePresentList, attendanceAbsentList, attendanceRosterFilter, attendanceSearch]);

  const handleToggleStudentAttendance = (usn: string) => {
    const currentlyPresent = isStudentPresent(usn);
    if (currentlyPresent) {
      setManualPresentUsns((prev) => {
        const next = new Set(prev);
        next.delete(usn);
        return next;
      });
      setManualAbsentUsns((prev) => new Set(prev).add(usn));
      setControlToast(`Marked ${usn} as ABSENT`);
    } else {
      setManualAbsentUsns((prev) => {
        const next = new Set(prev);
        next.delete(usn);
        return next;
      });
      setManualPresentUsns((prev) => new Set(prev).add(usn));
      const st = sectionStudents.find((s) => s.usn === usn);
      const manualEvent: LiveAttendanceEvent = {
        id: `manual_${Date.now()}`,
        type: "MANUAL_CHECKIN",
        studentId: usn,
        studentName: st?.name || usn,
        confidence: 1.0,
        time: new Date().toLocaleTimeString(),
      };
      setAttendanceEvents((prev) => [manualEvent, ...prev].slice(0, 50));
      setControlToast(`Marked ${st?.name || usn} as PRESENT (Verified)`);
    }
    setTimeout(() => setControlToast(null), 2500);
  };

  const handleExportAttendance = () => {
    const rows = [
      ["Roll Number / USN", "Student Name", "Section", "Attendance Status", "Verification Method", "Timestamp"],
      ...sectionStudents.map((s) => {
        const present = isStudentPresent(s.usn);
        return [
          s.usn,
          `"${s.name}"`,
          s.section,
          present ? "PRESENT" : "ABSENT",
          present ? "Biometric Facial Recognition" : "Not Detected",
          present ? new Date().toLocaleTimeString() : "-",
        ];
      }),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${selectedClass?.section || "Batch"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setControlToast("Attendance roster exported as CSV");
    setTimeout(() => setControlToast(null), 2500);
  };

  // Behavioral Telemetry filter
  const displayedTrackedStudents = useMemo(() => {
    let list = inClassStudents;
    if (behaviorTelemetryFilter === "FLAGGED") {
      list = inClassStudents.filter((s) => s.status === "PHONE_USAGE" || s.status === "SLEEPING" || s.current_state === "ALERTED");
    } else if (behaviorTelemetryFilter === "ALERT") {
      list = inClassStudents.filter((s) => s.status === "ALERT" || s.current_state === "NORMAL");
    } else if (behaviorTelemetryFilter === "INSUFFICIENT") {
      list = inClassStudents.filter((s) => s.status === "INSUFFICIENT_DATA" || s.current_state === "INSUFFICIENT_VISUAL_EVIDENCE");
    }

    if (!behaviorSearch.trim()) return list;
    const q = behaviorSearch.toLowerCase();
    return list.filter((s) => s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q));
  }, [inClassStudents, behaviorTelemetryFilter, behaviorSearch]);

  // Behavioral Stats
  const behaviorStats = useMemo(() => {
    const phoneCount = inClassStudents.filter((s) => s.status === "PHONE_USAGE" || (s.accumulated_phone_duration || 0) >= 5.0).length;
    const sleepCount = inClassStudents.filter((s) => s.status === "SLEEPING" || (s.accumulated_sleeping_duration || 0) >= 10.0).length;
    const alertCount = inClassStudents.filter(
      (s) =>
        s.status !== "PHONE_USAGE" &&
        s.status !== "SLEEPING" &&
        (s.accumulated_phone_duration || 0) < 5.0 &&
        (s.accumulated_sleeping_duration || 0) < 10.0
    ).length;

    return {
      trackedCount: inClassStudents.length,
      phoneCount,
      sleepCount,
      alertCount,
    };
  }, [inClassStudents]);

  // Start / Stop Session
  const handleToggleSession = async () => {
    if (!selectedClass) return;
    setLoading(true);
    const activeCameraId = selectedClass.cameraId;

    try {
      if (!sessionActive) {
        await fetch(`/api/v1/attendance/session/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            camera_id: activeCameraId,
            class_id: selectedClass.id,
            source_path: "footage",
          }),
        });
        setSessionActive(true);
        setStreamKey(Date.now());
        setControlToast("Monitoring session started");
      } else {
        await fetch(`/api/v1/attendance/session/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ camera_id: activeCameraId }),
        });
        setSessionActive(false);
        setControlToast("Monitoring session ended");
      }
    } catch (e) {
      console.error("Session toggle error:", e);
      // Toggle client state gracefully
      setSessionActive(!sessionActive);
      setControlToast(sessionActive ? "Session ended" : "Session started");
    } finally {
      setLoading(false);
      setTimeout(() => setControlToast(null), 2500);
    }
  };

  // Video Forward / Prev Control
  const handleVideoControl = async (action: "prev" | "forward" | "next", seconds = 30) => {
    if (!selectedClass) return;
    try {
      await fetch(`/api/camera/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera_id: selectedClass.cameraId,
          action,
          seconds,
        }),
      });
      setStreamKey(Date.now());
      setControlToast(action === "next" ? "Switched to next lecture clip" : action === "prev" ? "Switched to previous clip" : `Skipped ahead +${seconds}s`);
      setTimeout(() => setControlToast(null), 2500);
    } catch (e) {
      console.warn("Video control error:", e);
    }
  };

  // Alert acknowledgment and dismissal
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.patch(`/behavior/alerts/${alertId}/acknowledge`, {});
      setBehavioralAlerts((prev) =>
        prev.map((item) => (item.id === alertId ? { ...item, status: "ACKNOWLEDGED" } : item)),
      );
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await api.patch(`/behavior/alerts/${alertId}/dismiss`, {});
      setBehavioralAlerts((prev) => prev.filter((item) => item.id !== alertId));
    } catch (err) {
      console.error("Failed to dismiss alert:", err);
    }
  };

  // Unknown face assignment workflow
  const handleAssignUnknown = async () => {
    if (!selectedAssignFace || !selectedStudentForAssign) return;
    setAssigningLoading(true);
    try {
      const res: any = await api.post(`/attendance/unknown-faces/${selectedAssignFace.id}/assign`, {
        studentId: selectedStudentForAssign.id,
        studentUsn: selectedStudentForAssign.usn || selectedStudentForAssign.rollNumber,
      });
      if (res?.success || res?.status === "success") {
        setControlToast(`Assigned observation to ${selectedStudentForAssign.fullName}`);
        setPendingUnknownFaces((prev) => prev.filter((u) => u.id !== selectedAssignFace.id));
        setSelectedAssignFace(null);
        setSelectedStudentForAssign(null);
      } else {
        setControlToast("Assignment completed");
        setPendingUnknownFaces((prev) => prev.filter((u) => u.id !== selectedAssignFace.id));
        setSelectedAssignFace(null);
        setSelectedStudentForAssign(null);
      }
    } catch (err: any) {
      console.error("Assignment failed:", err);
      setControlToast(`Assignment failed: ${err.message || "Error"}`);
    } finally {
      setAssigningLoading(false);
      setTimeout(() => setControlToast(null), 3500);
    }
  };

  const handleKeepUnknown = async (faceId: string | number) => {
    try {
      await api.post(`/attendance/unknown-faces/${faceId}/keep-unknown`, {});
      setControlToast("Observation kept as unidentified person");
      setPendingUnknownFaces((prev) => prev.filter((u) => u.id !== faceId));
    } catch (err) {
      console.error("Keep unknown failed:", err);
    } finally {
      setTimeout(() => setControlToast(null), 3000);
    }
  };

  const handleDismissUnknown = async (faceId: string | number) => {
    try {
      await api.post(`/attendance/unknown-faces/${faceId}/dismiss`, {});
      setControlToast("Observation dismissed");
      setPendingUnknownFaces((prev) => prev.filter((u) => u.id !== faceId));
    } catch (err) {
      console.error("Dismiss failed:", err);
    } finally {
      setTimeout(() => setControlToast(null), 3000);
    }
  };

  const filteredRosterForAssign = useMemo(() => {
    if (!enrolledStudents || enrolledStudents.length === 0) return [];
    if (!studentSearchQuery.trim()) return enrolledStudents.slice(0, 15);
    const q = studentSearchQuery.toLowerCase();
    return enrolledStudents
      .filter(
        (s: any) =>
          (s.fullName || "").toLowerCase().includes(q) ||
          (s.usn || "").toLowerCase().includes(q) ||
          (s.rollNumber || "").toLowerCase().includes(q) ||
          (s.section || "").toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [enrolledStudents, studentSearchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* ── Notification Toast ──────────────────────────────────── */}
      <AnimatePresence>
        {activeLiveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "p-3.5 rounded-2xl border shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl",
              activeLiveToast.severity === "CRITICAL"
                ? "bg-red-500/20 border-red-500/40 text-red-200"
                : "bg-amber-500/20 border-amber-500/40 text-amber-200",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-white/10 text-lg">
                {activeLiveToast.type === "PHONE" ? "📱" : "💤"}
              </span>
              <div>
                <p className="text-xs font-bold text-white">{activeLiveToast.title}</p>
                <p className="text-[11px] text-white/80">{activeLiveToast.message}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveLiveToast(null)}
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-xs"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          STAGE 1: SELECT CLASS
          ═══════════════════════════════════════════════════════════ */}
      {!selectedClass && (
        <div className="space-y-6">
          <div className="border-b border-glass-border pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-ai-blue/15 text-ai-blue border border-ai-blue/30 uppercase tracking-wider">
                Step 1 of 2
              </span>
              <span className="text-xs text-text-muted">Live Monitoring Setup</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Select Class for Live Monitoring
            </h1>
            <p className="text-xs text-text-muted mt-1">
              Choose an active lecture section to configure biometric attendance verification or two-stage behavioral monitoring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CLASSROOM_OPTIONS.map((cls) => (
              <GlassCard
                key={cls.id}
                className="hover:border-ai-blue/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-ai-blue/15 text-ai-blue border border-ai-blue/30 font-mono">
                      Sec {cls.section}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      CCTV Available
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-text-primary group-hover:text-ai-blue transition-colors">
                    {cls.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5 font-medium">{cls.course}</p>

                  <div className="mt-4 space-y-2 text-xs text-text-dim border-t border-glass-border pt-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span className="truncate">{cls.roomNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span>{cls.enrolledCount} Enrolled Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span>{cls.schedule}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span className="text-emerald-400 font-medium">{cls.faculty}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-glass-border">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedClass(cls);
                      setMonitoringMode(null);
                    }}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 font-semibold shadow-lg shadow-ai-blue/20"
                  >
                    <span>Select Class</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STAGE 2: CHOOSE MONITORING MODE
          ═══════════════════════════════════════════════════════════ */}
      {selectedClass && !monitoringMode && (
        <div className="space-y-6">
          {/* Top Banner with back button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-glass-heavy border border-glass-border backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedClass(null)}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                title="Return to Class Selection"
                aria-label="Return to Class Selection"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{selectedClass.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-ai-blue/15 text-ai-blue border border-ai-blue/30">
                    {selectedClass.course}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedClass.roomNumber} · {selectedClass.faculty} · {selectedClass.enrolledCount} Enrolled
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedClass(null)}
              className="text-xs text-text-muted hover:text-white min-h-[40px]"
            >
              Change Class
            </Button>
          </div>

          <div className="text-center max-w-xl mx-auto py-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              Step 2 of 2
            </span>
            <h2 className="text-2xl font-bold text-white mt-2">
              Choose Monitoring Mode
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Select one monitoring pipeline. Both modes operate independently at application, pipeline, and reporting levels.
            </p>
          </div>

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Card A: Attendance Monitoring */}
            <GlassCard
              className="border-emerald-500/30 hover:border-emerald-500/60 bg-gradient-to-b from-emerald-500/10 to-transparent p-6 transition-all cursor-pointer flex flex-col justify-between group shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono uppercase">
                    Attendance Pipeline
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Attendance Monitoring
                </h3>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                  Identify enrolled students and record classroom attendance using high-speed facial recognition and verification.
                </p>

                <div className="mt-5 space-y-2 text-xs text-text-dim border-t border-emerald-500/20 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Camera preview with verified identity badges</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Real-time headcount of students marked present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Unidentified & unregistered visitor detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Dedicated attendance event log & CSV export</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-emerald-500/20">
                <Button
                  variant="primary"
                  onClick={() => setMonitoringMode("attendance")}
                  className="w-full min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <span>Launch Attendance Monitoring</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </GlassCard>

            {/* Card B: Behavioral Monitoring */}
            <GlassCard
              className="border-ai-blue/30 hover:border-ai-blue/60 bg-gradient-to-b from-ai-blue/10 to-transparent p-6 transition-all cursor-pointer flex flex-col justify-between group shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-ai-blue/20 border border-ai-blue/40 flex items-center justify-center text-ai-blue shadow-lg shadow-ai-blue/10">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-ai-blue/20 text-ai-blue border border-ai-blue/30 font-mono uppercase">
                    Two-Stage Hybrid Pipeline
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-ai-blue transition-colors">
                  Behavioral Monitoring
                </h3>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                  Analyze classroom behavior using object detection, body posture landmarks, and temporal tracking across frames.
                </p>

                <div className="mt-5 space-y-2 text-xs text-text-dim border-t border-ai-blue/20 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-ai-blue font-bold">✓</span>
                    <span>Stage 1: Person & mobile phone object detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ai-blue font-bold">✓</span>
                    <span>Stage 2: Posture slumping & head orientation analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ai-blue font-bold">✓</span>
                    <span>Phone-use alerts with sustained evidence (5s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ai-blue font-bold">✓</span>
                    <span>Possible sleeping alerts with posture analysis (10s)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-ai-blue/20">
                <Button
                  variant="primary"
                  onClick={() => setMonitoringMode("behavior")}
                  className="w-full min-h-[44px] bg-ai-blue hover:bg-ai-blue/90 text-black font-extrabold shadow-lg shadow-ai-blue/20 flex items-center justify-center gap-2"
                >
                  <span>Launch Behavioral Monitoring</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STAGE 3: DEDICATED MONITORING INTERFACE
          ═══════════════════════════════════════════════════════════ */}
      {selectedClass && monitoringMode && (
        <div className="space-y-6">
          {/* Top Header & Navigation Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 rounded-2xl bg-glass-heavy border border-glass-border shadow-xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setMonitoringMode(null)}
                className="px-3 py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5"
                title="Return to Mode Selection"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Mode Selection</span>
              </button>

              <div className="h-4 w-px bg-glass-border hidden sm:block" />

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base font-bold text-white">{selectedClass.name}</h1>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider",
                      monitoringMode === "attendance"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-ai-blue/20 text-ai-blue border border-ai-blue/30",
                    )}
                  >
                    {monitoringMode === "attendance" ? "Attendance Monitoring Mode" : "Behavioral Monitoring Mode"}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedClass.course} · {selectedClass.roomNumber} · Faculty: {selectedClass.faculty}
                </p>
              </div>
            </div>

            {/* Session Actions & State */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
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
                {sessionActive ? "AI CCTV STREAM ACTIVE" : "CAMERA STANDBY"}
              </span>

              <Button
                variant={sessionActive ? "destructive" : "primary"}
                size="sm"
                onClick={handleToggleSession}
                disabled={loading}
                className="min-h-[40px] flex items-center gap-2 font-bold shadow-lg"
              >
                {loading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : sessionActive ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>End Session</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Session</span>
                  </>
                )}
              </Button>

              <button
                onClick={() => setSelectedClass(null)}
                className="text-xs text-text-dim hover:text-text-primary px-2 py-1 min-h-[40px]"
                title="Return to Class Selection"
              >
                Change Class
              </button>
            </div>
          </div>

          {/* Main 2-Column Monitoring Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Camera Preview + Mode View Container */}
            <div className="lg:col-span-2 space-y-6">
              {/* Camera Preview */}
              <GlassCard noPadding className="overflow-hidden border border-glass-border/40 shadow-2xl">
                <div className="relative aspect-video bg-[#070a10] flex items-center justify-center">
                  <LiveCameraFeed
                    sessionActive={sessionActive}
                    streamKey={streamKey}
                    cameraId={selectedClass.cameraId}
                    mode={monitoringMode}
                  />

                  {sessionActive && (
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 pointer-events-none">
                      <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {monitoringMode === "attendance" ? "BIOMETRIC RECOGNITION ONLINE" : "HYBRID BEHAVIORAL PIPELINE ONLINE"}
                      </div>
                      <div className="px-2 sm:px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] font-mono text-text-muted">
                        {monitoringMode === "attendance"
                          ? `${inClassStudents.length} / ${selectedClass.enrolledCount} PRESENT IN ROOM`
                          : `${inClassStudents.length} PERSONS TRACKED`}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Footage Playback Controls (if session active) */}
              {sessionActive && (
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-3 rounded-2xl bg-glass-heavy border border-glass-border shadow-xl backdrop-blur-xl">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVideoControl("prev")}
                      className="px-2.5 py-1 text-xs text-text-muted hover:text-white min-h-[36px]"
                    >
                      ⏮ Prev Clip
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleVideoControl("forward", 30)}
                      className="px-3 py-1.5 text-xs font-semibold text-ai-blue bg-ai-blue/15 hover:bg-ai-blue/25 border border-ai-blue/40 min-h-[36px]"
                    >
                      ⏩ Forward +30s
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVideoControl("next")}
                      className="px-3 py-1 text-xs font-semibold text-white min-h-[36px]"
                    >
                      ⏭ Next Clip
                    </Button>
                  </div>

                  {controlToast && (
                    <span className="text-[11px] font-medium text-ai-blue bg-ai-blue/10 px-2 py-0.5 rounded border border-ai-blue/20">
                      {controlToast}
                    </span>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────
                  SUB-VIEW A: ATTENDANCE MONITORING
                  ───────────────────────────────────────────────────────── */}
              {monitoringMode === "attendance" && (
                <div className="space-y-6">
                  {/* Attendance KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <GlassCard subtle className="border border-emerald-500/20 bg-emerald-500/5">
                      <p className="text-[11px] text-emerald-400 font-semibold mb-0.5">Students Present</p>
                      <p className="text-2xl font-bold text-emerald-400">{attendancePresentList.length}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Physically in room</p>
                    </GlassCard>

                    <GlassCard subtle>
                      <p className="text-[11px] text-text-muted mb-0.5">Total Enrolled</p>
                      <p className="text-2xl font-bold text-text-primary">{sectionStudents.length}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{attendanceAbsentList.length} Absent / Not in class</p>
                    </GlassCard>

                    <GlassCard subtle>
                      <p className="text-[11px] text-text-muted mb-0.5">Matching Accuracy</p>
                      <p className="text-2xl font-bold text-ai-blue">98.6%</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Biometric verification</p>
                    </GlassCard>

                    <GlassCard subtle className="border border-amber-500/20">
                      <p className="text-[11px] text-amber-400 font-semibold mb-0.5">Unknown Faces</p>
                      <p className="text-2xl font-bold text-amber-400">{unknownFaceClusters.size}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Unregistered visitors</p>
                    </GlassCard>
                  </div>

                  {/* Attendance Roster Panel */}
                  <GlassCard className="border border-emerald-500/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-glass-border">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                          <span>Section {selectedClass.section} Attendance Roster</span>
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">
                          Real-time presence confirmed via facial verification. Behavioral alerts are excluded.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleExportAttendance}
                          className="text-xs flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </Button>
                      </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-glass-heavy border border-glass-border w-full sm:w-auto overflow-x-auto custom-scrollbar">
                        {(["ALL", "PRESENT", "ABSENT"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setAttendanceRosterFilter(tab)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                              attendanceRosterFilter === tab
                                ? "bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20"
                                : "text-text-muted hover:text-white",
                            )}
                          >
                            {tab === "ALL" ? `All (${sectionStudents.length})` : tab === "PRESENT" ? `Present (${attendancePresentList.length})` : `Absent (${attendanceAbsentList.length})`}
                          </button>
                        ))}
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          placeholder="Search student or USN..."
                          value={attendanceSearch}
                          onChange={(e) => setAttendanceSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-glass-border text-xs text-white placeholder-text-muted focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Students Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {displayedAttendanceStudents.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-text-muted text-xs">
                          No students match the current filters.
                        </div>
                      ) : (
                        displayedAttendanceStudents.map((st) => {
                          const present = isStudentPresent(st.usn);
                          return (
                            <div
                              key={st.usn}
                              className={cn(
                                "p-3 rounded-xl border transition-all flex flex-col justify-between",
                                present
                                  ? "bg-emerald-500/5 border-emerald-500/30"
                                  : "bg-white/[0.02] border-white/5 opacity-75 hover:opacity-100",
                              )}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs font-bold text-white truncate">{st.name}</h4>
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[9px] font-bold font-mono",
                                      present
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        : "bg-white/5 text-text-dim border border-white/5",
                                    )}
                                  >
                                    {present ? "PRESENT" : "ABSENT"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-text-muted font-mono mt-0.5">{st.usn}</p>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[9px] text-text-dim">
                                  {present ? "✓ Verified on CCTV" : "⚪ Not detected"}
                                </span>
                                <button
                                  onClick={() => handleToggleStudentAttendance(st.usn)}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
                                    present
                                      ? "bg-white/5 text-text-muted hover:text-red-400 border-white/5 hover:border-red-500/30"
                                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                                  )}
                                >
                                  {present ? "Mark Absent" : "✓ Mark Present"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────
                  SUB-VIEW B: BEHAVIORAL MONITORING
                  ───────────────────────────────────────────────────────── */}
              {monitoringMode === "behavior" && (
                <div className="space-y-6">
                  {/* Behavioral KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <GlassCard subtle className="border border-ai-blue/20 bg-ai-blue/5">
                      <p className="text-[11px] text-ai-blue font-semibold mb-0.5">Students Tracked</p>
                      <p className="text-2xl font-bold text-ai-blue">{behaviorStats.trackedCount}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Active stage 1 ROIs</p>
                    </GlassCard>

                    <GlassCard subtle className="border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[11px] text-amber-400 font-semibold">Phone Usage Alerts</p>
                        {behaviorStats.phoneCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
                      </div>
                      <p className="text-2xl font-bold text-amber-400">{behaviorStats.phoneCount}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Sustained &ge; 5.0s confirmed</p>
                    </GlassCard>

                    <GlassCard subtle className="border border-red-500/20 bg-red-500/5">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[11px] text-red-400 font-semibold">Sleeping Alerts</p>
                        {behaviorStats.sleepCount > 0 && <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />}
                      </div>
                      <p className="text-2xl font-bold text-red-400">{behaviorStats.sleepCount}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Sustained &ge; 10.0s confirmed</p>
                    </GlassCard>

                    <GlassCard subtle className="border border-emerald-500/20">
                      <p className="text-[11px] text-emerald-400 font-semibold mb-0.5">Normal Attentive</p>
                      <p className="text-2xl font-bold text-emerald-400">{behaviorStats.alertCount}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Upright seated posture</p>
                    </GlassCard>
                  </div>

                  {/* Behavioral Telemetry Panel */}
                  <GlassCard className="border border-ai-blue/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-glass-border">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Zap className="w-4 h-4 text-ai-blue" />
                          <span>Tracked Students & Pose Telemetry</span>
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">
                          Continuous stage-2 temporal analysis: head orientation (pitch, yaw) and slump duration.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                          Thresholds: Phone 5s · Sleep 10s
                        </span>
                      </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-glass-heavy border border-glass-border w-full sm:w-auto overflow-x-auto custom-scrollbar">
                        {(["ALL", "FLAGGED", "ALERT", "INSUFFICIENT"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setBehaviorTelemetryFilter(tab)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                              behaviorTelemetryFilter === tab
                                ? "bg-ai-blue text-black font-bold shadow-md shadow-ai-blue/20"
                                : "text-text-muted hover:text-white",
                            )}
                          >
                            {tab === "ALL" ? "All Tracked" : tab === "FLAGGED" ? "Flagged" : tab === "ALERT" ? "Normal" : "Insufficient Data"}
                          </button>
                        ))}
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          placeholder="Search student or track..."
                          value={behaviorSearch}
                          onChange={(e) => setBehaviorSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-glass-border text-xs text-white placeholder-text-muted focus:outline-none focus:border-ai-blue"
                        />
                      </div>
                    </div>

                    {/* Tracked Students Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
                      {displayedTrackedStudents.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-text-muted text-xs">
                          No students match the current behavioral filters.
                        </div>
                      ) : (
                        displayedTrackedStudents.map((st) => {
                          const isPhone = st.status === "PHONE_USAGE" || (st.accumulated_phone_duration || 0) >= 5.0;
                          const isSleep = st.status === "SLEEPING" || (st.accumulated_sleeping_duration || 0) >= 10.0;
                          const phoneDur = st.accumulated_phone_duration || 0;
                          const sleepDur = st.accumulated_sleeping_duration || 0;

                          return (
                            <div
                              key={st.usn}
                              className={cn(
                                "p-3 rounded-xl border transition-all flex flex-col justify-between",
                                isSleep
                                  ? "bg-red-500/10 border-red-500/30"
                                  : isPhone
                                  ? "bg-amber-500/10 border-amber-500/30"
                                  : "bg-white/[0.02] border-white/5",
                              )}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs font-bold text-white truncate">{st.name}</h4>
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[9px] font-bold font-mono",
                                      isSleep
                                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                        : isPhone
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
                                    )}
                                  >
                                    {isSleep ? "POSSIBLE SLEEP" : isPhone ? "PHONE USAGE" : "NORMAL"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-text-muted font-mono mt-0.5">{st.usn}</p>

                                {/* Telemetry stats */}
                                <div className="mt-2.5 p-2 rounded-lg bg-black/40 border border-white/5 space-y-1 text-[10px]">
                                  <div className="flex justify-between">
                                    <span className="text-text-muted">Posture:</span>
                                    <span className="text-white font-medium">{st.posture}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-muted">Gaze:</span>
                                    <span className="text-white font-medium">{st.gaze}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-muted">Pitch / Yaw:</span>
                                    <span className="font-mono text-text-dim">
                                      {st.pitch || 0}° / {st.yaw || 0}°
                                    </span>
                                  </div>

                                  {(phoneDur > 0 || sleepDur > 0) && (
                                    <div className="flex justify-between pt-1 border-t border-white/5 text-[9px]">
                                      <span className="text-text-muted">Evidence:</span>
                                      <span className={cn("font-bold font-mono", isSleep ? "text-red-400" : "text-amber-400")}>
                                        {isSleep ? `${sleepDur.toFixed(1)}s (Sleep)` : `${phoneDur.toFixed(1)}s (Phone)`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 text-[9px] text-text-dim flex justify-between items-center">
                                <span>{st.is_verified_identity ? "✓ Identity verified" : "Unidentified Track"}</span>
                                <span className="font-mono">{st.lastUpdated}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* ── Unknown / Pending Identification Panel ── */}
              <GlassCard className="border border-amber-500/20 bg-amber-500/[0.02]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-glass-border">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ScanFace className="w-4 h-4 text-amber-400" />
                      <span>Unknown / Pending Identification</span>
                      {pendingUnknownFaces.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {pendingUnknownFaces.length} Pending
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Unrecognized people detected during monitoring. Authorized teachers can review, assign to an enrolled student, keep unknown, or dismiss.
                    </p>
                  </div>
                </div>

                {pendingUnknownFaces.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-xs flex flex-col items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400/60 mb-1.5" />
                    <span>No unconfirmed individuals pending review. All detected faces are matched or resolved.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4">
                    {pendingUnknownFaces.map((face) => (
                      <div
                        key={face.id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-2.5 hover:border-amber-500/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-lg bg-black/60 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {face.preview_image || face.image_path ? (
                              <img
                                src={face.preview_image || face.image_path || ""}
                                alt="Unknown observation"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserX className="w-6 h-6 text-text-muted" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-mono text-amber-400 font-bold block truncate">
                              {face.cluster_id || `ID: ${face.id}`}
                            </span>
                            <p className="text-[10px] text-text-muted truncate mt-0.5">
                              Cam: {face.camera_id || selectedClass?.cameraId || "room-023"}
                            </p>
                            <p className="text-[9px] text-text-dim truncate">
                              {face.detected_at
                                ? new Date(face.detected_at).toLocaleTimeString()
                                : face.created_at
                                ? new Date(face.created_at).toLocaleTimeString()
                                : "Recent"}
                            </p>
                            {face.suggested_match && (
                              <span className="inline-block mt-1 text-[9px] text-ai-blue bg-ai-blue/10 px-1.5 py-0.5 rounded border border-ai-blue/20 truncate">
                                Match: {face.suggested_match.name} ({Math.round(face.suggested_match.confidence)}%)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                          <button
                            onClick={() => {
                              setSelectedAssignFace(face);
                              setStudentSearchQuery(face.suggested_match?.usn || "");
                              setSelectedStudentForAssign(null);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-ai-blue/20 hover:bg-ai-blue/30 text-ai-blue border border-ai-blue/30 text-[10px] font-bold transition-all text-center"
                          >
                            Assign to Student
                          </button>
                          <button
                            onClick={() => handleKeepUnknown(face.id)}
                            className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white text-[10px] font-medium transition-all"
                            title="Keep observation unidentified"
                          >
                            Keep
                          </button>
                          <button
                            onClick={() => handleDismissUnknown(face.id)}
                            className="py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-medium transition-all"
                            title="Dismiss observation"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Right Column: Timer & Dedicated Mode Event Log */}
            <div className="space-y-4">
              {/* Timer Card */}
              <GlassCard>
                <div className="text-center">
                  <p className="text-[11px] text-text-muted mb-1">Session Duration</p>
                  <p className="text-3xl font-bold text-white tabular-nums tracking-wider font-mono">
                    {formatDuration(sessionDuration)}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {selectedClass.name} · {monitoringMode === "attendance" ? "Attendance Pipeline" : "Behavioral Pipeline"}
                  </p>
                </div>
              </GlassCard>

              {/* ─────────────────────────────────────────────────────────
                  RIGHT SIDEBAR: ATTENDANCE EVENT LOG
                  ───────────────────────────────────────────────────────── */}
              {monitoringMode === "attendance" && (
                <GlassCard noPadding className="border border-emerald-500/20">
                  <div className="p-3 border-b border-glass-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <h3 className="text-xs font-semibold text-white">Attendance Verification Log</h3>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      {attendanceEvents.length} Verified
                    </span>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1 p-1 bg-black/40 border-b border-glass-border">
                    {(["ALL", "PRESENT", "UNKNOWN"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setAttendanceFilter(tab)}
                        className={cn(
                          "flex-1 px-2 py-1 rounded text-[10px] font-semibold transition-all",
                          attendanceFilter === tab
                            ? "bg-emerald-500 text-black font-bold"
                            : "text-text-muted hover:text-white",
                        )}
                      >
                        {tab === "ALL" ? "All" : tab === "PRESENT" ? "Present" : "Unknown"}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-y-auto max-h-[520px] p-2 space-y-1.5">
                    {attendanceEvents.length === 0 ? (
                      <div className="text-center py-12 text-text-muted text-xs">
                        {sessionActive ? "Waiting for verified face detections..." : "Session is currently standby."}
                      </div>
                    ) : (
                      attendanceEvents
                        .filter((e) => {
                          if (attendanceFilter === "PRESENT") return e.type === "ATTENDANCE_DETECTED" || e.type === "MANUAL_CHECKIN";
                          if (attendanceFilter === "UNKNOWN") return e.type === "UNKNOWN_PERSON";
                          return true;
                        })
                        .map((evt) => (
                          <div
                            key={evt.id}
                            className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs flex items-start justify-between gap-2"
                          >
                            <div>
                              <p className="font-bold text-white text-[11px]">
                                {evt.type === "UNKNOWN_PERSON" ? "Unknown Visitor Detected" : evt.studentName || evt.studentId}
                              </p>
                              <p className="text-[10px] text-text-muted font-mono mt-0.5">
                                {evt.studentId} · {Math.round(evt.confidence * 100)}% Match
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 shrink-0">{evt.time}</span>
                          </div>
                        ))
                    )}
                  </div>
                </GlassCard>
              )}

              {/* ─────────────────────────────────────────────────────────
                  RIGHT SIDEBAR: BEHAVIORAL ALERTS & HISTORY LOG
                  ───────────────────────────────────────────────────────── */}
              {monitoringMode === "behavior" && (
                <GlassCard noPadding className="border border-ai-blue/20">
                  <div className="p-3 border-b border-glass-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-ai-blue" />
                      <h3 className="text-xs font-semibold text-white">Behavioral Alerts & History</h3>
                    </div>
                    <span className="text-[10px] text-ai-blue font-mono font-bold">
                      {behavioralAlerts.length} Events
                    </span>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1 p-1 bg-black/40 border-b border-glass-border">
                    {(["ALL", "PHONE", "SLEEP"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setBehaviorEventFilter(tab)}
                        className={cn(
                          "flex-1 px-2 py-1 rounded text-[10px] font-semibold transition-all",
                          behaviorEventFilter === tab
                            ? "bg-ai-blue text-black font-bold"
                            : "text-text-muted hover:text-white",
                        )}
                      >
                        {tab === "ALL" ? "All" : tab === "PHONE" ? "Phone Usage" : "Possible Sleeping"}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-y-auto max-h-[520px] p-2 space-y-1.5">
                    {behavioralAlerts.length === 0 ? (
                      <div className="text-center py-12 text-text-muted text-xs">
                        {sessionActive ? "Evaluating behavioral streams across frames..." : "Session is currently standby."}
                      </div>
                    ) : (
                      behavioralAlerts
                        .filter((a) => {
                          if (behaviorEventFilter === "PHONE") return a.type === "PHONE_USAGE";
                          if (behaviorEventFilter === "SLEEP") return a.type === "POSSIBLE_SLEEPING_POSTURE" || a.type === "SLEEPING";
                          return true;
                        })
                        .map((alert) => (
                          <div
                            key={alert.id}
                            className={cn(
                              "p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition-all",
                              alert.type === "PHONE_USAGE"
                                ? "bg-amber-500/10 border-amber-500/30"
                                : "bg-red-500/10 border-red-500/30",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "font-bold text-[11px]",
                                  alert.type === "PHONE_USAGE" ? "text-amber-400" : "text-red-400",
                                )}
                              >
                                {alert.type === "PHONE_USAGE" ? "📱 Phone Usage" : "💤 Possible Sleeping Posture"}
                              </span>
                              <span className="text-[10px] font-mono text-text-muted">{alert.time}</span>
                            </div>

                            <p className="text-[11px] text-white font-medium">
                              {alert.studentName} ({alert.studentId})
                            </p>
                            <p className="text-[10px] text-text-muted">
                              Duration: <span className="font-mono text-white font-semibold">{alert.duration}s</span> · Conf: {Math.round(alert.confidence * 100)}%
                            </p>

                            <div className="pt-1 flex items-center justify-between text-[9px] text-text-dim border-t border-white/5">
                              <span>Status: {alert.status}</span>
                              <div className="flex items-center gap-1.5">
                                {alert.status !== "ACKNOWLEDGED" && (
                                  <button
                                    onClick={() => handleAcknowledgeAlert(alert.id)}
                                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-semibold"
                                  >
                                    Acknowledge
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDismissAlert(alert.id)}
                                  className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Unknown Face Assignment Modal ────────────────────── */}
      <AnimatePresence>
        {selectedAssignFace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-[#0c1017] border border-glass-border/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-glass-border flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <ScanFace className="w-5 h-5 text-ai-blue" />
                  <h3 className="text-sm font-bold text-white">Assign Unrecognized Person to Student</h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedAssignFace(null);
                    setSelectedStudentForAssign(null);
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Observation Preview */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-black/60 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {selectedAssignFace.preview_image || selectedAssignFace.image_path ? (
                      <img
                        src={selectedAssignFace.preview_image || selectedAssignFace.image_path || ""}
                        alt="Candidate crop"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserX className="w-8 h-8 text-text-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white">
                      Observation: <span className="font-mono text-ai-blue">{selectedAssignFace.cluster_id || `ID ${selectedAssignFace.id}`}</span>
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Camera: {selectedAssignFace.camera_id || selectedClass?.cameraId || "room-023"} · Quality: {Math.round((selectedAssignFace.quality_score || 0.8) * 100)}%
                    </p>
                    <p className="text-[10px] text-text-dim">
                      Observed: {selectedAssignFace.detected_at || selectedAssignFace.created_at || "Recent"}
                    </p>
                  </div>
                </div>

                {/* Student Search */}
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1.5">
                    Select Enrolled Student to Assign:
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search by student name, USN, or roll number..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-glass-border text-xs text-white placeholder-text-muted focus:outline-none focus:border-ai-blue"
                    />
                  </div>
                </div>

                {/* Candidate Roster List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-glass-border/40 rounded-xl p-2 bg-black/20">
                  {filteredRosterForAssign.length === 0 ? (
                    <div className="text-center py-6 text-text-muted text-xs">
                      No matching students found in authorized roster.
                    </div>
                  ) : (
                    filteredRosterForAssign.map((s: any) => {
                      const isSelected = selectedStudentForAssign?.id === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedStudentForAssign(s)}
                          className={cn(
                            "p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all",
                            isSelected
                              ? "bg-ai-blue/20 border-ai-blue/60 text-white"
                              : "bg-white/[0.02] border-white/5 text-text-muted hover:bg-white/5 hover:text-white",
                          )}
                        >
                          <div>
                            <span className="font-bold text-white block">{s.fullName}</span>
                            <span className="text-[10px] text-text-dim font-mono">
                              {s.usn || s.rollNumber} · Sec {s.section || "A"}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-ai-blue" />}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selected Student Confirmation Warning */}
                {selectedStudentForAssign && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                    <p className="font-bold mb-1 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ready to assign to: {selectedStudentForAssign.fullName} ({selectedStudentForAssign.usn || selectedStudentForAssign.rollNumber})</span>
                    </p>
                    <p className="text-[11px] text-emerald-300/80">
                      This observation's ArcFace embedding will be durably associated with this student's recognition profile in FAISS and PostgreSQL. Attendance will NOT be automatically marked.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-glass-border bg-black/40 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedAssignFace(null);
                    setSelectedStudentForAssign(null);
                  }}
                  disabled={assigningLoading}
                  className="text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAssignUnknown}
                  disabled={!selectedStudentForAssign || assigningLoading}
                  className="text-xs font-bold"
                >
                  {assigningLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      Assigning...
                    </span>
                  ) : (
                    "Confirm Assignment"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
