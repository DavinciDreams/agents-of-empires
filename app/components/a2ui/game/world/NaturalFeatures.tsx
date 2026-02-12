"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, Color, Matrix4, Quaternion, Euler } from "three";
import { useTilesShallow } from '@/app/components/a2ui/game/store';

// ============================================================================
// Seeded Random for Consistent Feature Placement
// ============================================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// ============================================================================
// Feature Placement Types
// ============================================================================

interface Feature {
  position: [number, number, number]; // x, y (height), z
  rotation: number; // y-axis rotation
  scale: number;
}

// ============================================================================
// Generate Feature Positions
// ============================================================================

function generateFeatures(
  tiles: Record<string, { x: number; z: number; type: string; walkable: boolean; height?: number }>,
  seed: number
): { trees: Feature[]; rocks: Feature[] } {
  const random = new SeededRandom(seed);
  const trees: Feature[] = [];
  const rocks: Feature[] = [];

  // Placement rules
  const TREE_DENSITY = 0.015; // ~37 trees for 50x50 grid (2500 tiles)
  const ROCK_DENSITY = 0.012; // ~30 rocks for 50x50 grid
  const MIN_TREE_SPACING = 4; // units apart
  const MIN_ROCK_SPACING = 3; // units apart
  const ROCK_CLUSTERING_CHANCE = 0.7; // 70% chance to place near another rock

  // Convert tiles to array for iteration
  const tileArray = Object.values(tiles);

  // === TREE PLACEMENT ===
  // Place in grass biomes with lower elevation
  const treeCandidates = tileArray.filter(
    (tile) => tile.type === "grass" && (tile.height ?? 0) < 2.5
  );

  for (const tile of treeCandidates) {
    if (random.next() < TREE_DENSITY) {
      const x = tile.x + 0.5 + random.nextInRange(-0.3, 0.3);
      const z = tile.z + 0.5 + random.nextInRange(-0.3, 0.3);
      const height = tile.height ?? 0;

      // Check minimum spacing
      const tooClose = trees.some((tree) => {
        const dx = tree.position[0] - x;
        const dz = tree.position[2] - z;
        return Math.sqrt(dx * dx + dz * dz) < MIN_TREE_SPACING;
      });

      if (!tooClose) {
        trees.push({
          position: [x, height, z],
          rotation: random.nextInRange(0, Math.PI * 2),
          scale: random.nextInRange(0.8, 1.2),
        });
      }
    }
  }

  // === ROCK PLACEMENT ===
  // Place in stone/dirt biomes with higher elevation
  const rockCandidates = tileArray.filter(
    (tile) => (tile.type === "stone" || tile.type === "dirt") && (tile.height ?? 0) > 2.0
  );

  let lastRockPosition: [number, number, number] | null = null;

  for (const tile of rockCandidates) {
    let shouldPlace = false;
    let x = tile.x + 0.5;
    let z = tile.z + 0.5;

    // Clustering logic
    if (lastRockPosition && random.next() < ROCK_CLUSTERING_CHANCE) {
      // Place near last rock
      x = lastRockPosition[0] + random.nextInRange(-2, 2);
      z = lastRockPosition[2] + random.nextInRange(-2, 2);
      shouldPlace = true;
    } else if (random.next() < ROCK_DENSITY) {
      // Random placement
      x = tile.x + 0.5 + random.nextInRange(-0.4, 0.4);
      z = tile.z + 0.5 + random.nextInRange(-0.4, 0.4);
      shouldPlace = true;
    }

    if (shouldPlace) {
      const height = tile.height ?? 0;

      // Check minimum spacing
      const tooClose = rocks.some((rock) => {
        const dx = rock.position[0] - x;
        const dz = rock.position[2] - z;
        return Math.sqrt(dx * dx + dz * dz) < MIN_ROCK_SPACING;
      });

      if (!tooClose) {
        const rock: Feature = {
          position: [x, height, z],
          rotation: random.nextInRange(0, Math.PI * 2),
          scale: random.nextInRange(0.5, 1.5),
        };
        rocks.push(rock);
        lastRockPosition = rock.position;
      }
    }
  }

  // Cap counts to target range
  const finalTrees = trees.slice(0, 50); // Max 50 trees
  const finalRocks = rocks.slice(0, 35); // Max 35 rocks

  return { trees: finalTrees, rocks: finalRocks };
}

