/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable react-hooks/purity */
"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Points, PointMaterial, Torus, Line, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

// Background Particles
function ParticleStream() {
  const count = 5000;
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 5 + Math.random() * 15;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
    }
    return p;
  }, [count]);

  const ref = useRef<THREE.Points>(null);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 30;
      ref.current.rotation.y -= delta / 20;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#FFFFFF" size={0.05} sizeAttenuation={true} depthWrite={false} opacity={0.6} />
    </Points>
  );
}

// Data Rings
function DataRings() {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (ring1.current) {
      ring1.current.rotation.x += delta * 0.2;
      ring1.current.rotation.y += delta * 0.5;
    }
    if (ring2.current) {
      ring2.current.rotation.y -= delta * 0.3;
      ring2.current.rotation.z -= delta * 0.1;
    }
    if (ring3.current) {
      ring3.current.rotation.x -= delta * 0.4;
      ring3.current.rotation.z += delta * 0.2;
    }
  });

  return (
    <>
      <Torus ref={ring1} args={[3, 0.01, 16, 100]} rotation={[Math.PI/2, 0, 0]}>
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} />
      </Torus>
      <Torus ref={ring2} args={[4, 0.02, 16, 100]} rotation={[0, Math.PI/3, 0]}>
        <meshBasicMaterial color="#A3A3A3" transparent opacity={0.3} />
      </Torus>
      <Torus ref={ring3} args={[5, 0.01, 16, 100]} rotation={[Math.PI/4, 0, Math.PI/4]}>
        <meshBasicMaterial color="#E5E5E5" transparent opacity={0.4} />
      </Torus>
    </>
  );
}

// Core Intelligence Sphere
function AICore() {
  const coreRef = useRef<THREE.Group>(null);
  const { mouse } = useThree();

  useFrame((state, delta) => {
    if (coreRef.current) {
      // Rotate core slowly
      coreRef.current.rotation.y += delta * 0.1;
      
      // Mouse Parallax Effect
      const targetX = (mouse.x * Math.PI) / 10;
      const targetY = (mouse.y * Math.PI) / 10;
      
      coreRef.current.rotation.y += 0.05 * (targetX - coreRef.current.rotation.y);
      coreRef.current.rotation.x += 0.05 * (targetY - coreRef.current.rotation.x);
    }
  });

  return (
    <group ref={coreRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        {/* Outer Glass Shell */}
        <Sphere args={[1.8, 64, 64]}>
          <MeshDistortMaterial
            color="#000000"
            envMapIntensity={1}
            clearcoat={1}
            clearcoatRoughness={0}
            metalness={1}
            roughness={0}
            transmission={0.9}
            ior={1.5}
            thickness={2}
            transparent
            opacity={0.3}
            distort={0.2}
            speed={2}
          />
        </Sphere>
        
        {/* Inner Wireframe Neural Structure */}
        <Icosahedron args={[1.2, 2]}>
          <meshBasicMaterial color="#E5E5E5" wireframe transparent opacity={0.8} />
        </Icosahedron>

        {/* Core Glowing Orb */}
        <Sphere args={[0.6, 32, 32]}>
          <meshBasicMaterial color="#FFFFFF" />
        </Sphere>
      </Float>
      
      <DataRings />
    </group>
  );
}

export function Hero3D() {
  return (
    <div className="absolute inset-0 w-full h-full -z-10 pointer-events-auto">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#000000']} />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#E5E5E5" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#A3A3A3" />
        <pointLight position={[0, 0, 0]} intensity={5} color="#FFFFFF" distance={5} />
        
        <ParticleStream />
        <AICore />
      </Canvas>
    </div>
  );
}
