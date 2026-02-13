import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import { enableMapSet } from "immer";
import type { BackendType, AgentMiddlewareConfig } from "../bridge/agentConfigTypes";
import type { TPMJSTool, TPMJSSearchResult, TPMJSListOptions } from "@/app/lib/tpmjs-client";
import { getTPMJSClient } from "@/app/lib/tpmjs-client";

// Enable Immer's MapSet plugin for Set/Map support
enableMapSet();

// ============================================================================
// Types
// ============================================================================

export type AgentState = "IDLE" | "THINKING" | "MOVING" | "WORKING" | "ERROR" | "COMPLETING" | "COMBAT";

export type ToolType =
  | "search"
  | "code_executor"
  | "file_reader"
  | "file_writer"
  | "web_fetcher"
  | "subagent"
  | "grep"
  | "glob"
  | "edit"
  | "bash"
  | "tpmjs_generic";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Tool {
  id: string;
  name: string;
  type: ToolType;
  icon: string;
  description: string;
  rarity: Rarity;
  power?: number; // Optional power stat for gameplay
  cooldownTime?: number; // Cooldown duration in milliseconds (e.g., 5000 for 5 seconds)
  lastUsed?: number; // Timestamp of last use
  mastery?: number; // Tool mastery level (0-100)
  experience?: number; // Experience points for this tool
}

export interface GameAgent {
  id: string;
  name: string;
  position: [number, number, number];
  targetPosition: [number, number, number] | null;
  state: AgentState;
  level: number;
  health: number;
  maxHealth: number;
  equippedTool: Tool | null;
  inventory: Tool[];
  currentTask: string;
  agentRef: any; // Reference to Deep Agent
  parentId: string | null; // For subagents
  childrenIds: string[]; // For tracking spawned subagents
  thoughtBubble: string | null;
  speechBubble: {
    message: string;
    targetAgentId?: string; // If present, shows "→ AgentName: message"
    timestamp: number;
  } | null;
  lastToolCall: string | null;
  lastMove?: number;
  thinkStart?: number | null;
  workStart?: number | null;
  completeStart?: number | null;
  partyId: string | null; // Party membership
  currentPath: [number, number][] | null; // Pathfinding path
  pathIndex: number; // Current index in path

  // Checkpoint-based execution
  currentQuestId?: string;
  currentCheckpointId?: string;
  currentStepDescription?: string;

  // Token tracking
  tokenUsage?: {
    total: number;
    thisStep: number;
    cost: number; // USD estimate
  };

  // Progress tracking
  executionProgress?: {
    currentStep: number;
    totalSteps: number;
    percentComplete: number;
    startedAt: number;
    estimatedCompletion?: number;
  };
}

export type DragonType = "SYNTAX" | "RUNTIME" | "NETWORK" | "PERMISSION" | "UNKNOWN";

export interface Dragon {
  id: string;
  type: DragonType;
  position: [number, number, number];
  health: number;
  maxHealth: number;
  error: string;
  targetAgentId: string | null;
}

export type StructureType = "castle" | "tower" | "workshop" | "campfire" | "base";

export type LogLevel = "info" | "warn" | "error" | "debug" | "success";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  source?: string; // e.g., "client", "server", "api"
}

export interface Structure {
  id: string;
  type: StructureType;
  position: [number, number, number];
  name: string;
  description: string;
  goalId?: string;
}

export type QuestStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  targetStructureId: string | null;
  requiredAgents: number;
  assignedAgentIds: string[];
  rewards: string[];
  questlineId?: string; // Reference to parent questline
  prerequisiteQuestIds?: string[]; // Quests that must be completed first
  position?: number; // Position within questline sequence

  // Checkpoint-based quests
  checkpointIds?: string[]; // List of checkpoint IDs for this quest
  estimatedTokens?: number; // Total estimated tokens for quest
  actualTokens?: number; // Total actual tokens used
}

export type QuestlineStatus = "not_started" | "in_progress" | "completed" | "failed";

export interface Questline {
  id: string;
  name: string;
  description: string;
  status: QuestlineStatus;
  questIds: string[]; // Ordered array of quest IDs
  currentQuestIndex: number; // Which quest is currently active
  requiredCompletedQuests: number; // How many quests needed to complete questline
}

export type TileType = "grass" | "dirt" | "stone" | "water" | "path";

export interface Tile {
  x: number;
  z: number;
  type: TileType;
  walkable: boolean;
  height?: number; // Visual height (0-4 units) - doesn't affect pathfinding
}

export type FormationType = "line" | "wedge" | "column" | "box" | "circle" | "free";

export interface Party {
  id: string;
  name: string;
  memberIds: string[];
  formation: FormationType;
  leaderId: string | null;
  createdAt: number;
  color: string; // For UI identification
  sharedResources: {
    tools: Tool[]; // Tools accessible to all party members
    lastUpdated: number; // Timestamp of last resource change
  };
}

export type CheckpointStatus = "pending" | "active" | "completed" | "failed";

export interface Checkpoint {
  id: string;
  questId: string;
  stepNumber: number;
  description: string; // What the agent should do
  position: [number, number, number]; // Map position
  status: CheckpointStatus;
  estimatedTokens?: number;
  actualTokens?: number;
  completedAt?: number;
  result?: string; // Output from this step
}

// ============================================================================
// TPMJS Helper Functions
// ============================================================================

/**
 * Convert TPMJS category to game ToolType
 */
function inferToolType(category: string): ToolType {
  const categoryLower = category.toLowerCase();

  // Search/Query tools
  if (
    categoryLower.includes('search') ||
    categoryLower.includes('query') ||
    categoryLower.includes('lookup') ||
    categoryLower.includes('find') ||
    categoryLower.includes('discover') ||
    categoryLower.includes('index')
  ) return 'search';

  // Code execution tools
  if (
    categoryLower.includes('code') ||
    categoryLower.includes('execute') ||
    categoryLower.includes('run') ||
    categoryLower.includes('compile') ||
    categoryLower.includes('interpreter') ||
    categoryLower.includes('runtime') ||
    categoryLower.includes('sandbox')
  ) return 'code_executor';

  // File reading tools
  if (
    (categoryLower.includes('file') && categoryLower.includes('read')) ||
    categoryLower.includes('viewer') ||
    categoryLower.includes('reader') ||
    categoryLower.includes('parse') ||
    categoryLower.includes('load')
  ) return 'file_reader';

  // File writing tools
  if (
    (categoryLower.includes('file') && (categoryLower.includes('write') || categoryLower.includes('create'))) ||
    categoryLower.includes('writer') ||
    categoryLower.includes('save') ||
    categoryLower.includes('store') ||
    categoryLower.includes('persist')
  ) return 'file_writer';

  // Web fetching tools
  if (
    categoryLower.includes('web') ||
    categoryLower.includes('http') ||
    categoryLower.includes('fetch') ||
    categoryLower.includes('curl') ||
    categoryLower.includes('request') ||
    categoryLower.includes('api') ||
    categoryLower.includes('rest') ||
    categoryLower.includes('scrape') ||
    categoryLower.includes('crawl')
  ) return 'web_fetcher';

  // Grep/pattern matching tools
  if (
    categoryLower.includes('grep') ||
    categoryLower.includes('pattern') ||
    categoryLower.includes('regex') ||
    categoryLower.includes('match') ||
    categoryLower.includes('filter')
  ) return 'grep';

  // Glob/file matching tools
  if (
    categoryLower.includes('glob') ||
    categoryLower.includes('wildcard') ||
    categoryLower.includes('path')
  ) return 'glob';

  // Edit/modify tools
  if (
    categoryLower.includes('edit') ||
    categoryLower.includes('modify') ||
    categoryLower.includes('update') ||
    categoryLower.includes('patch') ||
    categoryLower.includes('transform')
  ) return 'edit';

  // Bash/shell tools
  if (
    categoryLower.includes('bash') ||
    categoryLower.includes('shell') ||
    categoryLower.includes('terminal') ||
    categoryLower.includes('command') ||
    categoryLower.includes('cli')
  ) return 'bash';

  // Agent/subagent tools
  if (
    categoryLower.includes('agent') ||
    categoryLower.includes('subagent') ||
    categoryLower.includes('task') ||
    categoryLower.includes('workflow') ||
    categoryLower.includes('orchestration')
  ) return 'subagent';

  // Fallback to generic TPMJS tool
  return 'tpmjs_generic';
}

