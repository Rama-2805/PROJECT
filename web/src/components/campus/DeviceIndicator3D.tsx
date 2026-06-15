// @ts-nocheck
// ─── SmartCampus AI — 3D Device Indicator Component ──

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useCampusStore } from '@/store/campusStore';
import type { DeviceIndicator } from '@/lib/mock/campus';

const STATUS_COLORS: Record<string, string> = {
  online: '#22D3EE',
  warning: '#FBBF24',
  offline: '#F87171',
};

export function DeviceIndicator3D({ device }: { device: DeviceIndicator }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const setSelectedDevice = useCampusStore((s) => s.setSelectedDevice);
  const showDevices = useCampusStore((s) => s.showDevices);

  const color = STATUS_COLORS[device.status];

  useFrame((state) => {
    if (!meshRef.current || !glowRef.current || !showDevices) return;

    const float = Math.sin(state.clock.elapsedTime * 2 + device.position[0]) * 0.1;
    meshRef.current.position.y = device.position[1] + float;
    glowRef.current.position.y = device.position[1] + float;

    if (device.status === 'offline') {
      const blink = Math.sin(state.clock.elapsedTime * 3) > 0 ? 1 : 0.2;
      meshRef.current.material.opacity = blink;
      glowRef.current.material.opacity = blink * 0.3;
    } else if (device.status === 'warning') {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
      glowRef.current.material.opacity = pulse * 0.4;
    } else {
      glowRef.current.material.opacity = 0.3;
    }
  });

  if (!showDevices) return null;

  const geometry = useMemo(() => {
    if (device.type === 'camera') return new THREE.ConeGeometry(0.15, 0.25, 8);
    if (device.type === 'edge_ai') return new THREE.BoxGeometry(0.18, 0.18, 0.18);
    return new THREE.SphereGeometry(0.12, 8, 8);
  }, [device.type]);

  return (
    <group>
      {/* Main indicator */}
      <mesh
        ref={meshRef}
        position={device.position}
        geometry={geometry}
        onClick={(e) => { e.stopPropagation(); setSelectedDevice(device); }}
        onPointerEnter={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { document.body.style.cursor = 'default'; }}
      >
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      {/* Glow sphere */}
      <mesh ref={glowRef} position={device.position}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Label */}
      <Html position={[device.position[0], device.position[1] + 0.4, device.position[2]]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-mono text-white/70 drop-shadow-lg">{device.deviceId}</span>
        </div>
      </Html>
    </group>
  );
}
