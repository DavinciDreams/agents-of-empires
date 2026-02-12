'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// Attack Slash Effect
// ============================================================================

interface AttackSlashProps {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  color?: string;
  duration?: number;
  onComplete?: () => void;
}

export function AttackSlash({
  startPosition,
  endPosition,
  color = '#f39c12',
  duration = 300,
  onComplete,
}: AttackSlashProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());

  useFrame(() => {
    if (!meshRef.current) return;

    const elapsed = Date.now() - startTime.current;
    const progress = elapsed / duration;

    if (progress >= 1) {
      onComplete?.();
      return;
    }

    // Animate along the attack path
    const x = THREE.MathUtils.lerp(startPosition[0], endPosition[0], progress);
    const y = THREE.MathUtils.lerp(startPosition[1], endPosition[1], progress);
    const z = THREE.MathUtils.lerp(startPosition[2], endPosition[2], progress);

    meshRef.current.position.set(x, y, z);

    // Fade out
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 1 - progress;

    // Scale up then down for slash effect
    const scale = Math.sin(progress * Math.PI) * 1.5;
    meshRef.current.scale.set(scale, scale * 0.3, scale);
  });

  // Calculate rotation to face target
  const direction = useMemo(() => {
    const dir = new THREE.Vector3(
      endPosition[0] - startPosition[0],
      endPosition[1] - startPosition[1],
      endPosition[2] - startPosition[2]
    );
    return dir.normalize();
  }, [startPosition, endPosition]);

  const rotation = useMemo(() => {
    const angle = Math.atan2(direction.x, direction.z);
    return [0, angle, 0] as [number, number, number];
  }, [direction]);

  return (
    <mesh ref={meshRef} position={startPosition} rotation={rotation}>
      <planeGeometry args={[1.5, 0.3]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================================================
// Impact Effect (hit particles)
// ============================================================================

interface ImpactEffectProps {
  position: [number, number, number];
  color?: string;
  particleCount?: number;
  duration?: number;
  onComplete?: () => void;
}

export function ImpactEffect({
  position,
  color = '#ff6b6b',
  particleCount = 20,
  duration = 500,
  onComplete,
}: ImpactEffectProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const velocities = useRef<THREE.Vector3[]>([]);
  const startTime = useRef(Date.now());

  // Initialize particle velocities
  useMemo(() => {
    velocities.current = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 3;

      velocities.current.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.cos(phi) * speed,
          Math.sin(phi) * Math.sin(theta) * speed
        )
      );
    }
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const elapsed = Date.now() - startTime.current;
    if (elapsed > duration) {
      onComplete?.();
      return;
    }

    const progress = elapsed / duration;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const sizes = particlesRef.current.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const vel = velocities.current[i];

      // Update position with physics
      positions[i * 3] += vel.x * delta;
      positions[i * 3 + 1] += vel.y * delta - 9.8 * delta * progress; // Gravity
      positions[i * 3 + 2] += vel.z * delta;

      // Fade out
      sizes[i] = (1 - progress) * 0.3;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;

    // Update material opacity
    const material = particlesRef.current.material as THREE.PointsMaterial;
    material.opacity = 1 - progress;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position[0];
      positions[i * 3 + 1] = position[1];
      positions[i * 3 + 2] = position[2];
      sizes[i] = 0.3;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [particleCount, position]);

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.3}
        color={color}
        transparent
        opacity={1}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ============================================================================
// Damage Flash Effect
// ============================================================================

interface DamageFlashProps {
  targetRef: React.RefObject<THREE.Group | THREE.Mesh>;
  color?: string;
  duration?: number;
  onComplete?: () => void;
}

export function DamageFlash({
  targetRef,
  color = '#ff0000',
  duration = 200,
  onComplete,
}: DamageFlashProps) {
  const startTime = useRef(Date.now());
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  useFrame(() => {
    if (!targetRef.current) return;

    const elapsed = Date.now() - startTime.current;
    const progress = elapsed / duration;

    if (progress >= 1) {
      // Restore original materials
      targetRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && originalMaterials.current.has(child)) {
          child.material = originalMaterials.current.get(child)!;
        }
      });
      onComplete?.();
      return;
    }

    // Flash effect
    const flashIntensity = Math.sin(progress * Math.PI * 4) * (1 - progress);

    targetRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Store original material on first frame
        if (!originalMaterials.current.has(child)) {
          originalMaterials.current.set(child, child.material);
        }

        // Apply flash
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive.set(color);
            mat.emissiveIntensity = flashIntensity * 2;
          }
        });
      }
    });
  });

  return null;
}

// ============================================================================
// Projectile Attack (for ranged attacks)
// ============================================================================

interface ProjectileProps {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  color?: string;
  size?: number;
  speed?: number;
  onHit?: () => void;
}

