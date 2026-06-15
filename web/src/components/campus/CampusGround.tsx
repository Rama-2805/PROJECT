// @ts-nocheck
// ─── SmartCampus AI — Campus Ground & Grid ────────────

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function CampusGround() {
  const gridRef = useRef<THREE.GridHelper>(null!);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 0.1) % 2;
    }
  });

  return (
    <group>
      {/* Main ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color="#0a1628"
          metalness={0.8}
          roughness={0.4}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Grid */}
      <gridHelper
        ref={gridRef}
        args={[40, 40, '#1a3355', '#0d1f3d']}
        position={[0, 0, 0]}
      />

      {/* Outer ring glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[12, 14, 64]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[16, 17, 64]} />
        <meshBasicMaterial color="#A78BFA" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
