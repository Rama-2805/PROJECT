// ─── SmartCampus AI — Analytics Tracking Hook ───────────
// Tracks screen views, feature usage, and session data.

import { useEffect, useRef, useCallback } from 'react';
import { analyticsService } from '../services/analytics';

interface UseAnalyticsOptions {
  screenName?: string;
  features?: string[];
  userId?: string;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { screenName, features, userId } = options;
  const hasInitialized = useRef(false);
  const previousScreen = useRef<string | null>(null);

  // Initialize analytics on first mount
  useEffect(() => {
    if (!hasInitialized.current) {
      analyticsService.initialize(userId);
      hasInitialized.current = true;
    }

    return () => {
      // Don't end session on component unmount (app-wide)
    };
  }, [userId]);

  // Track screen views
  useEffect(() => {
    if (screenName && screenName !== previousScreen.current) {
      analyticsService.trackScreenView(screenName);
      previousScreen.current = screenName;
    }
  }, [screenName]);

  // Register feature tracking
  useEffect(() => {
    if (features) {
      features.forEach((feature) => {
        analyticsService.trackFeature(`${feature}_available`);
      });
    }
  }, [features]);

  const trackFeature = useCallback(
    (featureName: string, properties?: Record<string, string | number | boolean>) => {
      analyticsService.trackFeature(featureName, properties);
    },
    [],
  );

  const trackAction = useCallback(
    (actionName: string, properties?: Record<string, string | number | boolean>) => {
      analyticsService.trackAction(actionName, properties);
    },
    [],
  );

  const trackError = useCallback(
    (errorName: string, errorMessage: string) => {
      analyticsService.trackError(errorName, errorMessage);
    },
    [],
  );

  return {
    trackFeature,
    trackAction,
    trackError,
    sessionDuration: analyticsService.getSessionDuration(),
    screenViewCount: analyticsService.getScreenViewCount(),
    queuedEvents: analyticsService.getQueuedEventCount(),
  };
}
