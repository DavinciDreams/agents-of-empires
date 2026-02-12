import { useRef, useCallback, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { useGameStore, useAgentsShallow, useDragonsShallow, useQuestsShallow, useTilesShallow, type AgentState, type GameAgent, type Dragon, type Quest } from '@/app/components/a2ui/game/store';
import { useCombat } from '@/app/components/a2ui/game/entities/Dragon';
import { findPath } from '@/app/components/a2ui/game/world/WorldManager';

// ============================================================================
// Game Configuration
// ============================================================================

export interface GameConfig {
  tickRate?: number; // Updates per second
  autoSave?: boolean;
  debugMode?: boolean;
}

const DEFAULT_CONFIG: GameConfig = {
  tickRate: 30, // Reduced from 60 to 30 for better performance
  autoSave: false,
  debugMode: false,
};

// ============================================================================
// State Duration Constants (in milliseconds)
// ============================================================================

const STATE_DURATIONS = {
  THINKING: 2000,  // 2 seconds
  WORKING: 3000,  // 3 seconds
  COMPLETING: 1500, // 1.5 seconds
} as const;

// ============================================================================
// Checkpoint Execution
// ============================================================================

/**
 * Execute a checkpoint task by invoking the Deep Agent
 */
async function executeCheckpointTask(agentId: string, checkpointId: string) {
  const store = useGameStore.getState();
  const agent = store.agents[agentId];
  const checkpoint = store.checkpoints[checkpointId];

  if (!agent || !checkpoint) {
    console.warn(`[executeCheckpointTask] Agent or checkpoint not found`);
    return;
  }

  // Log the execution start
  store.addLog('info', `🎯 Agent executing: ${checkpoint.description}`, 'agent');

  // Update checkpoint status to active
  store.updateCheckpoint(checkpointId, { status: 'active' });

  try {
    // Call the streaming API endpoint to execute the task
    const response = await fetch('/api/agents/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        checkpointId,
        task: checkpoint.description,
        estimatedTokens: checkpoint.estimatedTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute checkpoint: ${response.statusText}`);
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        const eventMatch = line.match(/^event: (.+)$/m);
        const dataMatch = line.match(/^data: (.+)$/m);

        if (eventMatch && dataMatch) {
          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          switch (event) {
            case 'start':
              store.updateAgent(agentId, { state: 'THINKING' });
              store.addLog('debug', `🔄 Task started`, 'agent');
              break;

            case 'thinking':
              store.updateAgent(agentId, { state: 'THINKING' });
              if (data.message) {
                store.addLog('debug', `💭 ${data.message}`, 'agent');
              }
              break;

            case 'token':
              tokenCount++;
              // Update token count periodically (every 50 tokens)
              if (tokenCount % 50 === 0) {
                store.updateTokenUsage(agentId, tokenCount);
              }
              break;

            case 'tool_start':
              store.addLog('info', `🔧 Using tool: ${data.tool}`, 'agent');
              break;

            case 'tool_end':
              store.addLog('success', `✅ Tool completed`, 'agent');
              break;

            case 'tool_error':
              store.addLog('error', `❌ Tool error: ${data.error}`, 'agent');
              break;

            case 'complete':
              const finalTokens = data.tokens || tokenCount;
              store.completeCheckpoint(checkpointId, data.output || 'Completed', finalTokens);
              store.updateAgent(agentId, { state: 'COMPLETING' });
              store.addLog('success', `✅ Checkpoint completed (${finalTokens} tokens)`, 'agent');
              break;

            case 'error':
              throw new Error(data.error);
          }
        }
      }
    }

  } catch (error) {
    console.error('[executeCheckpointTask] Error:', error);
    store.addLog('error', `❌ Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'agent');
    store.updateCheckpoint(checkpointId, { status: 'pending' });
    store.updateAgent(agentId, { state: 'ERROR' });
  }
}

// ============================================================================
// Game Hook
// ============================================================================()

export function useGame(config: GameConfig = DEFAULT_CONFIG) {
  const { tickRate = 60 } = config;
  const lastTick = useRef(0);
  const tickAccumulator = useRef(0);
  const tickInterval = 1000 / tickRate;
  const tiles = useTilesShallow() as Record<string, { walkable: boolean }>;
  const worldSize = useGameStore((state) => state.worldSize);

  // Don't subscribe to agents/dragons - use getState() in useFrame instead
  // This prevents infinite re-renders inside Canvas
  const updateAgent = useGameStore((state) => state.updateAgent);
  const updateDragon = useGameStore((state) => state.updateDragon);
  const setAgentPath = useGameStore((state) => state.setAgentPath);
  const { callForReinforcements } = useCombat();

  // Track agents that have already called for reinforcements to avoid spam
  const reinforcementCallers = useRef<Set<string>>(new Set());

  // Move agent towards target
  const moveAgentTowardsTarget = useCallback((agent: GameAgent, now: number, delta: number) => {
  // Move agent towards target using pathfinding
    const speed = 5; // units per second
    const current = new Vector3(...agent.position);
    const store = useGameStore.getState();
    
    // Check if targetPosition exists before creating Vector3
    if (!agent.targetPosition) return;
    const target = new Vector3(...agent.targetPosition);

    // Check if we need to compute a new path
    if (!agent.currentPath && agent.targetPosition) {
      const startX = Math.floor(current.x);
      const startZ = Math.floor(current.z);
      const endX = Math.floor(target.x);
      const endZ = Math.floor(target.z);

      // Compute A* path
      const path = findPath(startX, startZ, endX, endZ, tiles, worldSize.width, worldSize.height);

      if (path && path.length > 0) {
        // Path found - set it on the agent
        setAgentPath(agent.id, path);
      } else {
        // No path found - move directly (fallback behavior)
        const direction = target.clone().sub(current);
        const distance = direction.length();

        if (distance < 0.1) {
          // Agent reached target - check if it's a checkpoint
          const shouldStartWork = agent.currentTask && agent.currentCheckpointId;

          store.updateAgent(agent.id, {
            position: [target.x, target.y, target.z],
            targetPosition: null,
            currentPath: null,
            state: shouldStartWork ? "WORKING" : "IDLE",
          });

          // If this is a checkpoint, invoke the Deep Agent to execute the task
          if (shouldStartWork) {
            executeCheckpointTask(agent.id, agent.currentCheckpointId!);
          }
          return;
        }

        // Use actual delta time instead of hard-coded 0.016
        const moveDist = speed * delta;
        direction.normalize().multiplyScalar(Math.min(moveDist, distance));

        const newPos = current.add(direction);
        store.setAgentPosition(agent.id, [newPos.x, newPos.y, newPos.z]);
        store.updateAgent(agent.id, { lastMove: now });
        return;
      }
    }

    // Follow the computed path
    if (agent.currentPath && agent.pathIndex < agent.currentPath.length) {
      const nextTile = agent.currentPath[agent.pathIndex];
      const nextPos = new Vector3(nextTile[0] + 0.5, 0, nextTile[1] + 0.5);
      const direction = nextPos.sub(current);
      const distance = direction.length();

      if (distance < 0.2) {
        // Reached this waypoint, move to next
        store.updateAgent(agent.id, { pathIndex: agent.pathIndex + 1 });

        // Check if we've reached the final destination
        if (agent.pathIndex + 1 >= agent.currentPath.length) {
          const finalTarget = new Vector3(...agent.targetPosition);
          const shouldStartWork = agent.currentTask && agent.currentCheckpointId;

          store.updateAgent(agent.id, {
            position: [finalTarget.x, finalTarget.y, finalTarget.z],
            targetPosition: null,
            currentPath: null,
            pathIndex: 0,
            state: shouldStartWork ? "WORKING" : "IDLE",
          });

          // If this is a checkpoint, invoke the Deep Agent to execute the task
          if (shouldStartWork) {
            executeCheckpointTask(agent.id, agent.currentCheckpointId!);
          }
        }
      } else {
        // Move towards next waypoint
        // Use actual delta time instead of hard-coded 0.016
        const moveDist = speed * delta;
        direction.normalize().multiplyScalar(Math.min(moveDist, distance));

        const newPos = current.add(direction);
        store.setAgentPosition(agent.id, [newPos.x, newPos.y, newPos.z]);
        store.updateAgent(agent.id, { lastMove: now });
      }
    }
  }, [tiles, worldSize, setAgentPath]);

  // Update agent state based on current state
  const updateAgentState = useCallback((agent: GameAgent, now: number) => {
    switch (agent.state) {
      case "THINKING":
        // Simulate thinking duration
        if (!agent.thinkStart) {
          useGameStore.getState().updateAgent(agent.id, { thinkStart: now });
        } else if (now - agent.thinkStart > STATE_DURATIONS.THINKING) {
          // Done thinking
          useGameStore.getState().updateAgent(agent.id, {
            state: "IDLE",
            thinkStart: null,
          });
        }
        break;

      case "WORKING":
        // Simulate work duration
        if (!agent.workStart) {
          useGameStore.getState().updateAgent(agent.id, { workStart: now });
        } else if (now - agent.workStart > STATE_DURATIONS.WORKING) {
          // Done working
          useGameStore.getState().updateAgent(agent.id, {
            state: "COMPLETING",
            workStart: null,
          });
        }
        break;

      case "COMPLETING":
        // Show completion for a moment then go idle
        if (!agent.completeStart) {
          useGameStore.getState().updateAgent(agent.id, { completeStart: now });
        } else if (now - agent.completeStart > STATE_DURATIONS.COMPLETING) {
          useGameStore.getState().updateAgent(agent.id, {
            state: "IDLE",
            completeStart: null,
            currentTask: "Awaiting orders...",
          });
        }
        break;

      case "ERROR":
        // Stay in error state until player intervenes
        // Clear reinforcement flag when agent is defeated
        reinforcementCallers.current.delete(agent.id);
        break;

      case "IDLE":
        // Clear reinforcement flag when agent leaves combat
        reinforcementCallers.current.delete(agent.id);
        break;

      case "COMBAT":
        // Check if agent needs reinforcements
        if (agent.health < agent.maxHealth * 0.4 && !reinforcementCallers.current.has(agent.id)) {
          // Agent is below 40% health - call for reinforcements!
          reinforcementCallers.current.add(agent.id);

          // Find the dragon this agent is fighting
          const dragons = useGameStore.getState().dragons;
          const nearbyDragon = Object.values(dragons).find((dragon) => {
            const agentPos = new Vector3(...agent.position);
            const dragonPos = new Vector3(...dragon.position);
            return agentPos.distanceTo(dragonPos) < 10;
          });

          if (nearbyDragon) {
            const reinforced = callForReinforcements(agent.id, nearbyDragon.id, 20);

            // Update agent's task to show reinforcement call
            if (reinforced.length > 0) {
              updateAgent(agent.id, {
                currentTask: `Called ${reinforced.length} reinforcements!`,
              });
            }
          }
        }
        break;
    }
  }, []);

  // Update dragon AI
  const updateDragonAI = useCallback((dragon: Dragon, _now: number, delta: number) => {
    // Simple AI: move toward target agent if exists
    if (dragon.targetAgentId) {
      const agent = useGameStore.getState().agents[dragon.targetAgentId];
      if (agent) {
        const dragonPos = new Vector3(...dragon.position);
        const agentPos = new Vector3(...agent.position);
        const direction = agentPos.sub(dragonPos).normalize();
        const speed = 1; // Dragons move slower

        // Move dragon closer using actual delta time instead of hard-coded 0.016
        const newPos = dragonPos.add(direction.multiplyScalar(speed * delta));
        useGameStore.getState().updateDragon(dragon.id, {
          position: [newPos.x, newPos.y, newPos.z],
        });

        // Attack if in range
        if (dragonPos.distanceTo(agentPos) < 2) {
          // Dragon attacks!
          const damage = 5 + Math.floor(Math.random() * 10);
          useGameStore.getState().updateAgent(dragon.targetAgentId, {
            health: Math.max(0, agent.health - damage),
          });
        }
      }
    }
  }, []);

  // Single game tick
  const gameTick = useCallback((now: number, delta: number) => {
    // Use getState() to get current values without subscribing
    const agents = useGameStore.getState().agents;
    const dragons = useGameStore.getState().dragons;

    // Update agent positions
    for (const id in agents) {
      const agent = agents[id];
      if (agent.targetPosition) {
        moveAgentTowardsTarget(agent, now, delta);
      }

      // Update agent state timers
      updateAgentState(agent, now);
    }

    // Update dragon AI
    for (const id in dragons) {
      const dragon = dragons[id];
      updateDragonAI(dragon, now, delta);
    }
  }, [moveAgentTowardsTarget, updateDragonAI, updateAgentState]);

  // Game tick - runs every frame at tick rate
  useFrame((_, delta) => {
    const now = performance.now();
    tickAccumulator.current += delta * 1000;

    // Process ticks
    while (tickAccumulator.current >= tickInterval) {
      tickAccumulator.current -= tickInterval;
      gameTick(now, delta);
    }
  });

  return {
    lastTick,
  };
}

// ============================================================================
// Game Timer Hook
// ============================================================================()

export function useGameTime() {
  const [gameTime, setGameTime] = useState(0);
  const startTime = useRef(performance.now());

  useFrame(() => {
    setGameTime(performance.now() - startTime.current);
  });

  // Format time as MM:SS
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    gameTime,
    formattedTime: formatTime(gameTime),
  };
}

// ============================================================================
// Game Stats Hook
// ============================================================================()

export function useGameStats() {
  const agents = useAgentsShallow() as Record<string, GameAgent>;
  const dragons = useDragonsShallow() as Record<string, Dragon>;
  const quests = useQuestsShallow() as Record<string, Quest>;

  const stats = {
    totalAgents: Object.keys(agents).length,
    activeAgents: Object.values(agents).filter((a) => a.state !== "IDLE").length,
    idleAgents: Object.values(agents).filter((a) => a.state === "IDLE").length,
    totalDragons: Object.keys(dragons).length,
    activeQuests: Object.values(quests).filter((q) => q.status === "in_progress").length,
    completedQuests: Object.values(quests).filter((q) => q.status === "completed").length,
    averageLevel: Object.keys(agents).length > 0
      ? Object.values(agents).reduce((sum: number, a: GameAgent) => sum + a.level, 0) / Object.keys(agents).length
      : 0,
  };

  return stats;
}
