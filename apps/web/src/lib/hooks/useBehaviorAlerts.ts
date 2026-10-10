"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

export interface BehaviorAlertItem {
  id: string;
  behaviorEventId?: string;
  studentId?: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  description: string;
  confidence: number;
  status: "ACTIVE" | "ACKNOWLEDGED" | "DISMISSED";
  acknowledgedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  studentName?: string | null;
  studentUsn?: string | null;
  section?: string | null;
}

export function useBehaviorAlerts() {
  const user = useAuthStore((s) => s.user);
  const [alerts, setAlerts] = useState<BehaviorAlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Determine user role and default section
  const isTeacher = user?.roles?.includes("TEACHER") || user?.email?.includes("kalaiselvi");
  const isHod = user?.roles?.includes("HOD") || user?.email?.includes("ramakrishna");
  const isAdmin = user?.roles?.includes("SUPER_ADMIN") || user?.roles?.includes("INSTITUTION_ADMIN") || user?.email?.includes("admin");

  // Initial section: Teacher sees Section A; HOD & Admin see ALL
  const [sectionFilter, setSectionFilter] = useState<"ALL" | "A" | "B">(
    isTeacher && !isHod && !isAdmin ? "A" : "ALL",
  );

  const fetchAlerts = useCallback(async () => {
    try {
      const url =
        sectionFilter === "ALL"
          ? "/behavior/alerts"
          : `/behavior/alerts?section=${sectionFilter}`;
      const res = await api.get<BehaviorAlertItem[]>(url);
      if (res && res.data && Array.isArray(res.data)) {
        setAlerts(res.data);
      } else if (Array.isArray(res)) {
        setAlerts(res as any);
      }
    } catch (err) {
      console.warn("Failed to fetch behavior alerts:", err);
    }
  }, [sectionFilter]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3500);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await api.patch(`/behavior/alerts/${alertId}/acknowledge`, {
        acknowledgedBy: user?.fullName || "Faculty",
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await api.patch(`/behavior/alerts/${alertId}/dismiss`, {});
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Failed to dismiss alert:", err);
    }
  };

  const unreadCount = alerts.filter((a) => a.status === "ACTIVE").length;

  return {
    alerts,
    loading,
    unreadCount,
    sectionFilter,
    setSectionFilter,
    acknowledgeAlert,
    dismissAlert,
    refreshAlerts: fetchAlerts,
    isTeacher,
    isHod,
    isAdmin,
  };
}
