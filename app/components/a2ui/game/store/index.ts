// ============================================================================
// Store Export
// ============================================================================

export { useGameStore } from "./gameStore";

// ============================================================================
// Types Export
// ============================================================================

export type {
  AgentState,
  ToolType,
  Rarity,
  Tool,
  GameAgent,
  DragonType,
  Dragon,
  StructureType,
  Structure,
  QuestStatus,
  Quest,
  QuestlineStatus,
  Questline,
  TileType,
  Tile,
  FormationType,
  Party,
} from "./gameStore";

// ============================================================================
// Selector Hooks Export
// ============================================================================

export {
  // Count selectors
  useAgentCount,
  useDragonCount,
  useStructureCount,
  useQuestCount,
  useCompletedQuestCount,
  usePartyCount,

  // Agent selectors
  useAgent,
  useSelectedAgentIds,
  useAgentsMap,
  useAgentsShallow,

  // Dragon selectors
  useDragonsShallow,

  // Structure selectors
  useStructuresShallow,

  // Quest selectors
  useQuestsShallow,

  // Tile selectors
  useTilesShallow,

  // Party selectors
  usePartiesMap,
  usePartiesShallow,

  // Selection selectors
  useSelection,

  // Camera selectors
  useCameraPosition,
  useCameraTarget,
  useZoom,
  useSetCameraPosition,
  useSetCameraTarget,
  useSetZoom,
  useCameraRotation,
  useCameraRotationTarget,
  useCameraElevation,
  useCameraElevationTarget,
  useSetCameraRotation,
  useSetCameraElevation,
} from "./gameStore";