/**
 * Get icon emoji based on category
 */
function getCategoryIcon(category: string): string {
  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('search')) return '🔍';
  if (categoryLower.includes('code')) return '⚙️';
  if (categoryLower.includes('file') && categoryLower.includes('read')) return '📖';
  if (categoryLower.includes('file') && categoryLower.includes('write')) return '✏️';
  if (categoryLower.includes('web') || categoryLower.includes('http')) return '🌐';
  if (categoryLower.includes('data')) return '📊';
  if (categoryLower.includes('ai') || categoryLower.includes('ml')) return '🤖';
  if (categoryLower.includes('image')) return '🖼️';
  if (categoryLower.includes('audio')) return '🔊';
  if (categoryLower.includes('video')) return '🎥';
  if (categoryLower.includes('text')) return '📝';
  if (categoryLower.includes('database')) return '🗄️';
  if (categoryLower.includes('api')) return '🔌';
  if (categoryLower.includes('tool')) return '🔧';

  return '⚡'; // Default icon
}

/**
 * Map quality score to rarity
 */
function getQualityRarity(score: number): Rarity {
  if (score >= 90) return 'legendary';
  if (score >= 70) return 'epic';
  if (score >= 50) return 'rare';
  return 'common';
}

/**
 * Convert TPMJS tool to game Tool format
 */
function convertTPMJSToolToGameTool(tpmjsTool: TPMJSTool, contextId: string): Tool {
  return {
    id: `tpmjs-${tpmjsTool.package}-${tpmjsTool.toolName}`,
    name: `${tpmjsTool.package}/${tpmjsTool.toolName}`,
    type: inferToolType(tpmjsTool.category),
    icon: getCategoryIcon(tpmjsTool.category),
    description: tpmjsTool.description,
    rarity: getQualityRarity(tpmjsTool.qualityScore),
    power: Math.floor(tpmjsTool.qualityScore / 10),
    cooldownTime: 2000,
    mastery: 0,
    experience: 0,
  };
}

// ============================================================================
// Store State
// ============================================================================

interface GameState {
  // World
  worldSize: { width: number; height: number };
  tiles: Record<string, Tile>;

  // Agents
  agents: Record<string, GameAgent>;
  selectedAgentIds: Set<string>;
  agentCount: number; // Cached count for UI

  // Parties
  parties: Record<string, Party>;
  partyCount: number; // Cached count for UI

  // Dragons (errors)
  dragons: Record<string, Dragon>;
  dragonCount: number; // Cached count for UI

  // Structures
  structures: Record<string, Structure>;
  structureCount: number; // Cached count for UI

  // Quests
  quests: Record<string, Quest>;
  questCount: number; // Cached count for UI
  completedQuestCount: number; // Cached count for UI

  // Questlines
  questlines: Record<string, Questline>;
  activeQuestlineId: string | null;

  // Checkpoints
  checkpoints: Record<string, Checkpoint>;

  // Camera
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  zoom: number;
  cameraRotation: number; // Rotation angle around Y axis in radians
  cameraRotationTarget: number; // Target rotation for smooth transitions
  cameraElevation: number; // Elevation angle from horizontal in radians
  cameraElevationTarget: number; // Target elevation for smooth transitions

  // UI State
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  dragEnd: { x: number; y: number } | null;
  selectionBox: { startX: number; startY: number; endX: number; endY: number; active: boolean } | null;
  hoverAgentId: string | null;
  hoverStructureId: string | null;
  selectedStructureId: string | null;
  contextMenuOpen: boolean;
  contextMenuPosition: { x: number; y: number } | null;
  contextMenuAgentId: string | null;

  // Active goals
  activeGoalId: string | null;

  // Victory Effects
  victoryEffects: Array<{
    id: string;
    position: [number, number, number];
    type: 'combat' | 'goal';
    timestamp: number;
  }>;

  // Combat Animations
  combatAnimations: Array<{
    id: string;
    type: 'attack_slash' | 'impact' | 'projectile' | 'dragon_breath';
    startPosition: [number, number, number];
    endPosition?: [number, number, number];
    direction?: [number, number, number];
    color?: string;
    timestamp: number;
  }>;

  // Agent Middleware Configuration
  backendConfig: {
    type: BackendType;
    initialized: boolean;
  };
  agentMiddleware: AgentMiddlewareConfig | null;

  // Tutorial System
  tutorialState: {
    enabled: boolean;
    currentStep: number;
    completedSteps: Set<string>;
  };

  // Logs
  logs: LogEntry[];
  maxLogs: number; // Maximum number of logs to keep
  logsVisible: boolean; // Toggle logs panel visibility

  // TPMJS Integration
  tpmjsCache: Record<string, TPMJSTool>;
  installedTPMJSTools: Set<string>; // Set of "package/toolName"
  tpmjsSearchResults: TPMJSTool[];
  tpmjsLoading: boolean;
  tpmjsError: string | null;
}

// ============================================================================
// Store Actions
// ============================================================================

interface GameActions {
  // World
  initializeWorld: (width: number, height: number) => void;
  setTile: (x: number, z: number, tile: Partial<Tile>) => void;

  // Agents
  spawnAgent: (
    name: string,
    position: [number, number, number],
    agentRef?: any,
    parentId?: string
  ) => GameAgent;
  spawnAgentBatch: (
    count: number,
    basePosition?: [number, number, number],
    pattern?: "random" | "grid" | "circle"
  ) => GameAgent[];
  removeAgent: (id: string) => void;
  updateAgent: (id: string, updates: Partial<GameAgent>) => void;
  setAgentState: (id: string, state: AgentState) => void;
  setAgentPosition: (id: string, position: [number, number, number]) => void;
  setAgentTarget: (id: string, target: [number, number, number]) => void;
  setAgentPath: (id: string, path: [number, number][]) => void;
  equipTool: (agentId: string, tool: Tool) => void;
  unequipTool: (agentId: string) => void;
  addToolToInventory: (agentId: string, tool: Tool) => void;
  useTool: (agentId: string) => void;
  getToolCooldownPercent: (tool: Tool) => number;
  isToolOnCooldown: (tool: Tool) => boolean;
  gainToolExperience: (agentId: string, toolId: string, amount: number) => void;
  setThoughtBubble: (agentId: string, thought: string | null) => void;
  setSpeechBubble: (
    agentId: string,
    message: string,
    targetAgentId?: string,
    duration?: number
  ) => void;
  handleAgentCommunication: (
    fromAgentId: string,
    toAgentId: string,
    message: string
  ) => void;
  broadcastToParty: (partyId: string, fromAgentId: string, message: string) => void;

  // Selection
  selectAgent: (id: string) => void;
  deselectAgent: (id: string) => void;
  toggleAgentSelection: (id: string) => void;
  selectAgentsInBox: (
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number
  ) => void;
  clearSelection: () => void;
  selectAllAgents: () => void;

