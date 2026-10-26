"use client";

import { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore, type ReactNode } from "react";

// DEMO_MODE is determined after mount to avoid SSR/client hydration mismatch

function getDemoSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const envDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const queryDemo = params.get("demo");
  if (queryDemo === "false") return false;
  return queryDemo === "true" || envDemo;
}

interface DemoEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface DemoContextValue {
  isDemoMode: boolean;
  lastEvent: DemoEvent | null;
  events: DemoEvent[];
  simulateEvent: (type: string, data?: Record<string, unknown>) => void;
  activeSimulations: string[];
  toggleSimulation: (name: string) => void;
}

const DemoContext = createContext<DemoContextValue>({
  isDemoMode: false,
  lastEvent: null,
  events: [],
  simulateEvent: () => undefined,
  activeSimulations: [],
  toggleSimulation: () => undefined,
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const demoActive = useSyncExternalStore(() => () => {}, getDemoSnapshot, () => false);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [activeSimulations, setActiveSimulations] = useState<string[]>([
    "attendance", "behavior", "heartbeat",
  ]);

  const simulateEvent = useCallback((type: string, data: Record<string, unknown> = {}) => {
    const event: DemoEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    setEvents((prev) => [event, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    if (!demoActive) return;

    const intervals: ReturnType<typeof setInterval>[] = [];

    if (activeSimulations.includes("attendance")) {
      intervals.push(setInterval(() => {
        const id = Math.floor(Math.random() * 15) + 1;
        simulateEvent("ATTENDANCE_DETECTED", {
          studentId: `CSE2026${String(id).padStart(3, "0")}`,
          confidence: 0.85 + Math.random() * 0.14,
        });
      }, 8000));
    }

    if (activeSimulations.includes("behavior")) {
      intervals.push(setInterval(() => {
        const behaviors = ["ATTENTIVE", "DISTRACTED", "PHONE_USAGE", "SLEEPING"];
        const id = Math.floor(Math.random() * 15) + 1;
        simulateEvent("BEHAVIOR_DETECTED", {
          studentId: `CSE2026${String(id).padStart(3, "0")}`,
          behavior: behaviors[Math.floor(Math.random() * behaviors.length)],
          confidence: 0.75 + Math.random() * 0.2,
        });
      }, 12000));
    }

    if (activeSimulations.includes("heartbeat")) {
      intervals.push(setInterval(() => {
        const prefixes = ["CSE", "ECE", "ME"];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const id = Math.floor(Math.random() * 10) + 1;
        simulateEvent("DEVICE_HEARTBEAT", {
          deviceId: `DEVICE_${prefix}_${String(id).padStart(3, "0")}`,
          cpu: 20 + Math.random() * 60,
          memory: 30 + Math.random() * 50,
          status: Math.random() > 0.9 ? "WARNING" : "ONLINE",
        });
      }, 15000));
    }

    if (activeSimulations.includes("insight")) {
      intervals.push(setInterval(() => {
        const insights = [
          "Attendance in CSE department increased by 5% this week",
          "3 students flagged for low engagement in ME department",
          "Device DEVICE_CSE_003 running above normal temperature",
          "AI recognition accuracy reached 99.1%",
          "15 students at risk due to declining attendance",
        ];
        simulateEvent("NEW_INSIGHT", {
          message: insights[Math.floor(Math.random() * insights.length)],
          severity: Math.random() > 0.7 ? "WARNING" : "INFO",
        });
      }, 25000));
    }

    return () => intervals.forEach(clearInterval);
  }, [demoActive, activeSimulations, simulateEvent]);

  const toggleSimulation = useCallback((name: string) => {
    setActiveSimulations((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  }, []);

  const contextValue: DemoContextValue = {
    isDemoMode: demoActive,
    lastEvent: events[0] || null,
    events,
    simulateEvent,
    activeSimulations,
    toggleSimulation,
  };

  return (
    <DemoContext.Provider value={contextValue}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode(): DemoContextValue {
  return useContext(DemoContext);
}

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    if (typeof window !== "undefined") {
      const demoParam = new URLSearchParams(window.location.search).get("demo");
      if (demoParam === "false") return false;
    }
    return true;
  }
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "true";
}