export function Projectile({
  startPosition,
  endPosition,
  color = '#3498db',
  size = 0.3,
  speed = 10,
  onHit,
}: ProjectileProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hasHit, setHasHit] = React.useState(false);
  const startTime = useRef(Date.now());

  const distance = useMemo(() => {
    const dx = endPosition[0] - startPosition[0];
    const dy = endPosition[1] - startPosition[1];
    const dz = endPosition[2] - startPosition[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [startPosition, endPosition]);

  const duration = (distance / speed) * 1000; // Convert to ms

  useFrame(() => {
    if (!meshRef.current || hasHit) return;

    const elapsed = Date.now() - startTime.current;
    const progress = Math.min(elapsed / duration, 1);

    const x = THREE.MathUtils.lerp(startPosition[0], endPosition[0], progress);
    const y = THREE.MathUtils.lerp(startPosition[1], endPosition[1], progress);
    const z = THREE.MathUtils.lerp(startPosition[2], endPosition[2], progress);

    meshRef.current.position.set(x, y, z);

    // Add trail effect with scale
    meshRef.current.scale.setScalar(1 + Math.sin(elapsed * 0.02) * 0.2);

    if (progress >= 1 && !hasHit) {
      setHasHit(true);
      onHit?.();
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={startPosition}>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Glow effect */}
      <pointLight
        position={meshRef.current?.position.toArray() || startPosition}
        color={color}
        intensity={2}
        distance={3}
      />
    </>
  );
}

// ============================================================================
// Dragon Breath Attack Effect
// ============================================================================

interface DragonBreathProps {
  startPosition: [number, number, number];
  direction: [number, number, number];
  color?: string;
  duration?: number;
  onComplete?: () => void;
}

export function DragonBreath({
  startPosition,
  direction,
  color = '#ff6b00',
  duration = 800,
  onComplete,
}: DragonBreathProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const startTime = useRef(Date.now());
  const particleCount = 50;

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const elapsed = Date.now() - startTime.current;
    if (elapsed > duration) {
      onComplete?.();
      return;
    }

    const progress = elapsed / duration;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const sizes = particlesRef.current.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const particleProgress = (progress * particleCount - i) / particleCount;

      if (particleProgress > 0) {
        const spread = particleProgress * 2;
        positions[i * 3] = startPosition[0] + direction[0] * particleProgress * 5 + (Math.random() - 0.5) * spread;
        positions[i * 3 + 1] = startPosition[1] + direction[1] * particleProgress * 5 + (Math.random() - 0.5) * spread;
        positions[i * 3 + 2] = startPosition[2] + direction[2] * particleProgress * 5 + (Math.random() - 0.5) * spread;
        sizes[i] = (1 - particleProgress) * 0.5;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;

    const material = particlesRef.current.material as THREE.PointsMaterial;
    material.opacity = 1 - progress;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = startPosition[0];
      positions[i * 3 + 1] = startPosition[1];
      positions[i * 3 + 2] = startPosition[2];
      sizes[i] = 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [particleCount, startPosition]);

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.5}
        color={color}
        transparent
        opacity={1}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ============================================================================
// Combat Animation Manager Hook
// ============================================================================

export interface CombatAnimation {
  id: string;
  type: 'attack_slash' | 'impact' | 'projectile' | 'dragon_breath';
  startPosition: [number, number, number];
  endPosition?: [number, number, number];
  direction?: [number, number, number];
  color?: string;
  timestamp: number;
}

export function useCombatAnimations() {
  const [animations, setAnimations] = React.useState<CombatAnimation[]>([]);

  const addAttackSlash = React.useCallback(
    (start: [number, number, number], end: [number, number, number], color?: string) => {
      const id = `slash-${Date.now()}-${Math.random()}`;
      setAnimations((prev) => [
        ...prev,
        { id, type: 'attack_slash', startPosition: start, endPosition: end, color, timestamp: Date.now() },
      ]);
      return id;
    },
    []
  );

  const addImpact = React.useCallback(
    (position: [number, number, number], color?: string) => {
      const id = `impact-${Date.now()}-${Math.random()}`;
      setAnimations((prev) => [
        ...prev,
        { id, type: 'impact', startPosition: position, color, timestamp: Date.now() },
      ]);
      return id;
    },
    []
  );

  const addProjectile = React.useCallback(
    (start: [number, number, number], end: [number, number, number], color?: string) => {
      const id = `projectile-${Date.now()}-${Math.random()}`;
      setAnimations((prev) => [
        ...prev,
        { id, type: 'projectile', startPosition: start, endPosition: end, color, timestamp: Date.now() },
      ]);
      return id;
    },
    []
  );

  const addDragonBreath = React.useCallback(
    (start: [number, number, number], direction: [number, number, number], color?: string) => {
      const id = `breath-${Date.now()}-${Math.random()}`;
      setAnimations((prev) => [
        ...prev,
        { id, type: 'dragon_breath', startPosition: start, direction, color, timestamp: Date.now() },
      ]);
      return id;
    },
    []
  );

  const removeAnimation = React.useCallback((id: string) => {
    setAnimations((prev) => prev.filter((anim) => anim.id !== id));
  }, []);

  return {
    animations,
    addAttackSlash,
    addImpact,
    addProjectile,
    addDragonBreath,
    removeAnimation,
  };
}

// ============================================================================
// Combat Animation Renderer
// ============================================================================

interface CombatAnimationRendererProps {
  animations: CombatAnimation[];
  onAnimationComplete: (id: string) => void;
}

export function CombatAnimationRenderer({
  animations,
  onAnimationComplete,
}: CombatAnimationRendererProps) {
  return (
    <>
      {animations.map((anim) => {
        switch (anim.type) {
          case 'attack_slash':
            return (
              <AttackSlash
                key={anim.id}
                startPosition={anim.startPosition}
                endPosition={anim.endPosition!}
                color={anim.color}
                onComplete={() => onAnimationComplete(anim.id)}
              />
            );
          case 'impact':
            return (
              <ImpactEffect
                key={anim.id}
                position={anim.startPosition}
                color={anim.color}
                onComplete={() => onAnimationComplete(anim.id)}
              />
            );
          case 'projectile':
            return (
              <Projectile
                key={anim.id}
                startPosition={anim.startPosition}
                endPosition={anim.endPosition!}
                color={anim.color}
                onHit={() => onAnimationComplete(anim.id)}
              />
            );
          case 'dragon_breath':
            return (
              <DragonBreath
                key={anim.id}
                startPosition={anim.startPosition}
                direction={anim.direction!}
                color={anim.color}
                onComplete={() => onAnimationComplete(anim.id)}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
