"use client";

/**
 * SmartCampus AI — Enrollment WebSocket Hook
 *
 * Connects to the FastAPI AI service WebSocket endpoint and handles
 * real-time enrollment events. Automatically reconnects on disconnect.
 *
 * Events handled:
 *   SESSION_PROCESSING_STARTED  – pipeline started
 *   PROCESSING_PROGRESS         – frame-by-frame progress
 *   CLUSTER_CREATED             – new identity cluster discovered
 *   CLUSTER_UPDATED             – cluster gained more samples / best image set
 *   BEST_IMAGE_GENERATED        – best.jpg selected for a cluster
 *   ENROLLMENT_COMPLETED        – all videos processed, ready for review
 *   SESSION_FAILED              – pipeline error
 */

import { useEffect, useRef, useCallback } from "react";
import { getEnrollmentWsUrl } from "@/lib/api/enrollment";

export interface WsEnrollmentEvent {
  event: string;
  data: Record<string, unknown>;
}

export interface UseEnrollmentWebSocketOptions {
  /** Called on every enrollment WebSocket event. */
  onEvent: (event: WsEnrollmentEvent) => void;
  /** Enable/disable the connection (default: true). */
  enabled?: boolean;
  /** Reconnect delay in ms (default: 3000). */
  reconnectDelay?: number;
}

export function useEnrollmentWebSocket({
  onEvent,
  enabled = true,
  reconnectDelay = 3000,
}: UseEnrollmentWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onEventRef = useRef(onEvent);

  // Keep handler ref up-to-date without reconnecting
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    const wsUrl = getEnrollmentWsUrl();

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.debug("[EnrollmentWS] Connected:", wsUrl);
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      };

      ws.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as { event: string; data: Record<string, unknown> };
          if (parsed.event) {
            onEventRef.current({ event: parsed.event, data: parsed.data || {} });
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onclose = () => {
        console.debug("[EnrollmentWS] Disconnected");
        wsRef.current = null;
        if (mountedRef.current && enabled) {
          // Reconnect after delay
          reconnectTimer.current = setTimeout(() => {
            if (mountedRef.current) connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = (err) => {
        console.debug("[EnrollmentWS] Error:", err);
        ws.close();
      };
    } catch (err) {
      console.debug("[EnrollmentWS] Failed to connect:", err);
      if (mountedRef.current && enabled) {
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, reconnectDelay);
      }
    }
  }, [enabled, reconnectDelay]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent auto-reconnect on unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  /** Manually send a raw message (rarely needed). */
  const send = useCallback((payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { send };
}
