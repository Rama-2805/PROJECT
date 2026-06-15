// @ts-nocheck
// ─── SmartCampus AI — 3D Building Component ──────────
// @ts-nocheck
'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useCampusStore } from '@/store/campusStore';
import type { BuildingData } from '@/lib/mock/campus';

const HEALTH_COLORS: Record<string, string> = {
  normal: '#22D3EE',
  warning: '#FBBF24',
  critical: '#F87171',
};

const HEALTH_EMISSIVE: Record<string, string> = {
  normal: '#0891B2',
  warning: '#D97706',
  critical: '#DC2626',
};

export function Building3D({ data }: { data: BuildingData }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const setSelectedBuilding = useCampusStore((s) => s.setSelectedBuilding);
  const selectedBuilding = useCampusStore((s) => s.selectedBuilding);
  const isSelected = selectedBuilding?.id === data.id;

  const healthColor = HEALTH_COLORS[data.health];
  const emissiveColor = HEALTH_EMISSIVE[data.health];

  // Pulse animation for warnings
  useFrame((state) => {
    if (glowRef.current) {
      const pulse = data.health === 'critical'
        ? Math.sin(state.clock.elapsedTime * 4) * 0.5 + 0.5
        : data.health === 'warning'
          ? Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7
          : 0.4;
      (glowRef.current.material as THREE.Material).opacity = pulse * 0.3;
    }
    if (meshRef.current && hovered) {
      meshRef.current.position.y = data.position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    } else if (meshRef.current && isSelected) {
      meshRef.current.position.y = data.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.03;
    } else if (meshRef.current) {
      meshRef.current.position.y = data.position[1];
    }
  });

  const buildingColor = useMemo(() => new THREE.Color(healthColor), [healthColor]);
  const emissiveColor3 = useMemo(() => new THREE.Color(emissiveColor), [emissiveColor]);

  return (
    <group>
      {/* Main building mesh */}
      <mesh
        ref={meshRef}
        position={[data.position[0], data.position[1] + data.size[1] / 2, data.position[2]]}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); setSelectedBuilding(data); }}
      >
        <boxGeometry args={data.size} />
        <meshPhysicalMaterial
          color={buildingColor}
          emissive={emissiveColor3}
          emissiveIntensity={hovered || isSelected ? 0.3 : 0.1}
          metalness={0.1}
          roughness={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Edge wireframe */}
      <mesh
        position={[data.position[0], data.position[1] + data.size[1] / 2, data.position[2]]}
      >
        <boxGeometry args={[data.size[0] + 0.02, data.size[1] + 0.02, data.size[2] + 0.02]} />
        <meshBasicMaterial color={healthColor} wireframe transparent opacity={0.15} />
      </mesh>

      {/* Glow aura */}
      <mesh
        ref={glowRef}
        position={[data.position[0], data.position[1] + data.size[1] / 2, data.position[2]]}
      >
        <boxGeometry args={[data.size[0] + 0.3, data.size[1] + 0.3, data.size[2] + 0.3]} />
        <meshBasicMaterial color={healthColor} transparent opacity={0.2} side={THREE.BackSide} />
      </mesh>

      {/* Floor lines */}
      {Array.from({ length: data.floors - 1 }, (_, i) => (
        <mesh
          key={`floor-${i}`}
          position={[
            data.position[0],
            data.position[1] + (data.size[1] * (i + 1)) / data.floors,
            data.position[2],
          ]}
        >
          <boxGeometry args={[data.size[0] + 0.01, 0.02, data.size[2] + 0.01]} />
          <meshBasicMaterial color={healthColor} transparent opacity={0.2} />
        </mesh>
      ))}

      {/* Floating label */}
      {useCampusStore((s) => s.showLabels) && (
        <Html
          position={[data.position[0], data.position[1] + data.size[1] + 1.2, data.position[2]]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold tracking-wider text-white drop-shadow-lg">
              {data.shortName}
            </span>
            {data.health !== 'normal' && (
              <span className={`text-[10px] font-medium ${data.health === 'critical' ? 'text-red-400' : 'text-yellow-400'} drop-shadow-lg`}>
                {data.health.toUpperCase()}
              </span>
            )}
          </div>
        </Html>
      )}

      {/* Ground base */}
      <mesh position={[data.position[0], data.position[1] - 0.05, data.position[2]]}>
        <planeGeometry args={[data.size[0] + 0.5, data.size[2] + 0.5]} />
        <meshBasicMaterial color={healthColor} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
