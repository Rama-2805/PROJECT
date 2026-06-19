// ─── SmartCampus AI — App Store (Zustand) ────────────────

import { create } from 'zustand';
import type { AppNotification } from '../types';

interface AppStore {
  isOnline: boolean;
  isDarkMode: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  activeSessionId: string | null;
  setOnline: (value: boolean) => void;
  setDarkMode: (value: boolean) => void;
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  getUnreadCount: () => number;
}

export const useAppStore = create<AppStore>((set, get) => ({
  isOnline: true,
  isDarkMode: true,
  notifications: [],
  unreadCount: 0,
  activeSessionId: null,

  setOnline: (value) => set({ isOnline: value }),
  setDarkMode: (value) => set({ isDarkMode: value }),

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  setActiveSession: (id) => set({ activeSessionId: id }),

  getUnreadCount: () => get().unreadCount,
}));
