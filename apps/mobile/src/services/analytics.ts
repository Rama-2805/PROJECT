// ─── SmartCampus AI — Mobile Usage Analytics Service ────
// Tracks daily active users, session duration, feature usage,
// screen views, and error events for product improvement.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, API_CONFIG } from '../constants';

type EventCategory =
  | 'screen_view'
  | 'feature_usage'
  | 'user_action'
  | 'error'
  | 'performance'
  | 'sync';

interface AnalyticsEvent {
  id: string;
  category: EventCategory;
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  deviceInfo?: {
    platform: string;
    osVersion: string;
    appVersion: string;
  };
}

interface SessionData {
  sessionId: string;
  startTime: number;
  lastActiveTime: number;
  screenViews: { screen: string; time: number }[];
  eventCount: number;
}

class AnalyticsService {
  private session: SessionData | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private isUploading = false;
  private readonly MAX_QUEUE_SIZE = 200;
  private readonly FLUSH_INTERVAL_MS = 60000; // 1 minute
  private readonly STORAGE_KEY = '@analytics/events';
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  async initialize(userId?: string) {
    // Restore unsent events from storage
    await this.restoreQueue();

    // Start new session
    this.startSession(userId);

    // Start periodic flush
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);

    // Track app open
    this.trackEvent('user_action', 'app_opened', { userId });
  }

  startSession(userId?: string) {
    this.session = {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startTime: Date.now(),
      lastActiveTime: Date.now(),
      screenViews: [],
      eventCount: 0,
    };
  }

  endSession() {
    if (!this.session) return;

    const duration = Date.now() - this.session.startTime;
    this.trackEvent('performance', 'session_ended', {
      sessionId: this.session.sessionId,
      durationMs: duration,
      screenViews: this.session.screenViews.length,
      totalEvents: this.session.eventCount,
    });

    this.session = null;
    this.flush();
  }

  trackScreenView(screenName: string) {
    if (!this.session) return;

    this.session.screenViews.push({ screen: screenName, time: Date.now() });
    this.session.lastActiveTime = Date.now();
    this.session.eventCount++;

    this.trackEvent('screen_view', screenName, {
      sessionId: this.session.sessionId,
      screenName,
    });
  }

  trackFeature(featureName: string, properties?: Record<string, string | number | boolean>) {
    if (!this.session) return;
    this.session.eventCount++;
    this.session.lastActiveTime = Date.now();

    this.trackEvent('feature_usage', featureName, {
      sessionId: this.session.sessionId,
      ...properties,
    });
  }

  trackAction(actionName: string, properties?: Record<string, string | number | boolean>) {
    if (!this.session) return;
    this.session.eventCount++;

    this.trackEvent('user_action', actionName, {
      sessionId: this.session.sessionId,
      ...properties,
    });
  }

  trackError(errorName: string, errorMessage: string) {
    this.trackEvent('error', errorName, {
      sessionId: this.session?.sessionId || 'no-session',
      message: errorMessage,
    });
  }

  private trackEvent(category: EventCategory, name: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      name,
      properties: properties || {},
      timestamp: Date.now(),
      sessionId: this.session?.sessionId || 'background',
      deviceInfo: {
        platform: 'mobile',
        osVersion: '',
        appVersion: '1.0.0',
      },
    };

    this.eventQueue.push(event);

    // Auto-flush if queue is getting large
    if (this.eventQueue.length >= 100) {
      this.flush();
    }
  }

  private async flush() {
    if (this.isUploading || this.eventQueue.length === 0) return;
    this.isUploading = true;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send to backend analytics endpoint
      const response = await fetch(`${API_CONFIG.baseUrl}/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        throw new Error(`Failed to upload analytics: ${response.status}`);
      }

      // Clear storage if upload succeeded
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const storedEvents: AnalyticsEvent[] = JSON.parse(stored);
        const remaining = storedEvents.filter(
          (e) => !events.find((newE) => newE.id === e.id),
        );
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(remaining));
      }
    } catch (error) {
      // Re-queue failed events
      this.eventQueue = [...events, ...this.eventQueue].slice(0, this.MAX_QUEUE_SIZE);

      // Persist to storage for later retry
      await this.persistQueue();
    } finally {
      this.isUploading = false;
    }
  }

  private async persistQueue() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const existing: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];
      const all = [...existing, ...this.eventQueue].slice(-this.MAX_QUEUE_SIZE);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    } catch (error) {
      console.error('Failed to persist analytics queue:', error);
    }
  }

  private async restoreQueue() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const events: AnalyticsEvent[] = JSON.parse(stored);
        this.eventQueue = events.slice(-this.MAX_QUEUE_SIZE);
      }
    } catch (error) {
      console.error('Failed to restore analytics queue:', error);
    }
  }

  getSessionDuration(): number {
    if (!this.session) return 0;
    return Date.now() - this.session.startTime;
  }

  getScreenViewCount(): number {
    return this.session?.screenViews.length || 0;
  }

  getQueuedEventCount(): number {
    return this.eventQueue.length;
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.endSession();
  }
}

export const analyticsService = new AnalyticsService();