// ============================================================================
// Tree Component (Trunk + Foliage)
// ============================================================================

interface TreesProps {
  trees: Feature[];
}

function Trees({ trees }: TreesProps) {
  const trunkMeshRef = useRef<InstancedMesh>(null);
  const foliageMeshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    if (!trunkMeshRef.current || !foliageMeshRef.current) return;

    const trunkColor = new Color("#8b6f47"); // Brown
    const foliageColor = new Color("#27ae60"); // Green

    trees.forEach((tree, index) => {
      const [x, y, z] = tree.position;

      // Trunk
      dummy.position.set(x, y + 1, z); // Trunk height offset
      dummy.rotation.y = tree.rotation;
      dummy.scale.set(tree.scale, tree.scale, tree.scale);
      dummy.updateMatrix();
      trunkMeshRef.current!.setMatrixAt(index, dummy.matrix);
      trunkMeshRef.current!.setColorAt(index, trunkColor);

      // Foliage (on top of trunk)
      dummy.position.set(x, y + 2.5, z); // Foliage height offset
      dummy.rotation.y = tree.rotation + Math.PI / 8; // Slight rotation offset
      dummy.scale.set(tree.scale, tree.scale, tree.scale);
      dummy.updateMatrix();
      foliageMeshRef.current!.setMatrixAt(index, dummy.matrix);
      foliageMeshRef.current!.setColorAt(index, foliageColor);
    });

    trunkMeshRef.current.instanceMatrix.needsUpdate = true;
    if (trunkMeshRef.current.instanceColor) {
      trunkMeshRef.current.instanceColor.needsUpdate = true;
    }
    foliageMeshRef.current.instanceMatrix.needsUpdate = true;
    if (foliageMeshRef.current.instanceColor) {
      foliageMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, [trees, dummy]);

  if (trees.length === 0) return null;

  return (
    <group>
      {/* Tree Trunks */}
      <instancedMesh
        ref={trunkMeshRef}
        args={[undefined, undefined, trees.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.2, 0.25, 2, 8]} />
        <meshStandardMaterial />
      </instancedMesh>

      {/* Tree Foliage */}
      <instancedMesh
        ref={foliageMeshRef}
        args={[undefined, undefined, trees.length]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[1, 2, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
    </group>
  );
}

// ============================================================================
// Rock Component
// ============================================================================

interface RocksProps {
  rocks: Feature[];
}

function Rocks({ rocks }: RocksProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;

    const rockColor = new Color("#7f8c8d"); // Stone gray
    const random = new SeededRandom(42); // For slight color variation

    rocks.forEach((rock, index) => {
      const [x, y, z] = rock.position;

      // Position rocks slightly into the ground for natural look
      dummy.position.set(x, y + 0.3, z);
      dummy.rotation.set(
        random.nextInRange(-0.2, 0.2),
        rock.rotation,
        random.nextInRange(-0.2, 0.2)
      );
      dummy.scale.set(rock.scale, rock.scale, rock.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(index, dummy.matrix);

      // Slight color variation
      const colorVariation = rockColor.clone();
      colorVariation.offsetHSL(0, 0, random.nextInRange(-0.05, 0.05));
      meshRef.current!.setColorAt(index, colorVariation);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [rocks, dummy]);

  if (rocks.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, rocks.length]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

// ============================================================================
// Main Natural Features Component
// ============================================================================

export function NaturalFeatures() {
  const tiles = useTilesShallow() as Record<
    string,
    { x: number; z: number; type: string; walkable: boolean; height?: number }
  >;

  // Generate features once when tiles are ready
  const features = useMemo(() => {
    if (Object.keys(tiles).length === 0) {
      return { trees: [], rocks: [] };
    }
    return generateFeatures(tiles, 12345); // Use same seed as terrain for consistency
  }, [tiles]);

  // Don't render until tiles are loaded
  if (Object.keys(tiles).length === 0) {
    return null;
  }

  return (
    <group name="natural-features">
      <Trees trees={features.trees} />
      <Rocks rocks={features.rocks} />
    </group>
  );
}
