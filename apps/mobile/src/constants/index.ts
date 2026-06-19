// ─── SmartCampus AI — App Constants ──────────────────────

import { Platform } from 'react-native';

export const API_CONFIG = {
  baseUrl: 'https://api.smartcampus-ai.com',
  wsUrl: 'wss://api.smartcampus-ai.com/ws',
  timeout: 15000,
  retryCount: 3,
} as const;

export const STORAGE_KEYS = {
  authToken: '@smartcampus/auth_token',
  refreshToken: '@smartcampus/refresh_token',
  userData: '@smartcampus/user_data',
  cachedDashboard: '@smartcampus/cached_dashboard',
  cachedSchedule: '@smartcampus/cached_schedule',
  offlineQueue: '@smartcampus/offline_queue',
  notificationSettings: '@smartcampus/notification_settings',
  deviceId: '@smartcampus/device_id',
} as const;

export const NOTIFICATION_CHANNELS = {
  attendance: {
    id: 'attendance',
    name: 'Attendance Updates',
    description: 'Notifications about attendance marking and reports',
  },
  alerts: {
    id: 'alerts',
    name: 'AI Alerts',
    description: 'Urgent AI-powered alerts about behavior and engagement',
  },
  system: {
    id: 'system',
    name: 'System Notifications',
    description: 'Device status and system updates',
  },
  announcements: {
    id: 'announcements',
    name: 'Announcements',
    description: 'Institution announcements and schedule changes',
  },
} as const;

export const OFFLINE_CONFIG = {
  cacheExpiryHours: 24,
  maxQueueSize: 100,
  syncOnReconnect: true,
} as const;

export const QR_CONFIG = {
  defaultExpiryMinutes: 5,
  sessionTimeoutMinutes: 60,
} as const;

export const CHAT_CONFIG = {
  maxHistoryMessages: 50,
  typingDelayMs: 800,
  suggestions: [
    { id: 's1', text: 'How many classes did I miss this month?', icon: '📊' },
    { id: 's2', text: 'What is my attendance percentage?', icon: '✅' },
    { id: 's3', text: 'When is my next class?', icon: '📅' },
    { id: 's4', text: 'Show my engagement score', icon: '🧠' },
    { id: 's5', text: 'Am I at risk academically?', icon: '⚠️' },
    { id: 's6', text: 'What subjects need improvement?', icon: '📚' },
  ],
} as const;

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
