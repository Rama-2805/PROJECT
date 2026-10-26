// ─── SmartCampus AI — 3D Performance Optimization ───────
// Level-of-Detail system, instancing helpers, and lazy loading
// to maintain 60 FPS with 100+ buildings and 50K+ students.

'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCampusStore } from '@/store/campusStore';

// ── Level of Detail (LOD) Component ───────────────────────────

interface LODConfig {
  /** Distance threshold for high-detail rendering */
  highDetailDist: number;
  /** Distance threshold for medium-detail rendering */
  mediumDetailDist: number;
  /** Toggle to show/hide objects beyond this distance */
  cullDist: number;
}

const DEFAULT_LOD: LODConfig = {
  highDetailDist: 8,
  mediumDetailDist: 15,
  cullDist: 25,
};

export function useLOD(config: Partial<LODConfig> = {}) {
  const lod = { ...DEFAULT_LOD, ...config };
  const { camera } = useThree();
  const objPos = useRef(new THREE.Vector3());
  const [detailLevel, setDetailLevel] = useState(2);
  const [isVisible, setIsVisible] = useState(true);
  const [distance, setDistance] = useState(0);

  const updateDetail = useCallback((pos: THREE.Vector3) => {
    const dist = camera.position.distanceTo(pos);
    setDistance(dist);

    if (dist > lod.cullDist) {
      setIsVisible(false);
      setDetailLevel(-1);
    } else if (dist > lod.mediumDetailDist) {
      setIsVisible(true);
      setDetailLevel(0);
    } else if (dist > lod.highDetailDist) {
      setIsVisible(true);
      setDetailLevel(1);
    } else {
      setIsVisible(true);
      setDetailLevel(2);
    }
  }, [camera, lod.cullDist, lod.mediumDetailDist, lod.highDetailDist]);

  return { detailLevel, isVisible, distance, updateDetail, objPos };
}

// ── Instanced Mesh Pool ────────────────────────────────────────

const MAX_DEVICES = 1000;
const MAX_STUDENT_PARTICLES = 300;

export function useInstancedMeshes() {
  const deviceCount = useCampusStore((s) => s.devices.length);

  const deviceGeometry = useMemo(() => new THREE.BoxGeometry(0.18, 0.18, 0.18), []);

  const deviceMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#22D3EE',
      emissive: '#22D3EE',
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.2,
    });
  }, []);

  return {
    deviceGeometry,
    deviceMaterial,
    maxDevices: MAX_DEVICES,
    maxParticles: MAX_STUDENT_PARTICLES,
    activeDeviceCount: deviceCount,
  };
}

// ── Scene Budget Monitor ──────────────────────────────────────

interface FrameBudget {
  drawCalls: number;
  triangles: number;
  fps: number;
}

export function usePerformanceMonitor() {
  const [budget, setBudget] = useState<FrameBudget>({ drawCalls: 0, triangles: 0, fps: 60 });
  const frameCount = useRef(0);
  const lastTime = useRef(0);

  useFrame(() => {
    frameCount.current++;

    const now = performance.now();
    if (lastTime.current === 0) {
      lastTime.current = now;
      return;
    }
    const delta = now - lastTime.current;

    if (delta >= 1000) {
      const measuredFps = Math.round((frameCount.current * 1000) / delta);
      setBudget((prev) => ({ ...prev, fps: measuredFps }));
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return budget;
}

// ── Particle Position Computation ──────────────────────────────

export function computeParticlePositions(
  count: number,
  time: number,
  waypoints: Float32Array,
): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const idx = i % (waypoints.length / 3);
    const progress = (Math.sin(time * 0.5 + i * 0.01) + 1) / 2;

    const currentIdx = Math.floor(idx) * 3;
    const nextIdx = ((Math.floor(idx) + 1) % (waypoints.length / 3)) * 3;

    positions[i * 3] = waypoints[currentIdx] + (waypoints[nextIdx] - waypoints[currentIdx]) * progress;
    positions[i * 3 + 1] = 0.5 + Math.sin(time + i) * 0.2;
    positions[i * 3 + 2] = waypoints[currentIdx + 2] + (waypoints[nextIdx + 2] - waypoints[currentIdx + 2]) * progress;
  }

  return positions;
}

// ── Asset Compression Helpers ─────────────────────────────────

export function useDeferredLoading(priority: 'critical' | 'high' | 'low' = 'low') {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const delay = priority === 'critical' ? 0 : priority === 'high' ? 100 : 500;
    const timer = setTimeout(() => setLoaded(true), delay);
    return () => clearTimeout(timer);
  }, [priority]);

  return loaded;
}

// ── Visibility-based Lazy Loading ─────────────────────────────

export function useVisibilityLoader(
  ref: React.RefObject<THREE.Object3D | null>,
  threshold = 15,
) {
  const { camera } = useThree();
  const [visible, setVisible] = useState(false);

  useFrame(() => {
    if (!ref.current || visible) return;
    const dist = camera.position.distanceTo(ref.current.position);
    if (dist < threshold) {
      setVisible(true);
    }
  });

  return visible;
}
