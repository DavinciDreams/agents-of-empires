// ============================================================================
// World Components
// ============================================================================

// Terrain generation and management
export {
  Terrain,
  generateTerrain,
  getBiomeAtPosition,
  type TerrainConfig,
  type Biome,
} from "./Terrain";

// World management and pathfinding
export {
  WorldGrid,
  TerrainTile,
  findPath,
  useWorldManager,
  GroundPlane,
  type PathNode,
} from "./WorldManager";
