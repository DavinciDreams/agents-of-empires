// ============================================================================
// Core Components Exports
// ============================================================================

// Game Components
export { GameState, GameLoop } from "./Game";
export type { GameStateProps, GameLoopProps } from "./Game";

// Game Hooks
export { useGame, useGameTime, useGameStats } from "./Game";
export type { GameConfig } from "./Game";

// Selection System
export {
  useSelectionSystem,
  SelectionBoxVisual,
  SelectionSystem,
  isAgentInSelectionBox,
} from "./SelectionSystem";
export type {
  SelectionBox,
  SelectionSystemOptions,
  DragState,
  SelectionBoxVisualProps,
  SelectionSystemComponentProps,
} from "./SelectionSystem";

// Camera Controller
export {
  useCameraController,
  CameraController,
  worldToScreen,
  screenToWorld,
} from "./CameraController";
export type { CameraControllerProps } from "./CameraController";
