// ─── SmartCampus AI — WebXR AR/VR Readiness ────────────
// Prepares the campus digital twin for immersive viewing
// via WebXR-compatible browsers and AR/VR devices.
//
// Future: Enable with AR button -> navigator.xr.requestSession

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type XRSessionMode = 'immersive-vr' | 'immersive-ar' | 'inline';

interface XRState {
  isSupported: boolean;
  isSessionActive: boolean;
  sessionMode: XRSessionMode | null;
  error: string | null;
  deviceType: 'vr' | 'ar' | 'none' | 'unknown';
}

interface XRHit {
  position: [number, number, number];
  normal: [number, number, number];
}

interface UseWebXROptions {
  /** The Three.js scene reference for XR attachment */
  glRef?: React.RefObject<unknown>;
  /** Called when XR session starts */
  onSessionStart?: () => void;
  /** Called when XR session ends */
  onSessionEnd?: () => void;
}

interface WebXRReturns {
  xrState: XRState;
  requestSession: (mode?: XRSessionMode) => Promise<void>;
  endSession: () => Promise<void>;
  recentHit: XRHit | null;
}

// ── Spatial Interface Types (for future hand tracking) ────────
interface SpatialUIElement {
  id: string;
  position: [number, number, number];
  size: [number, number];
  label: string;
  action: () => void;
}

export function useWebXR(options: UseWebXROptions = {}): WebXRReturns {
  const sessionRef = useRef<XRSession | null>(null);
  const [xrState, setXrState] = useState<XRState>({
    isSupported: false,
    isSessionActive: false,
    sessionMode: null,
    error: null,
    deviceType: 'unknown',
  });
  const [recentHit, setRecentHit] = useState<XRHit | null>(null);

  // Check WebXR support on mount
  useEffect(() => {
    const checkSupport = async () => {
      if (typeof navigator === 'undefined' || !navigator.xr) {
        setXrState((prev) => ({ ...prev, isSupported: false, deviceType: 'none' }));
        return;
      }

      try {
        // Check VR support
        const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
        const arSupported = await navigator.xr.isSessionSupported('immersive-ar');

        if (vrSupported || arSupported) {
          setXrState({
            isSupported: true,
            isSessionActive: false,
            sessionMode: null,
            error: null,
            deviceType: arSupported ? 'ar' : 'vr',
          });
        } else {
          setXrState({
            isSupported: false,
            isSessionActive: false,
            sessionMode: null,
            error: null,
            deviceType: 'none',
          });
        }
      } catch (err) {
        setXrState({
          isSupported: false,
          isSessionActive: false,
          sessionMode: null,
          error: err instanceof Error ? err.message : 'WebXR check failed',
          deviceType: 'unknown',
        });
      }
    };

    checkSupport();
  }, []);

  // Start XR session
  const requestSession = useCallback(async (mode: XRSessionMode = 'immersive-vr') => {
    if (!navigator.xr) {
      setXrState((prev) => ({ ...prev, error: 'WebXR not supported' }));
      return;
    }

    try {
      const session = await navigator.xr.requestSession(mode, {
        optionalFeatures: ['hand-tracking', 'hit-test', 'local-floor', 'bounded-floor'],
      });

      sessionRef.current = session;

      setXrState({
        isSupported: true,
        isSessionActive: true,
        sessionMode: mode,
        error: null,
        deviceType: mode === 'immersive-ar' ? 'ar' : 'vr',
      });

      options.onSessionStart?.();

      // Set up hit-test for AR mode
      if (mode === 'immersive-ar') {
        const viewerRefSpace = await session.requestReferenceSpace('viewer');
        const hitTestSource = await session.requestHitTestSource?.({ space: viewerRefSpace });

        // Poll for hit test results
        const hitTestInterval = setInterval(() => {
          if (!sessionRef.current) {
            clearInterval(hitTestInterval);
            return;
          }
          session.requestAnimationFrame((time, frame) => {
            if (hitTestSource && frame) {
              const hitResults = frame.getHitTestResults(hitTestSource);
              if (hitResults && hitResults.length > 0) {
                const pose = hitResults[0].getPose(viewerRefSpace);
                if (pose) {
                  setRecentHit({
                    position: [pose.transform.position.x, pose.transform.position.y, pose.transform.position.z],
                    normal: [0, 1, 0],
                  });
                }
              }
            }
          });
        }, 100);

        session.addEventListener('end', () => {
          clearInterval(hitTestInterval);
        });
      }

      session.addEventListener('end', () => {
        sessionRef.current = null;
        setXrState((prev) => ({
          ...prev,
          isSupported: true,
          isSessionActive: false,
          sessionMode: null,
          error: null,
        }));
        options.onSessionEnd?.();
      });
    } catch (err) {
      setXrState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to start XR session',
      }));
    }
  }, [options]);

  // End XR session
  const endSession = useCallback(async () => {
    if (sessionRef.current) {
      sessionRef.current.end();
      sessionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.end();
        sessionRef.current = null;
      }
    };
  }, []);

  return {
    xrState,
    requestSession,
    endSession,
    recentHit,
  };
}

// ── Future: Spatial UI Builder for AR/VR Interfaces ──────────

const SPATIAL_UIS: SpatialUIElement[] = [
  { id: 'building-list', position: [-2, 1.5, -1], size: [1.5, 2], label: 'Buildings', action: () => {} },
  { id: 'device-status', position: [0, 1.5, -1], size: [1.5, 2], label: 'Devices', action: () => {} },
  { id: 'analytics', position: [2, 1.5, -1], size: [1.5, 2], label: 'Analytics', action: () => {} },
];

export function getSpatialUIElements(): SpatialUIElement[] {
  return SPATIAL_UIS;
}

// ── Hand Tracking Gesture Recognizer (future) ────────────────

export type GestureType = 'pinch' | 'grab' | 'point' | 'swipe';

export interface HandTrackingState {
  leftHand: { position: [number, number, number]; gesture: GestureType } | null;
  rightHand: { position: [number, number, number]; gesture: GestureType } | null;
}

export function useHandTracking(): HandTrackingState {
  const [state, setState] = useState<HandTrackingState>({
    leftHand: null,
    rightHand: null,
  });

  useEffect(() => {
    // Hand tracking will be enabled when WebXR hand-tracking
    // feature lands in the session. This is a placeholder.
    const checkHands = () => {
      // TODO: Implement XRFrame joint tracking
    };

    const interval = setInterval(checkHands, 100);
    return () => clearInterval(interval);
  }, []);

  return state;
}