  // Parties
  createParty: (name: string, memberIds: string[], leaderId?: string) => Party;
  addToParty: (partyId: string, agentId: string) => void;
  removeFromParty: (partyId: string, agentId: string) => void;
  disbandParty: (partyId: string) => void;
  setPartyFormation: (partyId: string, formation: FormationType) => void;
  setPartyLeader: (partyId: string, leaderId: string) => void;
  moveParty: (partyId: string, targetPosition: [number, number, number]) => void;
  addToolToPartyShared: (partyId: string, tool: Tool) => void;
  removeToolFromPartyShared: (partyId: string, toolId: string) => void;

  // Dragons
  spawnDragon: (
    type: DragonType,
    position: [number, number, number],
    error: string,
    targetAgentId: string
  ) => Dragon;
  removeDragon: (id: string) => void;
  updateDragon: (id: string, updates: Partial<Dragon>) => void;
  damageDragon: (id: string, damage: number) => void;

  // Structures
  addStructure: (structure: Omit<Structure, "id">) => Structure;
  removeStructure: (id: string) => void;
  updateStructure: (id: string, updates: Partial<Structure>) => void;

  // Quests
  addQuest: (quest: Omit<Quest, "id">) => Quest;
  updateQuest: (id: string, updates: Partial<Quest>) => void;
  assignQuestToAgents: (questId: string, agentIds: string[]) => void;
  completeQuest: (id: string) => void;

  // Questlines
  addQuestline: (questline: Omit<Questline, "id">) => Questline;
  updateQuestline: (id: string, updates: Partial<Questline>) => void;
  startQuestline: (id: string) => void;
  advanceQuestline: (questlineId: string) => void;
  setActiveQuestline: (questlineId: string | null) => void;

  // Checkpoints
  addCheckpoint: (checkpoint: Checkpoint) => void;
  updateCheckpoint: (id: string, updates: Partial<Checkpoint>) => void;
  completeCheckpoint: (id: string, result: string, tokens: number) => void;
  setAgentCheckpoint: (agentId: string, checkpointId: string) => void;
  updateAgentProgress: (agentId: string, progress: Partial<GameAgent['executionProgress']>) => void;
  updateTokenUsage: (agentId: string, tokens: number) => void;

  // Camera
  setCameraPosition: (position: { x: number; y: number; z: number }) => void;
  setCameraTarget: (target: { x: number; y: number; z: number }) => void;
  setZoom: (zoom: number) => void;
  setCameraRotation: (rotation: number) => void;
  setCameraElevation: (elevation: number) => void;

  // UI
  startDrag: (position: { x: number; y: number }) => void;
  updateDrag: (position: { x: number; y: number }) => void;
  endDrag: () => void;
  startSelectionBox: (startX: number, startY: number) => void;
  updateSelectionBox: (endX: number, endY: number) => void;
  endSelectionBox: () => void;
  setHoverAgent: (id: string | null) => void;
  setHoveredStructure: (id: string | null) => void;
  setSelectedStructure: (id: string | null) => void;
  openContextMenu: (position: { x: number; y: number }, agentId: string) => void;
  closeContextMenu: () => void;

  // Goals
  setActiveGoal: (goalId: string | null) => void;

  // Victory Effects
  addVictoryEffect: (position: [number, number, number], type: 'combat' | 'goal') => string;
  removeVictoryEffect: (id: string) => void;

  // Combat Animations
  addCombatAnimation: (
    type: 'attack_slash' | 'impact' | 'projectile' | 'dragon_breath',
    startPosition: [number, number, number],
    endPosition?: [number, number, number],
    direction?: [number, number, number],
    color?: string
  ) => string;
  removeCombatAnimation: (id: string) => void;

  // Batch updates
  updateMultipleAgents: (updates: Array<{ id: string; changes: Partial<GameAgent> }>) => void;

  // Agent Middleware Actions
  setBackendConfig: (config: { type: BackendType; initialized: boolean }) => void;
  setAgentMiddleware: (middleware: AgentMiddlewareConfig | null) => void;

  // Tutorial Actions
  setTutorialEnabled: (enabled: boolean) => void;
  setTutorialStep: (step: number) => void;
  completeTutorialStep: (stepId: string) => void;
  resetTutorial: () => void;

  // Log Actions
  addLog: (level: LogLevel, message: string, source?: string) => void;
  clearLogs: () => void;
  toggleLogsVisible: () => void;
  setLogsVisible: (visible: boolean) => void;

  // TPMJS Actions
  searchTPMJSTools: (query: string) => Promise<void>;
  listTPMJSTools: (options: TPMJSListOptions) => Promise<void>;
  installTPMJSTool: (tool: TPMJSTool, agentId: string) => void;
  installTPMJSToolToParty: (tool: TPMJSTool, partyId: string) => void;
  uninstallTPMJSTool: (toolId: string) => void;
  cacheTPMJSTool: (tool: TPMJSTool) => void;
  testTPMJSTool: (packageName: string, toolName: string, params: Record<string, any>) => Promise<any>;
}

// ============================================================================
// Store Definition
// ============================================================================

