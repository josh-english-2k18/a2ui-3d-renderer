import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { RenderNode } from '../types';
import { FlatTreeRenderer } from './A2UINode';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface Renderer3DProps {
  layoutRoot: RenderNode | null;
}

const Rig: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      // Subtle parallax based on mouse
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        (state.mouse.x * Math.PI) / 80,
        0.05
      );
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        (state.mouse.y * Math.PI) / 80,
        0.05
      );
    }
  });
  return <group ref={group}>{children}</group>;
};

export const Renderer3D: React.FC<Renderer3DProps> = ({ layoutRoot }) => {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 900]} fov={60} near={10} far={3000} />
      
      {/* Background: Very dark slate blue/grey instead of pitch black */}
      <color attach="background" args={['#080a0c']} />
      
      {/* --- LIGHTING SETUP --- */}
      
      {/* 1. Ambient: Base visibility */}
      <ambientLight intensity={0.7} color="#ffffff" />
      
      {/* 2. Key Light: Strong Directional Light from Top-Left */}
      <directionalLight position={[-500, 800, 1000]} intensity={2.0} color="#ffffff" castShadow />
      
      {/* 3. Rim Light: Blueish Backlight to separate objects from background */}
      <spotLight position={[0, 500, -500]} angle={1} penumbra={1} intensity={1500} color="#4488ff" />
      
      {/* 4. Fill Light: Warm light from bottom right */}
      <pointLight position={[500, -500, 500]} intensity={200} color="#ffaa88" />

      {/* Parallax Rig */}
      <Rig>
        {layoutRoot && <FlatTreeRenderer root={layoutRoot} />}
      </Rig>

      {/* Post Processing - Subtle glow */}
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={0.5} radius={0.5} />
        <Noise opacity={0.03} />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
      </EffectComposer>
      
    </Canvas>
  );
};
