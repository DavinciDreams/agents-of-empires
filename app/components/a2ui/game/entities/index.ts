// Entity Components for Agents of Empires
// This file exports all entity components for easy importing

// ============================================================================
// AgentPool Components
// ============================================================================

export {
  useAgentPool,
  InitialAgents,
  AgentSpawner,
} from './AgentPool';

// ============================================================================
// GameAgent Components
// ============================================================================

export {
  GameAgentVisual,
  InstancedAgentRenderer,
  LODAgentRenderer,
  AgentPool,
  useAgentMovement,
  AgentSpawnEffect,
} from './GameAgent';

// ============================================================================
// Dragon Components
// ============================================================================

export {
  DragonVisual,
  DragonPool,
  useCombat,
  DragonSpawnEffect,
} from './Dragon';

// ============================================================================
// Structure Components
// ============================================================================

export {
  StructureVisual,
  StructurePool,
  StructureSpawnEffect,
} from './Structure';

// ============================================================================
// ConnectionLines Components
// ============================================================================

export {
  ConnectionLines,
  useConnectionLines,
  ConnectionLegend,
} from './ConnectionLines';

// ============================================================================
// FileOperation Components
// ============================================================================

export {
  FileOperation,
  useFileOperations,
  FileOperationPool,
} from './FileOperation';
