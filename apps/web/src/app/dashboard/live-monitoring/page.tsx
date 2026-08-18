"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getLiveMonitoringData, generateLiveEvent, type LiveMonitoringData, type LiveAttendanceEvent } from "@/lib/mock/attendance";
import { isDemoMode } from "@/lib/demo-mode";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

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

export default function LiveMonitoringPage() {
  const [data, setData] = useState<LiveMonitoringData>({
    session: {
      sessionId: "SESS_LIVE_CCTV",
      classroomId: "room-023",
      classroomName: "Classroom 023 (CCTV)",
      subjectName: "CSE-2027 Live Classroom Monitoring",
      teacherName: "Prof. Faculty",
      status: "INACTIVE" as any,
      totalPresent: 0,
      totalStudents: 162,
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
  
  const user = useAuthStore((s) => s.user);

  // Timer for active session
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

  // Initialize query parameters and check active session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const querySessionId = params.get("sessionId");
    if (querySessionId) {
      setActiveSessionId(querySessionId);
      setSessionActive(true);
    }
  }, []);

  // WebSocket streams
  useEffect(() => {
    if (!sessionActive) return;

    if (isDemoMode()) {
      const interval = setInterval(() => {
        const newEvent = generateLiveEvent();
        setEvents((prev) => [newEvent, ...prev].slice(0, 50));

        if (newEvent.type === "ATTENDANCE_DETECTED") {
          setData((prev) => ({
            ...prev,
            session: { ...prev.session, totalPresent: prev.session.totalPresent + 1 },
          }));
        }
      }, 3000 + Math.random() * 4000);

      return () => clearInterval(interval);
    } else {
      const wsUrl = process.env.NEXT_PUBLIC_AI_WS_URL || "ws://localhost:8000/api/v1/ws";
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

            if (eventType === "ATTENDANCE_MARKED" || eventType === "STUDENT_RECOGNIZED") {
              const sUsn = eventData.usn || eventData.studentId;
              const sName = eventData.name || eventData.studentName || sUsn;
              const sConf = eventData.confidence || 0.95;
              const sTime = eventData.time || new Date().toLocaleTimeString();

              if (sUsn) {
                const newEvent: LiveAttendanceEvent = {
                  type: "ATTENDANCE_DETECTED",
                  studentId: sUsn,
                  studentName: sName,
                  confidence: sConf,
                  time: sTime,
                };

                setEvents((prev) => [newEvent, ...prev.filter((e) => e.studentId !== sUsn)].slice(0, 50));

                setData((prev) => {
                  const alreadyPresent = prev.presentStudents.some((s) => s.id === sUsn);
                  const updatedPresent = alreadyPresent
                    ? prev.presentStudents
                    : [{ id: sUsn, name: sName, confidence: sConf }, ...prev.presentStudents];

                  return {
                    ...prev,
                    session: {
                      ...prev.session,
                      totalPresent: updatedPresent.length,
                    },
                    presentStudents: updatedPresent,
                  };
                });
              }
            } else if (eventType === "UNKNOWN_FACE") {
              const newEvent: LiveAttendanceEvent = {
                type: "UNKNOWN_PERSON",
                confidence: eventData.possible_match?.confidence || 0.0,
                time: new Date(eventData.timestamp || Date.now()).toLocaleTimeString(),
              };
              setEvents((prev) => [newEvent, ...prev].slice(0, 50));

              setData((prev) => ({
                ...prev,
                session: {
                  ...prev.session,
                  unknownFaces: (prev.session.unknownFaces || 0) + 1,
                },
              }));
            }
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
          }
        };
      } catch (wsErr) {
        console.error("WebSocket setup error:", wsErr);
      }

      return () => {
        if (socket) {
          socket.close();
        }
      };
    }
  }, [sessionActive]);

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
          camera_id: "room-023",
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

  const handleToggleSession = async () => {
    const aiUrl = process.env.NEXT_PUBLIC_AI_HTTP_URL || "http://localhost:8000";

    if (sessionActive) {
      // 1. Instantly reset frontend state so UI and video stop without lag
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

      // 2. Inform AI Service and NestJS backend asynchronously
      fetch(`${aiUrl}/api/v1/attendance/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_id: "room-023" }),
      }).catch((e) => console.warn("AI stop note:", e));

      if (prevSid) {
        api.post(`/attendance/sessions/${prevSid}/end`).catch((e) => console.warn("NestJS end session note:", e));
      }
    } else {
      try {
        setLoading(true);
        const newSessId = `SESS_${Date.now().toString(36).toUpperCase()}`;

        // 1. Start AI service attendance pipeline
        try {
          await fetch(`${aiUrl}/api/v1/attendance/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              camera_id: "room-023",
              class_id: newSessId,
              source_path: "footage",
            }),
          });
        } catch (aiErr) {
          console.error("AI service start request error:", aiErr);
        }

        // 2. Register session in NestJS backend
        try {
          const res = await api.post<any>("/attendance/sessions/start", {
            institutionId: user?.institutionId || "cmqnr5ypa0005p16e5ri9s2hh",
            classroomId: "room-023",
            teacherId: user?.id || "teacher-1",
            subjectName: "CSE-2027 Live Classroom Monitoring",
            totalStudents: 162,
          });
          if (res && (res.data?.sessionId || res.sessionId)) {
            const sid = res.data?.sessionId || res.sessionId;
            setActiveSessionId(sid);
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
          session: {
            ...prev.session,
            sessionId: newSessId,
            status: "ACTIVE" as any,
            totalStudents: 162,
            startedAt: new Date().toISOString(),
          },
        }));

        window.history.pushState({}, "", `${window.location.pathname}?sessionId=${newSessId}`);
      } catch (err) {
        console.error("Error starting session:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredEvents = eventFilter === "all"
    ? events
    : events.filter((e) => {
        if (eventFilter === "detected") return e.type === "ATTENDANCE_DETECTED";
        if (eventFilter === "unknown") return e.type === "UNKNOWN_PERSON";
        if (eventFilter === "system") return e.type === "STUDENT_ENTERED" || e.type === "STUDENT_LEFT";
        return true;
      });

  const eventColor = (type: string) => {
    switch (type) {
      case "ATTENDANCE_DETECTED":
        return { bg: "bg-success/10", border: "border-success/20", dot: "bg-success" };
      case "UNKNOWN_PERSON":
        return { bg: "bg-warning/10", border: "border-warning/20", dot: "bg-warning" };
      case "STUDENT_ENTERED":
      case "STUDENT_LEFT":
        return { bg: "bg-ai-blue/10", border: "border-ai-blue/20", dot: "bg-ai-blue" };
      default:
        return { bg: "bg-glass-subtle", border: "border-glass-border", dot: "bg-text-dim" };
    }
  };

  const eventLabel = (type: string) => {
    switch (type) {
      case "ATTENDANCE_DETECTED":
        return "Attendance Marked";
      case "UNKNOWN_PERSON":
        return "Unknown Face Alert";
      case "STUDENT_ENTERED":
        return "Entered Classroom";
      case "STUDENT_LEFT":
        return "Left Classroom";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text-primary">Live Classroom Monitoring</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-glass-heavy border border-glass-border text-xs">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  sessionActive
                    ? "bg-success animate-glow-pulse"
                    : "bg-text-dim",
                )}
              />
              <span className="text-text-muted font-medium">
                {sessionActive ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-1">
            {data.session.classroomName} • {data.session.subjectName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl glass text-xs text-text-muted">
            <span className="font-mono">{sessionActive ? "25" : "0"}</span> FPS
          </div>
          <Button
            variant={sessionActive ? "danger" : "primary"}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Camera Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Camera Feed */}
          <GlassCard noPadding className="overflow-hidden border border-glass-border/40 shadow-2xl">
            <div className="relative aspect-video bg-[#0b0f17] flex items-center justify-center">
              {/* Ultra smooth Live Feed */}
              <LiveCameraFeed
                sessionActive={sessionActive}
                streamKey={streamKey}
                cameraId={data.session.classroomId || "room-023"}
              />

              {/* AI Overlay Indicators */}
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
                    {data.presentStudents.length} / {data.session.totalStudents} PRESENT
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Video Playback & Footage Forwarding Controls */}
          {sessionActive && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-glass-heavy border border-glass-border shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVideoControl("prev")}
                  className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-white/5"
                  title="Previous Video Clip"
                >
                  ⏮ Prev Clip
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleVideoControl("forward", 30)}
                  className="px-3 py-1.5 text-xs font-semibold text-ai-blue bg-ai-blue/15 hover:bg-ai-blue/25 border border-ai-blue/40 shadow-sm"
                  title="Forward 30 Seconds"
                >
                  ⏩ Forward +30s
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleVideoControl("forward", 60)}
                  className="px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-white/10"
                  title="Forward 60 Seconds"
                >
                  +60s
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVideoControl("next")}
                  className="px-3 py-1 text-xs font-semibold text-text-primary hover:bg-white/10"
                  title="Skip to Next Video in Footage Folder"
                >
                  ⏭ Next Clip
                </Button>
              </div>

              {/* Playback Speed Multipliers & Feedback Toast */}
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

          {/* Session Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard subtle>
              <p className="text-[11px] text-text-muted mb-0.5">Students Present</p>
              <p className="text-2xl font-bold text-success">{data.presentStudents.length}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[11px] text-text-muted mb-0.5">Total Enrolled</p>
              <p className="text-2xl font-bold text-text-primary">{data.session.totalStudents}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[11px] text-text-muted mb-0.5">Recognition Accuracy</p>
              <p className="text-2xl font-bold text-ai-blue">{data.session.recognitionAccuracy}%</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[11px] text-text-muted mb-0.5">Unknown Faces</p>
              <p className="text-2xl font-bold text-warning">{data.session.unknownFaces}</p>
            </GlassCard>
          </div>

          {/* Present Students */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">
                Present Students ({data.presentStudents.length})
              </h3>
              <span className="text-xs text-text-muted">
                {data.session.totalStudents > 0 ? ((data.presentStudents.length / data.session.totalStudents) * 100).toFixed(1) : 0}% Attendance
              </span>
            </div>
            {data.presentStudents.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs">
                {sessionActive ? "Scanning classroom video stream for enrolled students..." : "No active session."}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {data.presentStudents.map((student, i) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-glass-subtle border border-glass-border group hover:border-success/40 transition-all"
                  >
                    <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-text-primary truncate">{student.name}</p>
                      <p className="text-[9px] text-text-muted font-mono">{student.id}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right: Events Panel */}
        <div className="space-y-4">
          {/* Timer */}
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
              { id: "all", label: "All" },
              { id: "detected", label: "Attendance" },
              { id: "unknown", label: "Unknown" },
              { id: "system", label: "System" },
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

          {/* Live Events */}
          <GlassCard noPadding>
            <div className="p-3 border-b border-glass-border flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-primary">Live Activity Log</h3>
              <span className="text-[10px] text-text-muted">{filteredEvents.length} events</span>
            </div>
            <div className="overflow-y-auto max-h-[480px] p-2 space-y-1.5">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-xs">
                  {sessionActive ? "Waiting for face recognition events..." : "Session is currently inactive."}
                </div>
              ) : (
                <AnimatePresence>
                  {filteredEvents.slice(0, 30).map((event, i) => {
                    const colors = eventColor(event.type);
                    return (
                      <motion.div
                        key={`${event.time}-${event.studentId}-${i}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={cn(
                          "flex items-start gap-2.5 p-2 rounded-lg border transition-all",
                          colors.bg, colors.border,
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full mt-1 shrink-0", colors.dot)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-[11px] font-semibold", event.type === "UNKNOWN_PERSON" ? "text-warning" : "text-text-primary")}>
                              {eventLabel(event.type)}
                            </span>
                            <span className="text-[10px] text-text-muted shrink-0">{event.time}</span>
                          </div>
                          {event.studentName && (
                            <p className="text-[11px] text-text-secondary mt-0.5 font-medium">{event.studentName} • <span className="font-mono text-[10px] text-text-muted">{event.studentId}</span></p>
                          )}
                          {event.confidence && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={cn(
                                "text-[10px] font-semibold",
                                event.confidence >= 0.90 ? "text-success" : event.confidence >= 0.70 ? "text-warning" : "text-error",
                              )}>
                                Match: {(event.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
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
