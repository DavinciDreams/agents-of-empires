'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// Fireworks Particle System
// ============================================================================

interface FireworkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

interface FireworksProps {
  position: [number, number, number];
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

export function Fireworks({ position, count = 50, duration = 2000, onComplete }: FireworksProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const particles = useMemo<FireworkParticle[]>(() => {
    const p: FireworkParticle[] = [];
    const colors = [
      new THREE.Color('#f4d03f'), // Gold
      new THREE.Color('#e74c3c'), // Red
      new THREE.Color('#3498db'), // Blue
      new THREE.Color('#2ecc71'), // Green
      new THREE.Color('#9b59b6'), // Purple
      new THREE.Color('#f39c12'), // Orange
    ];

    for (let i = 0; i < count; i++) {
      // Random spherical distribution for explosion
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 3 + Math.random() * 5;

      p.push({
        position: new THREE.Vector3(position[0], position[1], position[2]),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.cos(phi) * speed * 1.5, // More upward velocity
          Math.sin(phi) * Math.sin(theta) * speed
        ),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 0.5 + Math.random() * 1.5,
        size: 0.2 + Math.random() * 0.3,
      });
    }
    return p;
  }, [position, count]);

  const startTime = useRef(Date.now());

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const elapsed = Date.now() - startTime.current;
    if (elapsed > duration) {
      onComplete?.();
      return;
    }

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;
    const sizes = particlesRef.current.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];

      // Update physics
      particle.velocity.y -= 9.8 * delta * 0.5; // Gravity
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      particle.life -= delta / particle.maxLife;

      // Update buffers
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      const alpha = Math.max(0, particle.life);
      colors[i * 3] = particle.color.r;
      colors[i * 3 + 1] = particle.color.g;
      colors[i * 3 + 2] = particle.color.b;

      sizes[i] = particle.size * alpha;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.color.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position[0];
      positions[i * 3 + 1] = position[1];
      positions[i * 3 + 2] = position[2];

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      sizes[i] = 0.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [count, position]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  return <points ref={particlesRef} geometry={geometry} material={material} />;
}

// ============================================================================
// Floating Text Effect
// ============================================================================

interface FloatingTextProps {
  position: [number, number, number];
  text: string;
  color?: string;
  duration?: number;
  onComplete?: () => void;
}

export function FloatingText({
  position,
  text,
  color = '#f4d03f',
  duration = 2000,
  onComplete,
}: FloatingTextProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const startY = position[1];

  useFrame(() => {
    if (!groupRef.current) return;

    const elapsed = Date.now() - startTime.current;
    if (elapsed > duration) {
      onComplete?.();
      return;
    }

    const progress = elapsed / duration;
    const y = startY + progress * 3; // Float up 3 units
    const scale = 1 + Math.sin(progress * Math.PI) * 0.3; // Pulse effect
    const opacity = 1 - progress;

    groupRef.current.position.y = y;
    groupRef.current.scale.setScalar(scale);
    if (groupRef.current.children[0]) {
      (groupRef.current.children[0] as any).material.opacity = opacity;
    }
  });

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      <mesh>
        <planeGeometry args={[2, 0.8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Text would be rendered via HTML overlay in actual implementation */}
    </group>
  );
}

// ============================================================================
// Victory Celebration Effect (combines fireworks + text)
// ============================================================================

interface VictoryCelebrationProps {
  position: [number, number, number];
  text?: string;
  onComplete?: () => void;
}

export function VictoryCelebration({
  position,
  text = 'VICTORY!',
  onComplete,
}: VictoryCelebrationProps) {
  const [showFireworks, setShowFireworks] = React.useState(true);
  const [showText, setShowText] = React.useState(true);
  const completedCount = useRef(0);

  const handleComplete = () => {
    completedCount.current += 1;
    if (completedCount.current >= 2) {
      // Both effects completed
      onComplete?.();
    }
  };

  return (
    <group>
      {showFireworks && (
        <Fireworks
          position={position}
          count={80}
          duration={2000}
          onComplete={() => {
            setShowFireworks(false);
            handleComplete();
          }}
        />
      )}
      {showText && (
        <FloatingText
          position={[position[0], position[1] + 1, position[2]]}
          text={text}
          color="#f4d03f"
          duration={2000}
          onComplete={() => {
            setShowText(false);
            handleComplete();
          }}
        />
      )}
    </group>
  );
}

// ============================================================================
// Goal Completion Fanfare
// ============================================================================

interface GoalCompletionFanfareProps {
  position: [number, number, number];
  onComplete?: () => void;
}

export function GoalCompletionFanfare({ position, onComplete }: GoalCompletionFanfareProps) {
  return (
    <group>
      {/* Multiple firework bursts */}
      <Fireworks position={position} count={100} duration={2500} />
      <Fireworks
        position={[position[0] + 2, position[1], position[2] + 2]}
        count={60}
        duration={2500}
      />
      <Fireworks
        position={[position[0] - 2, position[1], position[2] - 2]}
        count={60}
        duration={2500}
        onComplete={onComplete}
      />

      {/* Rising stars effect */}
      <FloatingText
        position={[position[0], position[1] + 2, position[2]]}
        text="★ QUEST COMPLETE ★"
        color="#f39c12"
        duration={2500}
      />
    </group>
  );
}

// ============================================================================
// Loot Drop Effect
// ============================================================================

interface LootDropProps {
  position: [number, number, number];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export function LootDrop({ position, rarity }: LootDropProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());

  const rarityColors = {
    common: '#95a5a6',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f4d03f',
  };

  useFrame(() => {
    if (!meshRef.current) return;

    const elapsed = Date.now() - startTime.current;
    const bounce = Math.abs(Math.sin(elapsed * 0.005)) * 0.3 + 0.2;
    const rotate = elapsed * 0.002;

    meshRef.current.position.y = position[1] + bounce;
    meshRef.current.rotation.y = rotate;
  });

  return (
    <group>
      <mesh ref={meshRef} position={[position[0], position[1] + 1, position[2]]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={rarityColors[rarity]}
          emissive={rarityColors[rarity]}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Glow effect */}
      <pointLight
        position={[position[0], position[1] + 1, position[2]]}
        color={rarityColors[rarity]}
        intensity={2}
        distance={5}
      />
    </group>
  );
}
