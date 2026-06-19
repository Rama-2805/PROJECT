// @ts-nocheck
/* eslint-disable react-hooks/exhaustive-deps */
// ─── SmartCampus AI — Student Flow Particle System ────

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 300;
const PATROL_POINTS: [number, number, number][] = [
  [-5, 0.5, -8],  // Admin
  [-8, 0.5, -5],  // Engineering
  [8, 0.5, -5],   // Science
  [-5, 0.5, 4],   // Library
  [5, 0.5, 4],    // Auditorium
  [0, 0.5, 6],    // Cafeteria
  [-10, 0.5, 0],  // Mechanical
  [-4, 0.5, 2],   // CSE
  [4, 0.5, 2],    // ECE
  [-7, 0.5, 7],   // Sports
];

export function StudentFlowParticles() {
  const pointsRef = useRef<THREE.Points>(null!);
  const particleData = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT);
    const targets = new Float32Array(PARTICLE_COUNT);
    const offsets = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const startIdx = Math.floor(Math.random() * PATROL_POINTS.length);
      const endIdx = Math.floor(Math.random() * PATROL_POINTS.length);
      const start = PATROL_POINTS[startIdx];
      const end = PATROL_POINTS[endIdx];

      positions[i * 3] = start[0] + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = start[1] + Math.random() * 0.5;
      positions[i * 3 + 2] = start[2] + (Math.random() - 0.5) * 0.5;

      velocities[i] = 0.002 + Math.random() * 0.003;
      targets[i] = endIdx;
      offsets[i] = Math.random() * 100;

      const hue = 0.55 + Math.random() * 0.15; // cyan to blue
      const c = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    return { positions, velocities, targets, offsets, colors };
  }, []);

  // Initialize with zeros — will be randomized on the first useFrame tick (avoids hydration mismatch)
  const progress = useRef(new Float32Array(PARTICLE_COUNT).fill(0));
  const initialized = useRef(false);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    // Seed random progress values on the first frame
    if (!initialized.current) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        progress.current[i] = Math.random();
      }
      initialized.current = true;
    }

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      progress.current[i] += particleData.velocities[i] * delta * 3;

      if (progress.current[i] >= 1) {
        progress.current[i] = 0;
        const newTarget = Math.floor(Math.random() * PATROL_POINTS.length);
        particleData.targets[i] = newTarget;
        // Reset to current position
        const startIdx = Math.floor(Math.random() * PATROL_POINTS.length);
        const newStart = PATROL_POINTS[startIdx];
        pos[i * 3] = newStart[0] + (Math.random() - 0.5) * 0.5;
        pos[i * 3 + 1] = newStart[1] + Math.random() * 0.5;
        pos[i * 3 + 2] = newStart[2] + (Math.random() - 0.5) * 0.5;
      } else {
        const targetIdx = particleData.targets[i];
        const target = PATROL_POINTS[targetIdx];
        const t = easeInOutCubic(progress.current[i]);

        const startX = pos[i * 3];
        const startY = pos[i * 3 + 1];
        const startZ = pos[i * 3 + 2];

        pos[i * 3] = startX + (target[0] - startX) * t * 0.02;
        pos[i * 3 + 1] = startY + (target[1] - startY) * t * 0.02 + Math.sin(progress.current[i] * Math.PI) * 0.3;
        pos[i * 3 + 2] = startZ + (target[2] - startZ) * t * 0.02;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={particleData.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
