// @ts-nocheck
// ─── SmartCampus AI — Main 3D Campus Scene ────────────

'use client';

import { Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { useCampusStore } from '@/store/campusStore';
import { Building3D } from './Building3D';
import { CampusGround } from './CampusGround';
import { DeviceIndicator3D } from './DeviceIndicator3D';
import { StudentFlowParticles } from './StudentFlowParticles';

function CameraController() {
  const controlsRef = useRef<any>(null);
  const cameraTarget = useCampusStore((s) => s.cameraTarget);
  const selectedBuilding = useCampusStore((s) => s.selectedBuilding);
  const { camera } = useThree();

  useEffect(() => {
    if (selectedBuilding && controlsRef.current) {
      const pos = selectedBuilding.position;
      controlsRef.current.target.set(pos[0], pos[1] + 2, pos[2]);
    }
  }, [selectedBuilding]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.2}
      target={[0, 1, 0]}
      makeDefault
    />
  );
}

function SceneContent() {
  const buildings = useCampusStore((s) => s.buildings);
  const devices = useCampusStore((s) => s.devices);

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} color="#7dd3fc" />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} color="#a78bfa" />
      <pointLight position={[0, 8, 0]} intensity={0.3} color="#22d3ee" />
      <hemisphereLight args={['#0a1628', '#1a3355', 0.4]} />

      <fog attach="fog" args={['#0a1628', 15, 30]} />

      <CampusGround />

      <Suspense fallback={null}>
        {buildings.map((building) => (
          <Building3D key={building.id} data={building} />
        ))}
      </Suspense>

      <Suspense fallback={null}>
        {devices.map((device) => (
          <DeviceIndicator3D key={device.id} device={device} />
        ))}
      </Suspense>

      <StudentFlowParticles />

      <CameraController />
    </>
  );
}

export function CampusScene() {
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: '#0a1628' }}
      >
        <AdaptiveDpr pixelated />
        <PerspectiveCamera makeDefault position={[0, 8, 18]} fov={50} />
        <SceneContent />
      </Canvas>
    </div>
  );
}
