"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, PlaneGeometry, Color } from "three";
import { useTilesShallow } from '@/app/components/a2ui/game/store';

/**
 * WaterPlane Component
 *
 * Renders animated water surfaces for water tiles.
 * - Identifies all water tiles from store
 * - Creates plane geometry covering water areas
 * - Animated with sine wave vertex displacement
 * - Blue color with 70% opacity
 * - Position at Y = -0.05 (just below terrain)
 */
export function WaterPlane() {
  const meshRef = useRef<Mesh>(null);
  const tilesMap = useTilesShallow() as Record<string, { type: string; walkable: boolean; x: number; z: number }>;

  // Find all water tiles and create geometry for them
  const waterGeometry = useMemo(() => {
    const waterTiles: Array<{ x: number; z: number }> = [];

    // Collect all water tiles
    for (const key in tilesMap) {
      const tile = tilesMap[key];
      if (tile.type === "water") {
        waterTiles.push({ x: tile.x, z: tile.z });
      }
    }

    if (waterTiles.length === 0) {
      // No water tiles, return empty geometry
      return new PlaneGeometry(0, 0);
    }

    // For simplicity, create individual plane for each water tile
    // In production, this could be optimized to merge adjacent tiles
    // For now, we'll create a single large plane and position it
    // We'll create segmented plane to allow vertex animation
    const segmentsPerTile = 4; // More segments = smoother animation
    const totalSegments = Math.max(1, Math.floor(Math.sqrt(waterTiles.length)) * segmentsPerTile);

    // Find bounds of water tiles
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const tile of waterTiles) {
      minX = Math.min(minX, tile.x);
      maxX = Math.max(maxX, tile.x);
      minZ = Math.min(minZ, tile.z);
      maxZ = Math.max(maxZ, tile.z);
    }

    const waterWidth = maxX - minX + 1;
    const waterHeight = maxZ - minZ + 1;

    // Create segmented plane for animation
    const geometry = new PlaneGeometry(
      waterWidth,
      waterHeight,
      waterWidth * segmentsPerTile,
      waterHeight * segmentsPerTile
    );

    // Rotate to horizontal (plane is vertical by default)
    geometry.rotateX(-Math.PI / 2);

    // Center the geometry
    geometry.translate(
      minX + waterWidth / 2,
      0,
      minZ + waterHeight / 2
    );

    return geometry;
  }, [tilesMap]);

  // Animate water with sine waves
  useFrame((state) => {
    if (!meshRef.current || !meshRef.current.geometry.attributes.position) return;

    const time = state.clock.getElapsedTime();
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;

    // Early exit for empty geometry
    if (positions.length === 0) return;

    // Apply sine wave to Y coordinates
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      // Combine multiple sine waves for more natural motion
      const wave1 = Math.sin(time * 0.5 + x * 0.3) * 0.08;
      const wave2 = Math.sin(time * 0.7 + z * 0.4 + x * 0.2) * 0.05;
      const wave3 = Math.sin(time * 0.3 + (x + z) * 0.25) * 0.03;

      positions[i + 1] = wave1 + wave2 + wave3;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
    // Note: computeVertexNormals() removed for performance (5-10ms saved per frame)
    // Water looks fine with static normals from plane generation
  });

  // Dispose geometry on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      waterGeometry.dispose();
    };
  }, [waterGeometry]);

  // Check if we have water tiles
  const hasWater = useMemo(() => {
    return Object.values(tilesMap).some(tile => tile.type === "water");
  }, [tilesMap]);

  // Don't render if no water tiles
  if (!hasWater) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={waterGeometry}
      position={[0.5, -0.05, 0.5]} // Slightly below terrain
    >
      <meshStandardMaterial
        color={new Color(0x3498db)} // Blue water
        transparent
        opacity={0.7}
        roughness={0.1}
        metalness={0.6}
        envMapIntensity={1.5}
      />
    </mesh>
  );
}
