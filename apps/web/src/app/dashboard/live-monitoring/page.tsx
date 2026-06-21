"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getLiveMonitoringData, generateLiveEvent, type LiveMonitoringData, type LiveAttendanceEvent } from "@/lib/mock/attendance";
import { isDemoMode } from "@/lib/demo-mode";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

export default function LiveMonitoringPage() {
  const [data, setData] = useState<LiveMonitoringData | null>(null);
  const [events, setEvents] = useState<LiveAttendanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const user = useAuthStore((s) => s.user);

  // Initialize query parameters and check active session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const querySessionId = params.get("sessionId");
    if (querySessionId) {
      setActiveSessionId(querySessionId);
      setSessionActive(true);
    }
  }, []);

  // Sync session active/inactive data
  useEffect(() => {
    if (isDemoMode()) {
      getLiveMonitoringData().then((d) => {
        setData(d);
        setEvents(d.events);
        setLoading(false);
      });
      return;
    }

    const fetchLiveData = async () => {
      if (!activeSessionId) {
        try {
          const res = await api.get<any>("/attendance/records?limit=1");
          if (res.success && res.data?.data?.length > 0) {
            const latestSession = res.data.data[0].session;
            if (latestSession && latestSession.status === "ACTIVE") {
              setActiveSessionId(latestSession.sessionId);
              setSessionActive(true);
            }
          }
        } catch (err) {
          console.error("Error looking up active session:", err);
        }
        setLoading(false);
        return;
      }

      try {
        const res = await api.get<any>(`/attendance/live?sessionId=${activeSessionId}`);
        if (res.success && res.data) {
          const s = res.data;
          setData({
            session: {
              sessionId: s.sessionId,
              classroomId: s.classroomId,
              classroomName: s.classroomName,
              subjectName: s.subjectName,
              teacherName: s.teacherName,
              status: s.status as any,
              totalPresent: s.totalPresent,
              totalStudents: s.totalStudents,
              startedAt: s.startedAt,
              recognitionAccuracy: 99.1,
              unknownFaces: data?.session?.unknownFaces || 0,
            },
            events: s.recentEvents.map((e: any) => ({
              type: e.type,
              studentId: e.studentId,
              studentName: e.studentName,
              confidence: e.confidence,
              time: e.time,
            })),
            presentStudents: s.presentStudents,
            cameraStatus: s.status === "ACTIVE" ? "ONLINE" : "OFFLINE",
            fps: s.status === "ACTIVE" ? 28 : 0,
          });
          setEvents(s.recentEvents.map((e: any) => ({
            type: e.type,
            studentId: e.studentId,
            studentName: e.studentName,
            confidence: e.confidence,
            time: e.time,
          })));
        }
      } catch (err) {
        console.error("Error fetching live status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveData();

    let interval: ReturnType<typeof setInterval>;
    if (sessionActive && activeSessionId) {
      interval = setInterval(fetchLiveData, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionActive, activeSessionId]);

  // Simulate real-time events (Demo Mode) or handle WebSocket streams (Live Mode)
  useEffect(() => {
    if (!sessionActive || !data) return;

    if (isDemoMode()) {
      const interval = setInterval(() => {
        const newEvent = generateLiveEvent();
        setEvents((prev) => [newEvent, ...prev].slice(0, 50));

        if (newEvent.type === "ATTENDANCE_DETECTED") {
          setData((prev) => prev ? {
            ...prev,
            session: { ...prev.session, totalPresent: prev.session.totalPresent + 1 },
          } : prev);
        }
      }, 3000 + Math.random() * 4000);

      return () => clearInterval(interval);
    } else {
      const wsUrl = process.env.NEXT_PUBLIC_AI_WS_URL || "ws://localhost:8000/api/v1/ws";
      const socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.event;
          const eventData = payload.data;

          if (eventType === "ATTENDANCE_MARKED") {
            if (eventData.class_id === activeSessionId) {
              const newEvent: LiveAttendanceEvent = {
                type: "ATTENDANCE_DETECTED",
                studentId: eventData.usn,
                studentName: eventData.name,
                confidence: eventData.confidence,
                time: eventData.time,
              };

              setEvents((prev) => [newEvent, ...prev].slice(0, 50));

              setData((prev) => {
                if (!prev) return prev;
                const alreadyPresent = prev.presentStudents.some((s) => s.id === eventData.usn);
                const updatedPresent = alreadyPresent
                  ? prev.presentStudents
                  : [{ id: eventData.usn, name: eventData.name, confidence: eventData.confidence }, ...prev.presentStudents];
                
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
              time: new Date(eventData.timestamp).toLocaleTimeString(),
            };
            setEvents((prev) => [newEvent, ...prev].slice(0, 50));

            setData((prev) => prev ? {
              ...prev,
              session: {
                ...prev.session,
                unknownFaces: (prev.session.unknownFaces || 0) + 1,
              }
            } : prev);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      return () => {
        socket.close();
      };
    }
  }, [sessionActive, data, activeSessionId]);

  const handleToggleSession = async () => {
    if (isDemoMode()) {
      setSessionActive(!sessionActive);
      return;
    }

    if (sessionActive && activeSessionId) {
      try {
        setLoading(true);
        const res = await api.post<any>(`/attendance/sessions/${activeSessionId}/end`);
        if (res.success) {
          setSessionActive(false);
          setActiveSessionId(null);
          window.history.pushState({}, "", window.location.pathname);
        }
      } catch (err) {
        console.error("Error ending session:", err);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        const res = await api.post<any>("/attendance/sessions/start", {
          institutionId: user?.institutionId || "inst-1",
          classroomId: "room-023",
          teacherId: user?.id || "teacher-1",
          subjectName: "Data Structures & Algorithms",
          totalStudents: 50,
        });
        if (res.success && res.data) {
          setActiveSessionId(res.data.sessionId);
          setSessionActive(true);
          window.history.pushState({}, "", `${window.location.pathname}?sessionId=${res.data.sessionId}`);
        }
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
      case "ATTENDANCE_DETECTED": return { dot: "bg-success", bg: "bg-success/10", border: "border-success/20" };
      case "STUDENT_ENTERED": return { dot: "bg-ai-blue", bg: "bg-ai-blue/10", border: "border-ai-blue/20" };
      case "STUDENT_LEFT": return { dot: "bg-text-muted", bg: "bg-glass-light", border: "border-glass-border" };
      case "UNKNOWN_PERSON": return { dot: "bg-warning", bg: "bg-warning/10", border: "border-warning/20" };
      default: return { dot: "bg-text-muted", bg: "bg-glass-light", border: "border-glass-border" };
    }
  };

  const eventLabel = (type: string) => {
    switch (type) {
      case "ATTENDANCE_DETECTED": return "✓ Attendance Marked";
      case "STUDENT_ENTERED": return "→ Student Entered";
      case "STUDENT_LEFT": return "← Student Left";
      case "UNKNOWN_PERSON": return "⚠ Unknown Person";
      default: return type;
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-muted">Initializing live monitoring...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{data?.session.classroomName}</h2>
            <p className="text-xs text-text-muted">{data?.session.subjectName} • {data?.session.teacherName}</p>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium",
            sessionActive ? "bg-success/10 text-success border border-success/20" : "bg-glass-light text-text-muted border border-glass-border",
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", sessionActive ? "bg-success animate-glow-pulse" : "bg-text-muted")} />
            {sessionActive ? "LIVE" : "OFFLINE"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg glass">
            <span className="text-[10px] text-text-muted">FPS</span>
            <span className="text-xs font-medium text-text-primary tabular-nums">{data?.fps}</span>
          </div>
          <Button
            size="sm"
            variant={sessionActive ? "secondary" : "primary"}
            onClick={handleToggleSession}
          >
            {sessionActive ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-error" />
                End Session
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-glow-pulse" />
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
          <GlassCard noPadding className="overflow-hidden">
            <div className="relative aspect-video bg-gradient-to-br from-bg-secondary to-bg-primary flex items-center justify-center">
              {/* Simulated or Real Camera Feed */}
              {sessionActive ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_AI_HTTP_URL || "http://localhost:8000"}/api/v1/camera/stream?camera_id=${data?.session.classroomId || "room-023"}`}
                  className="w-full h-full object-cover"
                  alt="Live Camera Monitoring Feed"
                  onError={(e) => {
                    console.error("Camera stream load error");
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-ai-blue/20 to-ai-purple/20 mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-10 h-10 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                      </svg>
                    </div>
                    <p className="text-sm text-text-muted">
                      Camera Inactive
                    </p>
                  </div>
                </div>
              )}

              {/* AI Overlay Indicators */}
              {sessionActive && (
                <div className="absolute top-3 left-3 right-3 flex gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-success/20 backdrop-blur-sm text-[10px] text-success">
                    <span className="h-1 w-1 rounded-full bg-success animate-glow-pulse" />
                    AI ACTIVE
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-glass-heavy backdrop-blur-sm text-[10px] text-text-muted">
                    Recognition: {data?.session.recognitionAccuracy}%
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-glass-heavy backdrop-blur-sm text-[10px] text-text-muted ml-auto">
                    {data?.session.totalPresent}/{data?.session.totalStudents}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Session Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-0.5">Students Present</p>
              <p className="text-xl font-bold text-success">{data?.session.totalPresent}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-0.5">Total Enrolled</p>
              <p className="text-xl font-bold text-text-primary">{data?.session.totalStudents}</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-0.5">Recognition Accuracy</p>
              <p className="text-xl font-bold text-ai-blue">{data?.session.recognitionAccuracy}%</p>
            </GlassCard>
            <GlassCard subtle>
              <p className="text-[10px] text-text-muted mb-0.5">Unknown Faces</p>
              <p className="text-xl font-bold text-warning">{data?.session.unknownFaces}</p>
            </GlassCard>
          </div>

          {/* Present Students */}
          <GlassCard>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Present Students ({data?.session.totalPresent})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {data?.presentStudents.slice(0, 24).map((student, i) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-2 p-2 rounded-lg glass group hover:bg-glass-medium transition-all"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-text-primary truncate">{student.name}</p>
                    <p className="text-[9px] text-text-muted font-mono">{student.id}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right: Events Panel */}
        <div className="space-y-4">
          {/* Timer */}
          <GlassCard>
            <div className="text-center">
              <p className="text-[10px] text-text-muted mb-1">Session Duration</p>
              <p className="text-2xl font-bold text-text-primary tabular-nums">
                {sessionActive ? "01:12:34" : "00:00:00"}
              </p>
              <p className="text-[10px] text-text-muted mt-1">{data?.session.subjectName}</p>
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
                  "flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all",
                  eventFilter === f.id
                    ? "bg-ai-blue text-black font-semibold"
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
              <h3 className="text-xs font-semibold text-text-primary">Live Events</h3>
              <span className="text-[10px] text-text-muted">{filteredEvents.length} events</span>
            </div>
            <div className="overflow-y-auto max-h-[500px] p-2 space-y-1">
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
                        "flex items-start gap-2 p-2 rounded-lg border transition-all",
                        colors.bg, colors.border,
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full mt-0.5 shrink-0", colors.dot)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-[10px] font-medium", event.type === "UNKNOWN_PERSON" ? "text-warning" : "text-text-primary")}>
                            {eventLabel(event.type)}
                          </span>
                          <span className="text-[9px] text-text-muted shrink-0">{event.time}</span>
                        </div>
                        {event.studentName && (
                          <p className="text-[10px] text-text-secondary">{event.studentName} • {event.studentId}</p>
                        )}
                        {event.confidence && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={cn(
                              "text-[9px] font-medium",
                              event.confidence >= 0.95 ? "text-success" : event.confidence >= 0.85 ? "text-warning" : "text-error",
                            )}>
                              {(event.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
