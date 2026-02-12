import { useCallback, useEffect, useRef, createContext, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { useGameStore, type GameAgent, type AgentState, type DragonType } from "@/app/components/a2ui/game/store/gameStore";
import { useFileOperations } from '@/app/components/a2ui/game/entities/FileOperation';
import type { AgentMiddlewareConfig } from "./agentConfigTypes";
import type { LLMProvider } from "@/app/lib/deepagents-interop/a2a/providers";

// ============================================================================
// Types
// ============================================================================

export interface AgentConfig {
  name?: string;
  model?: string;
  tools?: any[];
  systemPrompt?: string;
  modelProvider?: LLMProvider;
  middleware?: AgentMiddlewareConfig;
  subagents?: any[];
  skills?: string[];
}

// Reference to a DeepAgent that's created on the server
export interface DeepAgentRef {
  id: string;
  config: AgentConfig;
}

export interface AgentEvent {
  type: AgentEventType;
  agentId: string;
  timestamp: number;
  data?: any;
}

export type AgentEventType =
  | "agent:created"
  | "agent:thinking"
  | "agent:spoke"
  | "tool:call:start"
  | "tool:call:complete"
  | "tool:call:error"
  | "subagent:spawned"
  | "file:written"
  | "file:read"
  | "error:occurred"
  | "goal:completed"
  | "agent:moving"
  | "agent:step_started"
  | "agent:step_completed"
  | "agent:progress_update"
  | "agent:token_update"
  | "agent:checkpoint_reached";

// ============================================================================
// Event Mappings
// ============================================================================

const EVENT_TO_STATE: Record<AgentEventType, AgentState> = {
  "agent:created": "IDLE",
  "agent:thinking": "THINKING",
  "agent:spoke": "IDLE",
  "tool:call:start": "WORKING",
  "tool:call:complete": "IDLE",
  "tool:call:error": "ERROR",
  "subagent:spawned": "WORKING",
  "file:written": "COMPLETING",
  "file:read": "WORKING",
  "error:occurred": "ERROR",
  "goal:completed": "COMPLETING",
  "agent:moving": "MOVING",
  "agent:step_started": "WORKING",
  "agent:step_completed": "IDLE",
  "agent:progress_update": "WORKING",
  "agent:token_update": "WORKING",
  "agent:checkpoint_reached": "IDLE",
};

const ERROR_TO_DRAGON_TYPE = (error: string): DragonType => {
  const lower = error.toLowerCase();
  if (lower.includes("syntax") || lower.includes("parse")) return "SYNTAX";
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection")) return "NETWORK";
  if (lower.includes("permission") || lower.includes("access") || lower.includes("auth")) return "PERMISSION";
  if (lower.includes("runtime") || lower.includes("execution")) return "RUNTIME";
  return "UNKNOWN";
};

// ============================================================================
// Agent Bridge Hook
// ============================================================================

export function useAgentBridge() {
  const spawnAgent = useGameStore((state) => state.spawnAgent);
  const updateAgent = useGameStore((state) => state.updateAgent);
  const setAgentState = useGameStore((state) => state.setAgentState);
  const setThoughtBubble = useGameStore((state) => state.setThoughtBubble);
  const spawnDragon = useGameStore((state) => state.spawnDragon);
  const removeDragon = useGameStore((state) => state.removeDragon);
  const { addOperation } = useFileOperations();

  // Spawn a new Deep Agent and create visual representation
  const spawnDeepAgent = useCallback(
    async (config: AgentConfig = {}): Promise<string> => {
      const agentId = uuidv4();
      const name = config.name || `Agent-${agentId.slice(0, 6)}`;

      // Spawn visual agent
      const gameAgent = spawnAgent(name, [25 + Math.random() * 5, 0, 25 + Math.random() * 5]);

      // Store Deep Agent reference (agent is created on the server via API)
      updateAgent(gameAgent.id, {
        agentRef: {
          id: agentId,
          config: { ...config, model: config.model || "gpt-4o-mini" },
        },
      });

      return gameAgent.id;
    },
    [spawnAgent, updateAgent]
  );

  // Map agent state to visual state
  const syncVisualState = useCallback(
    (agentId: string, event: AgentEvent) => {
      const targetState = EVENT_TO_STATE[event.type];
      if (targetState) {
        setAgentState(agentId, targetState);
      }

      const store = useGameStore.getState();

      // Set thought bubble for thinking
      if (event.type === "agent:thinking" && event.data?.thought) {
        setThoughtBubble(agentId, event.data.thought);
      }

      // Clear thought bubble after work completes
      if (event.type === "tool:call:complete" || event.type === "goal:completed") {
        setThoughtBubble(agentId, null);
      }

      // Handle checkpoint-specific events
      switch (event.type) {
        case "agent:step_started":
          store.updateAgent(agentId, {
            currentStepDescription: event.data?.description || "Processing...",
            state: "WORKING",
          });
          setThoughtBubble(agentId, event.data?.description || "Working on task...");
          store.addLog('info', `🔄 Agent started step: ${event.data?.description}`, 'agent');
          break;

        case "agent:step_completed":
          if (event.data?.checkpointId) {
            store.completeCheckpoint(
              event.data.checkpointId,
              event.data.result || "Completed",
              event.data.tokens || 0
            );
            moveToNextCheckpoint(agentId);
            store.addLog('success', `✅ Agent completed step (${event.data.tokens || 0} tokens)`, 'agent');
          }
          break;

        case "agent:token_update":
          if (event.data?.tokens) {
            store.updateTokenUsage(agentId, event.data.tokens);
            store.addLog('debug', `📊 Token update: ${event.data.tokens} tokens used`, 'agent');
          }
          break;

        case "agent:progress_update":
          if (event.data?.progress) {
            store.updateAgentProgress(agentId, event.data.progress);
            store.addLog('debug', `📈 Progress: ${event.data.progress.percentComplete}%`, 'agent');
          }
          break;

        case "agent:checkpoint_reached":
          if (event.data?.checkpointId) {
            store.setAgentCheckpoint(agentId, event.data.checkpointId);
            store.addLog('info', `🎯 Agent reached checkpoint`, 'agent');
          }
          break;
      }
    },
    [setAgentState, setThoughtBubble]
  );

  // Move agent to next checkpoint in sequence
  const moveToNextCheckpoint = useCallback((agentId: string) => {
    const store = useGameStore.getState();
    const agent = store.agents[agentId];

    if (!agent.currentQuestId) return;

    const quest = store.quests[agent.currentQuestId];
    if (!quest || !quest.checkpointIds) return;

    const currentIndex = quest.checkpointIds.findIndex(
      (id) => id === agent.currentCheckpointId
    );

    if (currentIndex < quest.checkpointIds.length - 1) {
      // Move to next checkpoint
      const nextCheckpointId = quest.checkpointIds[currentIndex + 1];
      const nextCheckpoint = store.checkpoints[nextCheckpointId];

      if (nextCheckpoint) {
        store.setAgentCheckpoint(agentId, nextCheckpointId);
        store.setAgentTarget(agentId, nextCheckpoint.position);
        store.setAgentState(agentId, "MOVING");

        // Update progress
        store.updateAgentProgress(agentId, {
          currentStep: currentIndex + 2,
          totalSteps: quest.checkpointIds.length,
          percentComplete: ((currentIndex + 2) / quest.checkpointIds.length) * 100,
        });
      }
    } else {
      // Quest complete
      store.updateQuest(quest.id, { status: "completed" });
      store.setAgentState(agentId, "COMPLETING");
      setThoughtBubble(agentId, "Quest complete!");

      // Clear checkpoint data
      store.updateAgent(agentId, {
        currentQuestId: undefined,
        currentCheckpointId: undefined,
        currentStepDescription: undefined,
      });
    }
  }, [setThoughtBubble]);

  // Handle tool call visualization
  const handleToolCall = useCallback(
    (agentId: string, toolName: string, status: "start" | "complete" | "error") => {
      if (status === "start") {
        setThoughtBubble(agentId, `🔧 ${toolName}...`);
      } else if (status === "complete") {
        setThoughtBubble(agentId, `✅ ${toolName} done`);
        setTimeout(() => setThoughtBubble(agentId, null), 2000);
      } else if (status === "error") {
        setThoughtBubble(agentId, `❌ ${toolName} failed`);
      }
    },
    [setThoughtBubble]
  );

  // Handle error -> dragon spawn
  const handleError = useCallback(
    (agentId: string, error: string) => {
      const agent = useGameStore.getState().agents[agentId];
      if (!agent) return;

      const dragonType = ERROR_TO_DRAGON_TYPE(error);
      const dragon = spawnDragon(
        dragonType,
        [agent.position[0] + 2, 0, agent.position[2]] as [number, number, number],
        error,
        agentId
      );

      // Set agent to combat state
      setAgentState(agentId, "COMBAT");

      return dragon.id;
    },
    [spawnDragon, setAgentState]
  );

  // Handle subagent spawn
  const handleSubagentSpawn = useCallback(
    (parentAgentId: string, subagentName: string) => {
      const parent = useGameStore.getState().agents[parentAgentId];
      if (!parent) return;

      // Spawn subagent visual near parent
      const subagent = spawnAgent(
        subagentName,
        [
          parent.position[0] + (Math.random() - 0.5) * 3,
          0,
          parent.position[2] + (Math.random() - 0.5) * 3,
        ],
        null,
        parentAgentId
      );

      return subagent.id;
    },
    [spawnAgent]
  );

  // Handle file read operation
  const handleFileRead = useCallback(
    (agentId: string, filename: string) => {
      const agent = useGameStore.getState().agents[agentId];
      if (!agent) return;

      addOperation(agentId, "read", filename, agent.position);
      setThoughtBubble(agentId, `📖 Reading ${filename}...`);
    },
    [addOperation, setThoughtBubble]
  );

  // Handle file write operation
  const handleFileWrite = useCallback(
    (agentId: string, filename: string) => {
      const agent = useGameStore.getState().agents[agentId];
      if (!agent) return;

      addOperation(agentId, "write", filename, agent.position);
      setThoughtBubble(agentId, `✍️ Writing ${filename}...`);
    },
    [addOperation, setThoughtBubble]
  );

  // Invoke an agent with a message
  const invokeAgent = useCallback(
    async (agentId: string, message: string): Promise<void> => {
      const agent = useGameStore.getState().agents[agentId];
      if (!agent?.agentRef) {
        console.error(`Agent ${agentId} not found or not initialized`);
        setAgentState(agentId, "ERROR");
        setThoughtBubble(agentId, "❌ Agent not ready");
        return;
      }

      // Set agent to thinking state
      setAgentState(agentId, "THINKING");
      setThoughtBubble(agentId, "🤔 Processing...");

      try {
        // Get agent configuration for backend
        const agentData = agent.agentRef || {};
        const agentName = agent.name;
        const equippedTool = agent.equippedTool;

        // Invoke the agent via API route with configuration
        const response = await fetch(`/api/agents/${agentId}/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: message,
            context: {
              agentConfig: {
                name: agentName,
                description: `Game agent ${agentName}`,
                equippedTool,
                systemPrompt: `You are ${agentName}, a helpful AI agent in a game world. ${
                  equippedTool
                    ? `You are equipped with the ${equippedTool.name} tool, which gives you ${equippedTool.description}. `
                    : ''
                }Work collaboratively with other agents to complete quests and achieve goals.`,
              },
            },
            config: {
              threadId: agentId, // Use agentId as thread for conversation persistence
              model: agentData.config?.model || "claude-sonnet-4-20250514",
              temperature: agentData.config?.temperature ?? 0,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        // Process the stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                try {
                  const parsed = JSON.parse(data);

                  // Update agent state based on stream events
                  if (parsed?.events) {
                    for (const event of parsed.events) {
                      const agentEvent: AgentEvent = {
                        type: event.type || "agent:spoke",
                        agentId,
                        timestamp: Date.now(),
                        data: event.data,
                      };
                      syncVisualState(agentId, agentEvent);

                      // Handle specific event types
                      const store = useGameStore.getState();
                      switch (agentEvent.type) {
                        case "tool:call:start":
                          handleToolCall(agentId, agentEvent.data?.tool || "tool", "start");
                          store.addLog('info', `🔧 Tool call started: ${agentEvent.data?.tool}`, 'agent');
                          break;
                        case "tool:call:complete":
                          handleToolCall(agentId, agentEvent.data?.tool || "tool", "complete");
                          store.addLog('success', `✅ Tool call completed: ${agentEvent.data?.tool}`, 'agent');
                          break;
                        case "tool:call:error":
                          handleToolCall(agentId, agentEvent.data?.tool || "tool", "error");
                          handleError(agentId, agentEvent.data?.error || "Tool call failed");
                          store.addLog('error', `❌ Tool call error: ${agentEvent.data?.error}`, 'agent');
                          break;
                        case "error:occurred":
                          handleError(agentId, agentEvent.data?.error || "Unknown error");
                          store.addLog('error', `❌ Error: ${agentEvent.data?.error}`, 'agent');
                          break;
                        case "subagent:spawned":
                          handleSubagentSpawn(agentId, agentEvent.data?.name || "Subagent");
                          store.addLog('info', `👥 Subagent spawned: ${agentEvent.data?.name}`, 'agent');
                          break;
                      }
                    }
                  }

                  // Handle LangGraph streaming format
                  if (parsed?.[agentId]?.messages) {
                    syncVisualState(agentId, {
                      type: "agent:spoke",
                      agentId,
                      timestamp: Date.now(),
                      data: parsed[agentId],
                    });
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }
        }

        // Set agent back to IDLE state
        setAgentState(agentId, "IDLE");
      } catch (error) {
        console.error(`Error invoking agent ${agentId}:`, error);
        handleError(agentId, (error as Error).message || "Invocation failed");
      }
    },
    [setAgentState, setThoughtBubble, syncVisualState, handleToolCall, handleError, handleSubagentSpawn]
  );

  return {
    spawnDeepAgent,
    invokeAgent,
    syncVisualState,
    handleToolCall,
    handleError,
    handleSubagentSpawn,
    handleFileRead,
    handleFileWrite,
    moveToNextCheckpoint,
  };
}

// ============================================================================
// Deep Agent Stream Processor
// ============================================================================

interface StreamProcessorOptions {
  agentId: string;
  onEvent?: (event: AgentEvent) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function processAgentStream(
  stream: AsyncIterable<any>,
  options: StreamProcessorOptions
): { cancel: () => void } {
  const { agentId, onEvent, onComplete, onError } = options;
  let cancelled = false;

  const process = async () => {
    try {
      for await (const chunk of stream) {
        if (cancelled) break;

        // Parse chunk and emit events
        if (chunk?.events) {
          for (const event of chunk.events) {
            const agentEvent: AgentEvent = {
              type: event.type || "agent:spoke",
              agentId,
              timestamp: Date.now(),
              data: event.data,
            };
            onEvent?.(agentEvent);
          }
        }

        // Handle LangGraph streaming format
        if (chunk?.[agentId]?.messages) {
          onEvent?.({
            type: "agent:spoke",
            agentId,
            timestamp: Date.now(),
            data: chunk[agentId],
          });
        }
      }
      onComplete?.();
    } catch (error) {
      if (!cancelled) {
        onError?.(error as Error);
      }
    }
  };

  process();

  return {
    cancel: () => {
      cancelled = true;
    },
  };
}

// ============================================================================
// Agent Bridge Component
// ============================================================================

interface AgentBridgeProviderProps {
  children: React.ReactNode;
}

export function AgentBridgeProvider({ children }: AgentBridgeProviderProps) {
  const activeStreams = useRef<Map<string, () => void>>(new Map());
  const bridge = useAgentBridge();

  // Register an agent for streaming (no-op - agents are managed via API)
  const registerAgent = useCallback(
    (agentId: string, _deepAgent: any) => {
      // Agents are now managed via API routes, no need to register here
      console.log(`Agent ${agentId} registered (managed via API)`);
    },
    []
  );

  // Unregister an agent
  const unregisterAgent = useCallback((agentId: string) => {
    const cancel = activeStreams.current.get(agentId);
    if (cancel) {
      cancel();
      activeStreams.current.delete(agentId);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const cancel of activeStreams.current.values()) {
        cancel();
      }
      activeStreams.current.clear();
    };
  }, []);

  return (
    <AgentBridgeContext.Provider value={{ registerAgent, unregisterAgent, bridge }}>
      {children}
    </AgentBridgeContext.Provider>
  );
}

// ============================================================================
// Agent Bridge Context
// ============================================================================

interface AgentBridgeContextValue {
  registerAgent: (agentId: string, deepAgentRef: DeepAgentRef) => void;
  unregisterAgent: (agentId: string) => void;
  bridge: ReturnType<typeof useAgentBridge>;
}

const AgentBridgeContext = createContext<AgentBridgeContextValue | null>(null);

export function useAgentBridgeContext() {
  const context = useContext(AgentBridgeContext);
  if (!context) {
    throw new Error("useAgentBridgeContext must be used within AgentBridgeProvider");
  }
  return context;
}

// ============================================================================
// Simulated Agent Events (for testing without real Deep Agent)
// ============================================================================

export function createMockAgentStream(agentId: string): AsyncIterable<AgentEvent> {
  const events: AgentEvent[] = [
    { type: "agent:created", agentId, timestamp: Date.now() },
    { type: "agent:thinking", agentId, timestamp: Date.now() + 100, data: { thought: "🤔 Processing..." } },
    { type: "tool:call:start", agentId, timestamp: Date.now() + 500, data: { tool: "search" } },
    { type: "tool:call:complete", agentId, timestamp: Date.now() + 2000, data: { tool: "search" } },
    { type: "goal:completed", agentId, timestamp: Date.now() + 2500 },
  ];

  return (async function* () {
    for (const event of events) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield event;
    }
  })();
}

export function createMockAgentErrorStream(agentId: string, error: string): AsyncIterable<AgentEvent> {
  const events: AgentEvent[] = [
    { type: "agent:created", agentId, timestamp: Date.now() },
    { type: "agent:thinking", agentId, timestamp: Date.now() + 100 },
    { type: "tool:call:start", agentId, timestamp: Date.now() + 500, data: { tool: "code_executor" } },
    { type: "tool:call:error", agentId, timestamp: Date.now() + 1500, data: { tool: "code_executor", error } },
    { type: "error:occurred", agentId, timestamp: Date.now() + 1600, data: { error } },
  ];

  return (async function* () {
    for (const event of events) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      yield event;
    }
  })();
}
