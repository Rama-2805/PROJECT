// ─── SmartCampus AI — WebSocket Real-Time Hook ──────────
// Provides real-time sync for attendance updates, AI alerts,
// device health changes, and schedule changes via WebSocket.

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../constants';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

export interface CampusUpdate {
  overview: any;
  timestamp: string;
}

export interface AlertEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  classroom?: string;
  timestamp: string;
}

export interface AttendanceUpdate {
  sessionId: string;
  studentId: string;
  studentName: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  confidence: number;
  timestamp: string;
}

export interface OccupancyUpdate {
  occupancy: Record<string, { current: number; capacity: number }>;
  timestamp: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketState {
  status: ConnectionStatus;
  lastUpdate: CampusUpdate | null;
  lastAlert: AlertEvent | null;
  lastAttendance: AttendanceUpdate | null;
  lastOccupancy: OccupancyUpdate | null;
}

interface UseWebSocketReturn extends WebSocketState {
  connect: () => void;
  disconnect: () => void;
  send: (event: string, data: any) => void;
}

export function useWebSocket(namespace: string = '/campus'): UseWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<CampusUpdate | null>(null);
  const [lastAlert, setLastAlert] = useState<AlertEvent | null>(null);
  const [lastAttendance, setLastAttendance] = useState<AttendanceUpdate | null>(null);
  const [lastOccupancy, setLastOccupancy] = useState<OccupancyUpdate | null>(null);

  const token = useAuthStore((state) => state.token);
  const { addNotification } = useAppStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setStatus('connecting');

    const socket = io(`${API_CONFIG.wsUrl}${namespace}`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected:', socket.id);
      setStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      setStatus('error');
    });

    // ── Campus Events ──────────────────────────────────
    socket.on('CAMPUS_UPDATE', (data: CampusUpdate) => {
      setLastUpdate(data);
    });

    socket.on('ALERT_CREATED', (alert: AlertEvent) => {
      setLastAlert(alert);
      // Also add to notification store
      addNotification({
        id: alert.id,
        type: alert.severity === 'CRITICAL' ? 'ALERT' : 'SYSTEM',
        title: alert.title,
        body: alert.description,
        isRead: false,
        createdAt: alert.timestamp,
      });
    });

    socket.on('ATTENDANCE_UPDATED', (update: AttendanceUpdate) => {
      setLastAttendance(update);
    });

    socket.on('OCCUPANCY_CHANGED', (update: OccupancyUpdate) => {
      setLastOccupancy(update);
    });

    socket.on('SCHEDULE_CHANGED', (data: { message: string; changes: any }) => {
      addNotification({
        id: `schedule-${Date.now()}`,
        type: 'ANNOUNCEMENT',
        title: 'Schedule Updated',
        body: data.message,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    socketRef.current = socket;
  }, [namespace, token, addNotification]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('disconnected');
  }, []);

  const send = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    if (token) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  return {
    status,
    lastUpdate,
    lastAlert,
    lastAttendance,
    lastOccupancy,
    connect,
    disconnect,
    send,
  };
}
