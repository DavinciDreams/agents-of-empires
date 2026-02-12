'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Checkpoint } from '../store/gameStore';

interface CheckpointMarkerProps {
  checkpoint: Checkpoint;
  isActive?: boolean;
  isCompleted?: boolean;
}

export function CheckpointMarker({ checkpoint, isActive, isCompleted }: CheckpointMarkerProps) {
  const markerRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  // Animate the marker
  useFrame((state) => {
    if (!markerRef.current) return;

    // Gentle bobbing animation
    markerRef.current.position.y = checkpoint.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;

    // Rotate ring for active checkpoints
    if (ringRef.current && isActive) {
      ringRef.current.rotation.y += 0.02;
    }

    // Pulse for active checkpoints
    if (pulseRef.current && isActive) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      pulseRef.current.scale.set(scale, scale, scale);
      const material = pulseRef.current.material;
      if (!Array.isArray(material)) {
        material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      }
    }
  });

  // Color based on status
  const color = useMemo(() => {
    if (isCompleted) return '#00FF88'; // Green
    if (isActive) return '#FFD700'; // Gold
    return '#4FC3F7'; // Blue
  }, [isActive, isCompleted]);

  return (
    <group ref={markerRef} position={checkpoint.position}>
      {/* Main marker sphere */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 0.5 : 0.2}
        />
      </mesh>

      {/* Rotating ring */}
      <mesh ref={ringRef} position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.05, 16, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Pulse effect for active checkpoints */}
      {isActive && (
        <mesh ref={pulseRef} position={[0, 1, 0]}>
          <ringGeometry args={[0.6, 0.8, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Base pillar */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Checkpoint number */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {checkpoint.stepNumber}
      </Text>

      {/* Status indicator */}
      {isCompleted && (
        <Text
          position={[0, 0.2, 0]}
          fontSize={0.4}
          color="#00FF88"
          anchorX="center"
          anchorY="middle"
        >
          ✓
        </Text>
      )}

      {/* Description (hover text) */}
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.15}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
        textAlign="center"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {checkpoint.description}
      </Text>
    </group>
  );
}