type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // Initial State
    worldSize: { width: 50, height: 50 },
    tiles: {},
    agents: {},
    selectedAgentIds: new Set(),
    agentCount: 0,
    parties: {},
    partyCount: 0,
    dragons: {},
    dragonCount: 0,
    structures: {},
    structureCount: 0,
    quests: {},
    questCount: 0,
    completedQuestCount: 0,
    questlines: {},
    activeQuestlineId: null,
    checkpoints: {},
    cameraPosition: { x: 25, y: 30, z: 25 },
    cameraTarget: { x: 0, y: 0, z: 0 },
    zoom: 1,
    cameraRotation: Math.PI / 4, // 45 degrees default
    cameraRotationTarget: Math.PI / 4,
    cameraElevation: Math.asin(Math.tan(Math.PI / 6)), // ~35.26 degrees (true isometric)
    cameraElevationTarget: Math.asin(Math.tan(Math.PI / 6)),
    isDragging: false,
    dragStart: null,
    dragEnd: null,
    selectionBox: null,
    hoverAgentId: null,
    hoverStructureId: null,
    selectedStructureId: null,
    contextMenuOpen: false,
    contextMenuPosition: null,
    contextMenuAgentId: null,
    activeGoalId: null,
    victoryEffects: [],
    combatAnimations: [],
    backendConfig: {
      type: "store",
      initialized: false,
    },
    agentMiddleware: null,
    tutorialState: {
      enabled: true,
      currentStep: 0,
      completedSteps: new Set(),
    },
    logs: [],
    maxLogs: 100,
    logsVisible: false,
    tpmjsCache: {},
    installedTPMJSTools: new Set(),
    tpmjsSearchResults: [],
    tpmjsLoading: false,
    tpmjsError: null,

  // World Actions
  initializeWorld: (width, height) => {
    set((state) => {
      state.worldSize = { width, height };
      state.tiles = {};
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < height; z++) {
          const key = `${x},${z}`;
          const type: TileType = Math.random() < 0.05 ? "stone" : "grass";
          state.tiles[key] = { x, z, type, walkable: true };
        }
      }
    });
  },

  setTile: (x, z, tileUpdates) => {
    const key = `${x},${z}`;
    set((state) => {
      const existing = state.tiles[key];
      if (existing) {
        Object.assign(state.tiles[key], tileUpdates);
      }
    });
  },

  // Agent Actions
  spawnAgent: (name, position, agentRef, parentId) => {
    const id = uuidv4();

    // Create default Tavily web search tool for this agent
    const tavilyTool: Tool = {
      id: `tavily-${id}`,
      name: "Tavily Web Search",
      type: "search",
      icon: "🌐",
      description: "Search the web for information using Tavily AI",
      rarity: "rare",
      power: 15,
      cooldownTime: 3000,
      mastery: 0,
      experience: 0,
    };

    const agent: GameAgent = {
      id,
      name,
      position,
      targetPosition: null,
      state: "IDLE",
      level: 1,
      health: 100,
      maxHealth: 100,
      equippedTool: null,
      inventory: [tavilyTool], // Start with Tavily search tool
      currentTask: "Awaiting orders...",
      agentRef,
      parentId: parentId || null,
      childrenIds: [],
      thoughtBubble: null,
      speechBubble: null,
      lastToolCall: null,
      partyId: null,
      currentPath: null,
      pathIndex: 0,
    };

    set((state) => {
      state.agents[id] = agent;
      state.agentCount = state.agentCount + 1;

      // If this is a subagent, link it to parent
      if (parentId && state.agents[parentId]) {
        state.agents[parentId].childrenIds.push(id);
      }
    });

    return agent;
  },

  spawnAgentBatch: (count, basePosition, pattern) => {
    const base = basePosition || [25, 0, 25];
    const spawnPattern = pattern || "grid";
    const agents: GameAgent[] = [];
    const spawnRadius = 20;

    if (spawnPattern === "grid") {
      // Grid pattern for organized deployment
      const gridSize = Math.ceil(Math.sqrt(count));
      const spacing = 2;
      const offset = (gridSize * spacing) / 2;

      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const position: [number, number, number] = [
          base[0] + col * spacing - offset,
          base[1],
          base[2] + row * spacing - offset,
        ];
        agents.push(get().spawnAgent(`Agent-${i + 1}`, position));
      }
    } else if (spawnPattern === "circle") {
      // Circle pattern for defensive formation
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const position: [number, number, number] = [
          base[0] + Math.cos(angle) * spawnRadius,
          base[1],
          base[2] + Math.sin(angle) * spawnRadius,
        ];
        agents.push(get().spawnAgent(`Agent-${i + 1}`, position));
      }
    } else {
      // Random pattern (default)
      for (let i = 0; i < count; i++) {
        const position: [number, number, number] = [
          base[0] + (Math.random() - 0.5) * spawnRadius * 2,
          base[1],
          base[2] + (Math.random() - 0.5) * spawnRadius * 2,
        ];
        agents.push(get().spawnAgent(`Agent-${i + 1}`, position));
      }
    }

    return agents;
  },

  removeAgent: (id) => {
    set((state) => {
      const agent = state.agents[id];

      // Remove from parent's children
      if (agent?.parentId && state.agents[agent.parentId]) {
        state.agents[agent.parentId].childrenIds = state.agents[agent.parentId].childrenIds.filter(
          (childId) => childId !== id
        );
      }

      delete state.agents[id];
      state.selectedAgentIds.delete(id);
      state.agentCount = Math.max(0, state.agentCount - 1);
    });
  },

  updateAgent: (id, updates) => {
    set((state) => {
      const agent = state.agents[id];
      if (agent) {
        Object.assign(state.agents[id], updates);
      }
    });
  },

  setAgentState: (id, state) => {
    get().updateAgent(id, { state });
  },

  setAgentPosition: (id, position) => {
    get().updateAgent(id, { position });
  },

  setAgentTarget: (id, target) => {
    get().updateAgent(id, { targetPosition: target });
  },

  setAgentPath: (id, path) => {
    get().updateAgent(id, { currentPath: path, pathIndex: 0 });
  },

  equipTool: (agentId, tool) => {
    get().updateAgent(agentId, { equippedTool: tool });
  },

  unequipTool: (agentId) => {
    get().updateAgent(agentId, { equippedTool: null });
  },

  addToolToInventory: (agentId, tool) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (agent) {
        state.agents[agentId].inventory = [...agent.inventory, tool];
      }
    });
  },

  useTool: (agentId) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (agent?.equippedTool) {
        const tool = agent.equippedTool;
        tool.lastUsed = Date.now();

        // Grant experience for using the tool
        const currentExp = tool.experience || 0;
        const currentMastery = tool.mastery || 0;
        tool.experience = currentExp + 10;

        // Level up mastery every 100 experience points
        if (tool.experience >= (currentMastery + 1) * 100) {
          tool.mastery = Math.min(100, currentMastery + 1);
        }
      }
    });
  },

  getToolCooldownPercent: (tool) => {
    if (!tool.cooldownTime || !tool.lastUsed) return 0;
    const elapsed = Date.now() - tool.lastUsed;
    if (elapsed >= tool.cooldownTime) return 0;
    return ((tool.cooldownTime - elapsed) / tool.cooldownTime) * 100;
  },

  isToolOnCooldown: (tool) => {
    if (!tool.cooldownTime || !tool.lastUsed) return false;
    const elapsed = Date.now() - tool.lastUsed;
    return elapsed < tool.cooldownTime;
  },

  gainToolExperience: (agentId, toolId, amount) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return;

      // Check equipped tool
      if (agent.equippedTool?.id === toolId) {
        const tool = agent.equippedTool;
        const currentExp = tool.experience || 0;
        const currentMastery = tool.mastery || 0;
        tool.experience = currentExp + amount;

        // Level up mastery every 100 experience points
        if (tool.experience >= (currentMastery + 1) * 100) {
          tool.mastery = Math.min(100, currentMastery + 1);
        }
      }

      // Check inventory tools
      const inventoryTool = agent.inventory.find(t => t.id === toolId);
      if (inventoryTool) {
        const currentExp = inventoryTool.experience || 0;
        const currentMastery = inventoryTool.mastery || 0;
        inventoryTool.experience = currentExp + amount;

        if (inventoryTool.experience >= (currentMastery + 1) * 100) {
          inventoryTool.mastery = Math.min(100, currentMastery + 1);
        }
      }
    });
  },

  setThoughtBubble: (agentId, thought) => {
    get().updateAgent(agentId, { thoughtBubble: thought });
  },

  setSpeechBubble: (agentId, message, targetAgentId, duration = 3000) => {
    const timestamp = Date.now();
    get().updateAgent(agentId, {
      speechBubble: { message, targetAgentId, timestamp }
    });

    // Auto-clear speech bubble after duration
    setTimeout(() => {
      const agent = get().agents[agentId];
      if (agent?.speechBubble?.timestamp === timestamp) {
        get().updateAgent(agentId, { speechBubble: null });
      }
    }, duration);
  },

  handleAgentCommunication: (fromAgentId, toAgentId, message) => {
    const fromAgent = get().agents[fromAgentId];
    const toAgent = get().agents[toAgentId];

    if (!fromAgent || !toAgent) {
      console.warn(`[handleAgentCommunication] One or both agents not found: ${fromAgentId}, ${toAgentId}`);
      return;
    }

    // Set speech bubble on sender showing directed communication
    get().setSpeechBubble(fromAgentId, message, toAgentId, 3000);

    // If target agent is in the same party, show acknowledgment
    if (fromAgent.partyId && fromAgent.partyId === toAgent.partyId) {
      const acknowledgments = ["Got it!", "Understood!", "Copy that!", "On it!", "Roger!"];
      setTimeout(() => {
        get().setSpeechBubble(
          toAgentId,
          acknowledgments[Math.floor(Math.random() * acknowledgments.length)],
          undefined,
          2000
        );
      }, 1000);
    }
  },

  broadcastToParty: (partyId, fromAgentId, message) => {
    const party = get().parties[partyId];
    const fromAgent = get().agents[fromAgentId];

    if (!party || !fromAgent) {
      console.warn(`[broadcastToParty] Party or agent not found: ${partyId}, ${fromAgentId}`);
      return;
    }

    // Broadcast to all party members
    party.memberIds.forEach((memberId, index) => {
      if (memberId !== fromAgentId) {
        const member = get().agents[memberId];
        if (member) {
          // Stagger responses for natural feel
          setTimeout(() => {
            const acknowledgments = ["Got it!", "Understood!", "Copy that!", "On it!", "Roger!", "Affirmative!"];
            get().setSpeechBubble(
              memberId,
              acknowledgments[Math.floor(Math.random() * acknowledgments.length)],
              undefined,
              2000
            );
          }, 200 + index * 150);
        }
      }
    });

    // Sender shows broadcast message
    get().setSpeechBubble(fromAgentId, message, undefined, 3000);
  },

  // Selection Actions
  selectAgent: (id) => {
    set((state) => {
      state.selectedAgentIds.add(id);
    });
  },

  deselectAgent: (id) => {
    set((state) => {
      state.selectedAgentIds.delete(id);
    });
  },

  toggleAgentSelection: (id) => {
    set((state) => {
      if (state.selectedAgentIds.has(id)) {
        state.selectedAgentIds.delete(id);
      } else {
        state.selectedAgentIds.add(id);
      }
    });
  },

  selectAgentsInBox: (minX, minZ, maxX, maxZ) => {
    set((state) => {
      const selected = new Set<string>();
      for (const id in state.agents) {
        const agent = state.agents[id];
        const [x, , z] = agent.position;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
          selected.add(id);
        }
      }
      state.selectedAgentIds = selected;
    });
  },

  clearSelection: () => {
    set({ selectedAgentIds: new Set() });
  },

  selectAllAgents: () => {
    set((state) => {
      state.selectedAgentIds = new Set(Object.keys(state.agents));
    });
  },

  // Party Actions
  createParty: (name, memberIds, leaderId) => {
    const id = uuidv4();
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const party: Party = {
      id,
      name,
      memberIds: [...memberIds],
      formation: "free",
      leaderId: leaderId || memberIds[0] || null,
      createdAt: Date.now(),
      color,
      sharedResources: {
        tools: [],
        lastUpdated: Date.now(),
      },
    };

    set((state) => {
      state.parties[id] = party;
      state.partyCount = state.partyCount + 1;

      // Update all members to reference this party
      memberIds.forEach((agentId) => {
        if (state.agents[agentId]) {
          state.agents[agentId].partyId = id;
        }
      });
    });

    // Trigger speech bubbles for party formation - COORD-004
    const greetings = ["Let's do this!", "Team up!", "Ready!", "Together!"];
    memberIds.forEach((agentId, index) => {
      setTimeout(() => {
        get().setSpeechBubble(
          agentId,
          greetings[index % greetings.length],
          undefined,
          3000
        );
      }, index * 300);
    });

    return party;
  },

  addToParty: (partyId, agentId) => {
    set((state) => {
      const party = state.parties[partyId];
      const agent = state.agents[agentId];

      if (party && agent && !party.memberIds.includes(agentId)) {
        // Remove agent from current party if any
        if (agent.partyId && state.parties[agent.partyId]) {
          state.parties[agent.partyId].memberIds = state.parties[agent.partyId].memberIds.filter(
            (id) => id !== agentId
          );
        }

        // Add to new party
        party.memberIds.push(agentId);
        agent.partyId = partyId;
      }
    });
  },

  removeFromParty: (partyId, agentId) => {
    set((state) => {
      const party = state.parties[partyId];
      const agent = state.agents[agentId];

      if (party && agent) {
        party.memberIds = party.memberIds.filter((id) => id !== agentId);
        agent.partyId = null;

        // Update leader if removed
        if (party.leaderId === agentId) {
          party.leaderId = party.memberIds.length > 0 ? party.memberIds[0] : null;
        }

        // Disband party if no members left
        if (party.memberIds.length === 0) {
          delete state.parties[partyId];
          state.partyCount = Math.max(0, state.partyCount - 1);
        }
      }
    });
  },

  disbandParty: (partyId) => {
    set((state) => {
      const party = state.parties[partyId];
      if (party) {
        // Remove party reference from all members
        party.memberIds.forEach((agentId) => {
          if (state.agents[agentId]) {
            state.agents[agentId].partyId = null;
          }
        });

        delete state.parties[partyId];
        state.partyCount = Math.max(0, state.partyCount - 1);
      }
    });
  },

  setPartyFormation: (partyId, formation) => {
    set((state) => {
      const party = state.parties[partyId];
      if (party) {
        party.formation = formation;
      }
    });
  },

  setPartyLeader: (partyId, leaderId) => {
    set((state) => {
      const party = state.parties[partyId];
      if (party && party.memberIds.includes(leaderId)) {
        party.leaderId = leaderId;
      }
    });
  },

  moveParty: (partyId, targetPosition) => {
    const party = get().parties[partyId];
    if (!party || party.memberIds.length === 0) return;

    const formation = party.formation;
    const leader = get().agents[party.leaderId || party.memberIds[0]];

    if (!leader) return;

    // Move leader to target
    get().setAgentTarget(leader.id, targetPosition);

    // Calculate formation positions for other members
    const members = party.memberIds.filter((id) => id !== leader.id);
    const spacing = 2;

    members.forEach((memberId, index) => {
      const agent = get().agents[memberId];
      if (!agent) return;

      let offset: [number, number, number] = [0, 0, 0];

      switch (formation) {
        case "line":
          offset = [spacing * (index + 1), 0, 0];
          break;
        case "column":
          offset = [0, 0, spacing * (index + 1)];
          break;
        case "wedge":
          const side = index % 2 === 0 ? 1 : -1;
          const dist = Math.floor(index / 2) + 1;
          offset = [side * spacing * dist, 0, spacing * dist];
          break;
        case "box":
          const boxSize = Math.ceil(Math.sqrt(members.length + 1));
          const row = Math.floor((index + 1) / boxSize);
          const col = (index + 1) % boxSize;
          offset = [col * spacing, 0, row * spacing];
          break;
        case "circle":
          const angle = (index / members.length) * Math.PI * 2;
          const radius = spacing * 2;
          offset = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
          break;
        case "free":
        default:
          // Random scatter around target
          offset = [
            (Math.random() - 0.5) * spacing * 4,
            0,
            (Math.random() - 0.5) * spacing * 4,
          ];
          break;
      }

      const memberTarget: [number, number, number] = [
        targetPosition[0] + offset[0],
        targetPosition[1] + offset[1],
        targetPosition[2] + offset[2],
      ];

      get().setAgentTarget(memberId, memberTarget);
    });
  },

  // Shared Resource Actions
  addToolToPartyShared: (partyId, tool) => {
    set((state) => {
      const party = state.parties[partyId];
      if (party) {
        party.sharedResources.tools.push(tool);
        party.sharedResources.lastUpdated = Date.now();
      }
    });

    // Trigger speech bubbles when tool is shared - COORD-004
    const party = get().parties[partyId];
    if (party && party.memberIds.length > 0) {
      const sharerId = party.memberIds[0]; // First member shares
      const thanks = ["Thanks!", "Awesome!", "Got it!", "Sweet!"];
      party.memberIds.forEach((agentId, index) => {
        if (index === 0) {
          // Sharer announces
          get().setSpeechBubble(sharerId, `Sharing ${tool.name}!`, undefined, 2000);
        } else {
          // Others respond with delay
          setTimeout(() => {
            get().setSpeechBubble(
              agentId,
              thanks[index % thanks.length],
              undefined,
              2000
            );
          }, 500 + index * 200);
        }
      });
    }
  },

  removeToolFromPartyShared: (partyId, toolId) => {
    set((state) => {
      const party = state.parties[partyId];
      if (party) {
        party.sharedResources.tools = party.sharedResources.tools.filter((t) => t.id !== toolId);
        party.sharedResources.lastUpdated = Date.now();
      }
    });
  },

  // Dragon Actions
  spawnDragon: (type, position, error, targetAgentId) => {
    const id = uuidv4();
    const maxHealth = type === "UNKNOWN" ? 200 : 100;
    const dragon: Dragon = {
      id,
      type,
      position,
      health: maxHealth,
      maxHealth,
      error,
      targetAgentId,
    };

    set((state) => {
      state.dragons[id] = dragon;
      state.dragonCount = state.dragonCount + 1;
    });

    return dragon;
  },

  removeDragon: (id) => {
    set((state) => {
      delete state.dragons[id];
      state.dragonCount = Math.max(0, state.dragonCount - 1);
    });
  },

  updateDragon: (id, updates) => {
    set((state) => {
      const dragon = state.dragons[id];
      if (dragon) {
        Object.assign(state.dragons[id], updates);
      }
    });
  },

  damageDragon: (id, damage) => {
    set((state) => {
      const dragon = state.dragons[id];
      if (dragon) {
        state.dragons[id].health = Math.max(0, dragon.health - damage);
      }
    });
  },

  // Structure Actions
  addStructure: (structure) => {
    const id = uuidv4();
    const newStructure: Structure = { ...structure, id };
    set((state) => {
      state.structures[id] = newStructure;
      state.structureCount = state.structureCount + 1;
    });
    return newStructure;
  },

  removeStructure: (id) => {
    set((state) => {
      delete state.structures[id];
      state.structureCount = Math.max(0, state.structureCount - 1);
    });
  },

  updateStructure: (id, updates) => {
    set((state) => {
      const structure = state.structures[id];
      if (structure) {
        Object.assign(state.structures[id], updates);
      }
    });
  },

  // Quest Actions
  addQuest: (quest) => {
    const id = uuidv4();
    const newQuest: Quest = { ...quest, id };
    const isNewCompleted = newQuest.status === "completed";
    set((state) => {
      state.quests[id] = newQuest;
      state.questCount = state.questCount + 1;
      state.completedQuestCount = state.completedQuestCount + (isNewCompleted ? 1 : 0);
    });
    return newQuest;
  },

  updateQuest: (id, updates) => {
    set((state) => {
      const quest = state.quests[id];
      if (quest) {
        const oldCompleted = quest.status === "completed";
        // Create new object to trigger re-renders with shallow comparison
        state.quests[id] = { ...quest, ...updates };
        const newCompleted = (updates.status ?? quest.status) === "completed";
        const completedDelta = newCompleted ? 1 : 0 - (oldCompleted ? 1 : 0);
        state.completedQuestCount = Math.max(0, state.completedQuestCount + completedDelta);
      }
    });
  },

  assignQuestToAgents: (questId, agentIds) => {
    // First update the quest metadata
    get().updateQuest(questId, {
      assignedAgentIds: agentIds,
      status: "in_progress",
    });

    // Get the quest
    const quest = get().quests[questId];
    if (!quest) {
      console.warn(`[assignQuestToAgents] Quest ${questId} not found`);
      return;
    }

    // Check if this is a checkpoint-based quest
    if (quest.checkpointIds && quest.checkpointIds.length > 0) {
      // Checkpoint-based quest: assign first checkpoint to agents
      const firstCheckpointId = quest.checkpointIds[0];
      const firstCheckpoint = get().checkpoints[firstCheckpointId];

      if (!firstCheckpoint) {
        console.warn(`[assignQuestToAgents] Checkpoint ${firstCheckpointId} not found`);
        return;
      }

      // Prepare batch updates for all assigned agents
      const agentUpdates: Array<{ id: string; changes: Partial<GameAgent> }> = [];

      agentIds.forEach((agentId) => {
        const agent = get().agents[agentId];
        if (!agent) return;

        agentUpdates.push({
          id: agentId,
          changes: {
            currentQuestId: questId,
            currentCheckpointId: firstCheckpointId,
            currentStepDescription: firstCheckpoint.description,
            targetPosition: firstCheckpoint.position,
            state: "MOVING",
            currentTask: `Quest: ${quest.title}`,
            executionProgress: {
              currentStep: 1,
              totalSteps: quest.checkpointIds?.length || 0,
              percentComplete: (1 / (quest.checkpointIds?.length || 1)) * 100,
              startedAt: Date.now(),
            },
            tokenUsage: {
              total: 0,
              thisStep: 0,
              cost: 0,
            },
          },
        });
      });

      // Mark first checkpoint as active
      get().updateCheckpoint(firstCheckpointId, { status: "active" });

      // Apply all agent updates in a single batch
      if (agentUpdates.length > 0) {
        get().updateMultipleAgents(agentUpdates);
      }

      return;
    }

    // Legacy structure-based quest
    if (!quest.targetStructureId) {
      console.warn(`[assignQuestToAgents] Quest ${questId} has no target structure or checkpoints`);
      return;
    }

    // Get the target structure
    const structure = get().structures[quest.targetStructureId];
    if (!structure) {
      console.warn(`[assignQuestToAgents] Structure ${quest.targetStructureId} not found`);
      return;
    }

    // Calculate formation positions for agents around the structure
    const structurePosition = structure.position;
    const spacing = 2; // Distance between agents
    const formationRadius = spacing * 2; // Radius of the formation circle

    // Prepare batch updates for all assigned agents
    const agentUpdates: Array<{ id: string; changes: Partial<GameAgent> }> = [];

    agentIds.forEach((agentId, index) => {
      const agent = get().agents[agentId];
      if (!agent) return;

      // Calculate position in circle formation around the structure
      const angle = (index / agentIds.length) * Math.PI * 2;
      const targetPosition: [number, number, number] = [
        structurePosition[0] + Math.cos(angle) * formationRadius,
        structurePosition[1],
        structurePosition[2] + Math.sin(angle) * formationRadius,
      ];

      agentUpdates.push({
        id: agentId,
        changes: {
          targetPosition,
          state: "MOVING",
          currentTask: `Proceeding to ${structure.name}`,
        },
      });
    });

    // Apply all agent updates in a single batch
    if (agentUpdates.length > 0) {
      get().updateMultipleAgents(agentUpdates);
    }
  },

  completeQuest: (id) => {
    const quest = get().quests[id];
    get().updateQuest(id, { status: "completed" });

    // Trigger goal completion celebration
    if (quest?.targetStructureId) {
      const structure = get().structures[quest.targetStructureId];
      if (structure) {
        get().addVictoryEffect(structure.position, 'goal');
      }
    }

    // Check if this quest is part of a questline and advance it
    if (quest?.questlineId) {
      get().advanceQuestline(quest.questlineId);
    }
  },

  // Questline Actions
  addQuestline: (questline) => {
    const id = uuidv4();
    const newQuestline: Questline = { ...questline, id };
    set((state) => {
      state.questlines[id] = newQuestline;
    });
    return newQuestline;
  },

  updateQuestline: (id, updates) => {
    set((state) => {
      const questline = state.questlines[id];
      if (questline) {
        Object.assign(state.questlines[id], updates);
      }
    });
  },

  startQuestline: (id) => {
    set((state) => {
      const questline = state.questlines[id];
      if (questline && questline.status === "not_started") {
        state.questlines[id].status = "in_progress";

        // Activate the first quest in the questline
        const firstQuestId = questline.questIds[0];
        if (firstQuestId && state.quests[firstQuestId]) {
          state.quests[firstQuestId].status = "in_progress";
        }
      }
    });
  },

  advanceQuestline: (questlineId) => {
    set((state) => {
      const questline = state.questlines[questlineId];
      if (!questline || questline.status !== "in_progress") return;

      // Check if current quest is completed
      const currentQuestId = questline.questIds[questline.currentQuestIndex];
      const currentQuest = state.quests[currentQuestId];

      if (currentQuest?.status === "completed") {
        // Move to next quest if available
        const nextIndex = questline.currentQuestIndex + 1;
        if (nextIndex < questline.questIds.length) {
          const nextQuestId = questline.questIds[nextIndex];
          state.questlines[questlineId].currentQuestIndex = nextIndex;

          // Activate next quest
          if (state.quests[nextQuestId]) {
            state.quests[nextQuestId].status = "in_progress";
          }
        } else {
          // All quests completed - mark questline as completed
          state.questlines[questlineId].status = "completed";
        }
      }
    });
  },

  setActiveQuestline: (questlineId) => {
    set({ activeQuestlineId: questlineId });
  },

  // Camera Actions
  setCameraPosition: (position) => {
    set({ cameraPosition: position });
  },

  setCameraTarget: (target) => {
    set({ cameraTarget: target });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.2, Math.min(5.0, zoom)) });
  },

  setCameraRotation: (rotation) => {
    set({
      cameraRotation: rotation,
      cameraRotationTarget: rotation,
    });
  },

  setCameraElevation: (elevation) => {
    set({
      cameraElevation: elevation,
      cameraElevationTarget: elevation,
    });
  },

  // UI Actions
  startDrag: (position) => {
    set({ isDragging: true, dragStart: position, dragEnd: position });
  },

  updateDrag: (position) => {
    set({ dragEnd: position });
  },

  endDrag: () => {
    set({ isDragging: false, dragStart: null, dragEnd: null });
  },

  startSelectionBox: (startX, startY) => {
    set({
      selectionBox: {
        startX,
        startY,
        endX: startX,
        endY: startY,
        active: true,
      },
    });
  },

  updateSelectionBox: (endX, endY) => {
    set((state) => {
      if (state.selectionBox) {
        state.selectionBox.endX = endX;
        state.selectionBox.endY = endY;
      }
    });
  },

  endSelectionBox: () => {
    set({ selectionBox: null });
  },

  setHoverAgent: (id) => {
    set({ hoverAgentId: id });
  },

  setHoveredStructure: (id) => {
    set({ hoverStructureId: id });
  },

  setSelectedStructure: (id) => {
    set({ selectedStructureId: id });
  },

  openContextMenu: (position, agentId) => {
    console.log("[gameStore] openContextMenu called", { position, agentId });
    set({
      contextMenuOpen: true,
      contextMenuPosition: position,
      contextMenuAgentId: agentId,
    });
  },

  closeContextMenu: () => {
    set({
      contextMenuOpen: false,
      contextMenuPosition: null,
      contextMenuAgentId: null,
    });
  },

  // Goals
  setActiveGoal: (goalId) => {
    set({ activeGoalId: goalId });
  },

  // Victory Effects
  addVictoryEffect: (position, type) => {
    const id = `victory-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    set((state) => {
      state.victoryEffects.push({
        id,
        position,
        type,
        timestamp: Date.now(),
      });
    });
    return id;
  },

  removeVictoryEffect: (id) => {
    set((state) => {
      state.victoryEffects = state.victoryEffects.filter(effect => effect.id !== id);
    });
  },

  // Combat Animations
  addCombatAnimation: (type, startPosition, endPosition, direction, color) => {
    const id = `combat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    set((state) => {
      state.combatAnimations.push({
        id,
        type,
        startPosition,
        endPosition,
        direction,
        color,
        timestamp: Date.now(),
      });
    });
    return id;
  },

  removeCombatAnimation: (id) => {
    set((state) => {
      state.combatAnimations = state.combatAnimations.filter(anim => anim.id !== id);
    });
  },

  // Batch updates
  updateMultipleAgents: (updates) => {
    set((state) => {
      for (const { id, changes } of updates) {
        const agent = state.agents[id];
        if (agent) {
          Object.assign(state.agents[id], changes);
        }
      }
    });
  },

  // Agent Middleware Actions
  setBackendConfig: (config: { type: BackendType; initialized: boolean }) => {
    set((state) => {
      state.backendConfig = config;
    });
  },

  setAgentMiddleware: (middleware: AgentMiddlewareConfig | null) => {
    set((state) => {
      state.agentMiddleware = middleware;
    });
  },

  // Tutorial Actions
  setTutorialEnabled: (enabled) => {
    set((state) => {
      state.tutorialState.enabled = enabled;
    });
  },

  setTutorialStep: (step) => {
    set((state) => {
      state.tutorialState.currentStep = step;
    });
  },

  completeTutorialStep: (stepId) => {
    set((state) => {
      state.tutorialState.completedSteps.add(stepId);
    });
  },

  resetTutorial: () => {
    set((state) => {
      state.tutorialState = {
        enabled: true,
        currentStep: 0,
        completedSteps: new Set(),
      };
    });
  },

  // Log Actions
  addLog: (level: LogLevel, message: string, source?: string) => {
    set((state) => {
      const newLog: LogEntry = {
        id: uuidv4(),
        level,
        message,
        timestamp: Date.now(),
        source,
      };
      state.logs.push(newLog);

      // Keep only the last maxLogs entries
      if (state.logs.length > state.maxLogs) {
        state.logs = state.logs.slice(-state.maxLogs);
      }
    });
  },

  clearLogs: () => {
    set((state) => {
      state.logs = [];
    });
  },

  toggleLogsVisible: () => {
    set((state) => {
      state.logsVisible = !state.logsVisible;
    });
  },

  setLogsVisible: (visible: boolean) => {
    set((state) => {
      state.logsVisible = visible;
    });
  },

  // Checkpoint Actions
  addCheckpoint: (checkpoint) => {
    set((state) => {
      state.checkpoints[checkpoint.id] = checkpoint;
    });
  },

  updateCheckpoint: (id, updates) => {
    set((state) => {
      const checkpoint = state.checkpoints[id];
      if (checkpoint) {
        Object.assign(state.checkpoints[id], updates);
      }
    });
  },

  completeCheckpoint: (id, result, tokens) => {
    set((state) => {
      const checkpoint = state.checkpoints[id];
      if (checkpoint) {
        checkpoint.status = "completed";
        checkpoint.result = result;
        checkpoint.actualTokens = tokens;
        checkpoint.completedAt = Date.now();
      }
    });
  },

  setAgentCheckpoint: (agentId, checkpointId) => {
    set((state) => {
      const agent = state.agents[agentId];
      const checkpoint = state.checkpoints[checkpointId];
      if (agent && checkpoint) {
        agent.currentCheckpointId = checkpointId;
        agent.currentQuestId = checkpoint.questId;
        agent.currentStepDescription = checkpoint.description;

        // Update checkpoint status
        checkpoint.status = "active";
      }
    });
  },

  updateAgentProgress: (agentId, progress) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (agent) {
        if (!agent.executionProgress) {
          agent.executionProgress = {
            currentStep: 1,
            totalSteps: 1,
            percentComplete: 0,
            startedAt: Date.now(),
          };
        }
        Object.assign(agent.executionProgress, progress);
      }
    });
  },

  updateTokenUsage: (agentId, tokens) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (agent) {
        if (!agent.tokenUsage) {
          agent.tokenUsage = {
            total: 0,
            thisStep: 0,
            cost: 0,
          };
        }
        agent.tokenUsage.thisStep = tokens;
        agent.tokenUsage.total += tokens;
        // Rough cost estimate: $3 per million input tokens, $15 per million output tokens
        // Using average of $9 per million tokens
        agent.tokenUsage.cost = (agent.tokenUsage.total / 1_000_000) * 9;
      }
    });
  },

  // TPMJS Actions
  searchTPMJSTools: async (query: string) => {
    set((state) => {
      state.tpmjsLoading = true;
      state.tpmjsError = null;
    });

    try {
      const client = getTPMJSClient();
      const result = await client.searchTools(query);

      set((state) => {
        state.tpmjsSearchResults = result.tools;
        state.tpmjsLoading = false;

        // Cache all returned tools
        result.tools.forEach((tool) => {
          const key = `${tool.package}/${tool.toolName}`;
          state.tpmjsCache[key] = tool;
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set((state) => {
        state.tpmjsLoading = false;
        state.tpmjsError = errorMessage;
      });
      console.error('[searchTPMJSTools] Error:', errorMessage);
    }
  },

  listTPMJSTools: async (options: TPMJSListOptions) => {
    set((state) => {
      state.tpmjsLoading = true;
      state.tpmjsError = null;
    });

    try {
      const client = getTPMJSClient();
      const result = await client.listTools(options);

      set((state) => {
        state.tpmjsSearchResults = result.tools;
        state.tpmjsLoading = false;

        // Cache all returned tools
        result.tools.forEach((tool) => {
          const key = `${tool.package}/${tool.toolName}`;
          state.tpmjsCache[key] = tool;
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set((state) => {
        state.tpmjsLoading = false;
        state.tpmjsError = errorMessage;
      });
      console.error('[listTPMJSTools] Error:', errorMessage);
    }
  },

  installTPMJSTool: (tool: TPMJSTool, agentId: string) => {
    const toolKey = `${tool.package}/${tool.toolName}`;
    const gameTool = convertTPMJSToolToGameTool(tool, agentId);

    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) {
        console.warn(`[installTPMJSTool] Agent ${agentId} not found`);
        return;
      }

      // Check for duplicates in agent inventory
      const isDuplicate = agent.inventory.some(
        (t) => t.id === gameTool.id || t.name === gameTool.name
      );

      if (isDuplicate) {
        console.warn(`[installTPMJSTool] Tool ${tool.toolName} already installed on agent ${agent.name}`);
        get().addLog('warn', `${tool.toolName} is already installed on ${agent.name}`, 'tpmjs');
        return;
      }

      // Mark as installed globally
      state.installedTPMJSTools.add(toolKey);

      // Add to agent inventory
      agent.inventory.push(gameTool);

      // Cache the TPMJS tool
      state.tpmjsCache[toolKey] = tool;
    });

    get().addLog('success', `Installed ${tool.package}/${tool.toolName} to ${get().agents[agentId]?.name}`, 'tpmjs');
  },

  installTPMJSToolToParty: (tool: TPMJSTool, partyId: string) => {
    const toolKey = `${tool.package}/${tool.toolName}`;
    const gameTool = convertTPMJSToolToGameTool(tool, partyId);

    set((state) => {
      const party = state.parties[partyId];
      if (!party) {
        console.warn(`[installTPMJSToolToParty] Party ${partyId} not found`);
        return;
      }

      // Check for duplicates in party shared tools
      const isDuplicate = party.sharedResources.tools.some(
        (t) => t.id === gameTool.id || t.name === gameTool.name
      );

      if (isDuplicate) {
        console.warn(`[installTPMJSToolToParty] Tool ${tool.toolName} already installed on party ${party.name}`);
        get().addLog('warn', `${tool.toolName} is already installed on party ${party.name}`, 'tpmjs');
        return;
      }

      // Mark as installed globally
      state.installedTPMJSTools.add(toolKey);

      // Create a shared tool for the party
      party.sharedResources.tools.push(gameTool);
      party.sharedResources.lastUpdated = Date.now();

      // Cache the TPMJS tool
      state.tpmjsCache[toolKey] = tool;
    });

    get().addLog('success', `Installed ${tool.package}/${tool.toolName} to party ${get().parties[partyId]?.name}`, 'tpmjs');
  },

  uninstallTPMJSTool: (toolId: string) => {
    set((state) => {
      // Remove from installed set
      state.installedTPMJSTools.delete(toolId);

      // Remove from all agent inventories
      Object.values(state.agents).forEach((agent) => {
        agent.inventory = agent.inventory.filter((t) => t.id !== `tpmjs-${toolId}`);

        // Unequip if equipped
        if (agent.equippedTool?.id === `tpmjs-${toolId}`) {
          agent.equippedTool = null;
        }
      });

      // Remove from party shared resources
      Object.values(state.parties).forEach((party) => {
        party.sharedResources.tools = party.sharedResources.tools.filter(
          (t) => t.id !== `tpmjs-${toolId}`
        );
      });
    });

    get().addLog('info', `Uninstalled TPMJS tool: ${toolId}`, 'tpmjs');
  },

  cacheTPMJSTool: (tool: TPMJSTool) => {
    set((state) => {
      const key = `${tool.package}/${tool.toolName}`;
      state.tpmjsCache[key] = tool;
    });
  },

  testTPMJSTool: async (packageName: string, toolName: string, params: Record<string, any>) => {
    try {
      const client = getTPMJSClient();
      const stream = await client.executeTool(packageName, toolName, params);

      // Read the stream and collect results
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      get().addLog('success', `Tool test complete: ${packageName}/${toolName}`, 'tpmjs');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      get().addLog('error', `Tool test failed: ${errorMessage}`, 'tpmjs');
      throw error;
    }
  },
})));

// ============================================================================
// Selector Hooks
// ============================================================================

import { useShallow } from "zustand/react/shallow";

// Use cached count values - these are stable scalar values
export const useAgentCount = () => useGameStore((state) => state.agentCount);
export const useDragonCount = () => useGameStore((state) => state.dragonCount);
export const useStructureCount = () => useGameStore((state) => state.structureCount);
export const useQuestCount = () => useGameStore((state) => state.questCount);
export const useCompletedQuestCount = () => useGameStore((state) => state.completedQuestCount);
export const usePartyCount = () => useGameStore((state) => state.partyCount);

// Single agent lookup
export const useAgent = (id: string) =>
  useGameStore((state) => state.agents[id]);

// Selected agents - return Set and Map for stable reference
export const useSelectedAgentIds = () => useGameStore((state) => state.selectedAgentIds);
export const useAgentsMap = () => useGameStore((state) => state.agents);
export const usePartiesMap = () => useGameStore((state) => state.parties);

// These selectors use shallow comparison for the Map reference itself
// Components should use useMemo to convert to arrays when needed
export const useAgentsShallow = () => useGameStore(useShallow((state) => state.agents));
export const useDragonsShallow = () => useGameStore(useShallow((state) => state.dragons));
export const useStructuresShallow = () => useGameStore(useShallow((state) => state.structures));
export const useQuestsShallow = () => useGameStore(useShallow((state) => state.quests));
export const useTilesShallow = () => useGameStore(useShallow((state) => state.tiles));
export const usePartiesShallow = () => useGameStore(useShallow((state) => state.parties));

// Selection Set
export const useSelection = () => useGameStore((state) => state.selectedAgentIds);

// Camera state selectors - return stable values to avoid infinite loops
export const useCameraPosition = () => useGameStore((state) => state.cameraPosition);
export const useCameraTarget = () => useGameStore((state) => state.cameraTarget);
export const useZoom = () => useGameStore((state) => state.zoom);
export const useSetCameraPosition = () => useGameStore((state) => state.setCameraPosition);
export const useSetCameraTarget = () => useGameStore((state) => state.setCameraTarget);
export const useSetZoom = () => useGameStore((state) => state.setZoom);
export const useCameraRotation = () => useGameStore((state) => state.cameraRotation);
export const useCameraRotationTarget = () => useGameStore((state) => state.cameraRotationTarget);
export const useCameraElevation = () => useGameStore((state) => state.cameraElevation);
export const useCameraElevationTarget = () => useGameStore((state) => state.cameraElevationTarget);
export const useSetCameraRotation = () => useGameStore((state) => state.setCameraRotation);
export const useSetCameraElevation = () => useGameStore((state) => state.setCameraElevation);

// Tutorial state selectors
export const useTutorialState = () => useGameStore((state) => state.tutorialState);
export const useTutorialEnabled = () => useGameStore((state) => state.tutorialState.enabled);
export const useTutorialStep = () => useGameStore((state) => state.tutorialState.currentStep);
export const useTutorialCompletedSteps = () => useGameStore((state) => state.tutorialState.completedSteps);
