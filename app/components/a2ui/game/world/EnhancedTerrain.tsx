"use client";

import { useMemo, useRef, useEffect } from "react";
import { BufferGeometry, Float32BufferAttribute, Color, Mesh } from "three";
import { useTilesShallow, useGameStore } from '@/app/components/a2ui/game/store';

interface EnhancedTerrainProps {
  width?: number;
  height?: number;
}

/**
 * EnhancedTerrain Component
 *
 * Renders smooth heightmap terrain using BufferGeometry with vertex colors.
 * - Reads tile data from store including height values
 * - Generates continuous mesh with proper triangulation
 * - Colors based on height bands (biomes)
 * - Receives shadows from agents/structures
 * - Visual only - pathfinding remains at Y=0
 */
export function EnhancedTerrain({ width = 50, height = 50 }: EnhancedTerrainProps) {
  const meshRef = useRef<Mesh>(null);
  const tilesMap = useTilesShallow() as Record<string, { type: string; walkable: boolean; x: number; z: number; height?: number }>;

  // Initialize tiles if not already done
  useEffect(() => {
    const state = useGameStore.getState();
    if (Object.keys(state.tiles).length === 0) {
      state.initializeWorld(width, height);
    }
  }, [width, height]);

  // Generate terrain geometry from tile height data
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();

    // We need (width+1) x (height+1) vertices to cover all tiles
    const vertexCount = (width + 1) * (height + 1);
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Helper to get height at a position
    const getHeightAt = (x: number, z: number): number => {
      const key = `${Math.floor(x)},${Math.floor(z)}`;
      const tile = tilesMap[key];
      return tile?.height ?? 0;
    };

    // Helper to get color based on height
    const getColorForHeight = (h: number): Color => {
      // Height-based biome colors
      if (h < 1.0) {
        // Low grass - #2ecc71
        return new Color(0x2ecc71);
      } else if (h < 2.5) {
        // Forest green - #27ae60
        return new Color(0x27ae60);
      } else if (h < 3.5) {
        // Dirt brown - #8b6f47
        return new Color(0x8b6f47);
      } else {
        // Stone gray - #7f8c8d
        return new Color(0x7f8c8d);
      }
    };

    // Generate vertices and colors
    for (let z = 0; z <= height; z++) {
      for (let x = 0; x <= width; x++) {
        const heightValue = getHeightAt(x, z);

        // Position: x, height, z
        vertices.push(x, heightValue, z);

        // Color based on height
        const color = getColorForHeight(heightValue);
        colors.push(color.r, color.g, color.b);
      }
    }

    // Generate indices for triangles (two triangles per quad)
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const topLeft = z * (width + 1) + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * (width + 1) + x;
        const bottomRight = bottomLeft + 1;

        // First triangle (top-left, bottom-left, top-right)
        indices.push(topLeft, bottomLeft, topRight);

        // Second triangle (top-right, bottom-left, bottom-right)
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }

    // Set attributes
    geo.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);

    // Compute normals for proper lighting
    geo.computeVertexNormals();

    return geo;
  }, [tilesMap, width, height]);

  // Dispose geometry on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      receiveShadow
      position={[0.5, 0, 0.5]} // Center the terrain on tiles
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}
