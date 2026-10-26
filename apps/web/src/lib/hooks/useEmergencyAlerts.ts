"use client";

import { useState, useEffect, useCallback } from "react";

export interface EmergencyAlert {
  id: string;
  type: "SOS_PANIC" | "PERIMETER_BREACH" | "HARDWARE_OFFLINE" | "FIRE_HAZARD" | "CRITICAL_SHORTAGE";
  severity: "CRITICAL" | "HIGH";
  title: string;
  description: string;
  location: string;
  timestamp: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  deviceNode?: string;
  actionRequired: string;
}

const STORAGE_KEY = "smartcampus-emergency-alerts";

export function useEmergencyAlerts() {
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Only keep ACTIVE or ACKNOWLEDGED emergencies
            setEmergencies(parsed.filter((e: EmergencyAlert) => e.status !== "RESOLVED"));
          }
        }
      } catch {
        setEmergencies([]);
      }
    }
  }, []);

  // Save to localStorage when changed
  const persist = useCallback((list: EmergencyAlert[]) => {
    setEmergencies(list);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (err) {
        console.warn("Failed to persist emergency alerts:", err);
      }
    }
  }, []);

  // Acknowledge an emergency
  const acknowledgeEmergency = useCallback((id: string) => {
    setEmergencies((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, status: "ACKNOWLEDGED" as const } : e
      );
      persist(updated);
      return updated;
    });
  }, [persist]);

  // Resolve & remove an emergency
  const resolveEmergency = useCallback((id: string) => {
    setEmergencies((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  // Clear all active emergencies
  const clearAllEmergencies = useCallback(() => {
    persist([]);
  }, [persist]);

  // Trigger a test emergency drill
  const triggerSimulatedEmergency = useCallback((type: "SOS" | "HARDWARE" | "PERIMETER" = "SOS") => {
    const drillTemplates = {
      SOS: {
        type: "SOS_PANIC" as const,
        severity: "CRITICAL" as const,
        title: "🚨 EMERGENCY SOS: Lab Panic Terminal Triggered",
        description: "Emergency panic switch engaged at hardware station in CSE IoT Lab 3. Immediate campus security check required.",
        location: "CSE IoT Lab 3 (Lab Block B, Floor 2)",
        deviceNode: "CAM-LAB-3",
        actionRequired: "Dispatch security personnel & check camera feed immediately.",
      },
      HARDWARE: {
        type: "HARDWARE_OFFLINE" as const,
        severity: "HIGH" as const,
        title: "⚠️ CRITICAL NODE OFFLINE: Classroom 701 Front AI Camera",
        description: "Edge Vision Node CAM-023-A stopped sending heartbeats. Video ingestion pipeline halted.",
        location: "7th Sem - Section A (Room 701)",
        deviceNode: "CAM-023-A",
        actionRequired: "Check Power/PoE switch or reboot edge node via Devices Dashboard.",
      },
      PERIMETER: {
        type: "PERIMETER_BREACH" as const,
        severity: "CRITICAL" as const,
        title: "🚨 SECURITY ALERT: Unauthorized Turnstile Breach",
        description: "Unregistered individual forced barrier at Campus Main Gate Turnstile after operational hours.",
        location: "Campus Main Gate Turnstile",
        deviceNode: "CAM-GATE-1",
        actionRequired: "Security alert forwarded to Campus Security Patrol.",
      },
    };

    const template = drillTemplates[type];
    const newAlert: EmergencyAlert = {
      id: `emg-${Date.now()}`,
      ...template,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "ACTIVE",
    };

    setEmergencies((prev) => {
      const updated = [newAlert, ...prev];
      persist(updated);
      return updated;
    });
  }, [persist]);

  const activeEmergencies = emergencies.filter((e) => e.status === "ACTIVE");
  const unreadEmergencyCount = mounted ? activeEmergencies.length : 0;
  const allClear = unreadEmergencyCount === 0;

  return {
    emergencies,
    activeEmergencies,
    unreadEmergencyCount,
    allClear,
    acknowledgeEmergency,
    resolveEmergency,
    clearAllEmergencies,
    triggerSimulatedEmergency,
  };
}
