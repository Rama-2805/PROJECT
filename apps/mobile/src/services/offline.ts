// ─── SmartCampus AI — Offline Mode Service ───────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { STORAGE_KEYS, OFFLINE_CONFIG, API_CONFIG } from '../constants';

interface OfflineQueueItem {
  id: string;
  action: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

class OfflineService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private listeners: Array<(online: boolean) => void> = [];

  async initialize() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;

    NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      if (online && !this.isOnline) {
        this.syncQueue();
      }
      this.isOnline = online;
      this.listeners.forEach((l) => l(online));
    });
  }

  onConnectivityChange(callback: (online: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  // ── Caching ────────────────────────────────────────────
  async cacheData(key: string, data: any) {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + OFFLINE_CONFIG.cacheExpiryHours * 60 * 60 * 1000,
      };
      await AsyncStorage.setItem(`@cache/${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(`@cache/${key}`);
      if (!raw) return null;

      const cacheEntry = JSON.parse(raw);
      if (Date.now() > cacheEntry.expiry) {
        await AsyncStorage.removeItem(`@cache/${key}`);
        return null;
      }

      return cacheEntry.data as T;
    } catch {
      return null;
    }
  }

  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith('@cache/'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // ── Offline Queue ──────────────────────────────────────
  async addToQueue(action: string, payload: any) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.offlineQueue);
      const queue: OfflineQueueItem[] = raw ? JSON.parse(raw) : [];

      if (queue.length >= OFFLINE_CONFIG.maxQueueSize) {
        queue.shift(); // Remove oldest
      }

      queue.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        action,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      });

      await AsyncStorage.setItem(STORAGE_KEYS.offlineQueue, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  }

  async syncQueue() {
    if (this.syncInProgress || !this.isOnline) return;
    this.syncInProgress = true;

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.offlineQueue);
      if (!raw) return;

      const queue: OfflineQueueItem[] = JSON.parse(raw);
      const failed: OfflineQueueItem[] = [];

      for (const item of queue) {
        try {
          // Process each queued action
          await this.processQueueItem(item);
        } catch (error) {
          item.retryCount++;
          if (item.retryCount < API_CONFIG.retryCount) {
            failed.push(item);
          }
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.offlineQueue, JSON.stringify(failed));
    } catch (error) {
      console.error('Failed to sync queue:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processQueueItem(item: OfflineQueueItem) {
    const { default: api } = await import('./api');

    switch (item.action) {
      case 'MARK_ATTENDANCE':
        // await api.markAttendance(item.payload);
        break;
      case 'SUBMIT_FEEDBACK':
        // await api.submitFeedback(item.payload);
        break;
      case 'SEND_MESSAGE':
        // await api.sendMessage(item.payload);
        break;
      default:
        console.warn(`Unknown offline action: ${item.action}`);
    }
  }
}

export const offlineService = new OfflineService();
