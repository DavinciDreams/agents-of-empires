/**
 * Metadata Extractor for DeepAgents
 *
 * Extracts capabilities, tools, subagents, and other metadata
 * from a DeepAgent configuration.
 */

import type { StructuredTool } from "@langchain/core/tools";
import type { AgentMiddleware } from "langchain";
import type { SubAgent } from "deepagents";
import type {
  AgentCapabilities,
  ToolMetadata,
  SubAgentMetadata,
  SkillMetadata,
} from "../types/agent-card";

/**
 * DeepAgent configuration (subset needed for extraction)
 */
export interface DeepAgentConfig {
  tools?: StructuredTool[];
  subagents?: SubAgent[];
  middleware?: AgentMiddleware[];
  skills?: string[];
  memory?: string[];
  backend?: unknown;
  checkpointer?: unknown | boolean;
  interruptOn?: Record<string, boolean | unknown>;
}

/**
 * Extract capabilities from a DeepAgent configuration
 */
export function extractCapabilities(
  config: DeepAgentConfig
): AgentCapabilities {
  return {
    tools: extractTools(config.tools || []),
    subagents: extractSubagents(config.subagents || []),
    skills: extractSkills(config.skills || []),
    planning: true, // DeepAgents always have planning via todoListMiddleware
    memory: hasMemory(config),
    streaming: true, // LangGraph always supports streaming
    filesystem: hasFilesystem(config),
    sandbox: hasSandbox(config),
    humanInTheLoop: hasHumanInTheLoop(config),
  };
}

/**
 * Extract tool metadata from LangChain tools
 */
export function extractTools(tools: StructuredTool[]): ToolMetadata[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.schema as any, // Zod schema - we'll convert to JSON Schema
    category: inferToolCategory(tool.name),
  }));
}

/**
 * Extract subagent metadata
 */
export function extractSubagents(subagents: SubAgent[]): SubAgentMetadata[] {
  return subagents.map((subagent) => ({
    name: subagent.name,
    description: subagent.description,
    capabilities: extractSubagentCapabilities(subagent),
    model: typeof subagent.model === "string" ? subagent.model : undefined,
  }));
}

/**
 * Extract skill metadata
 */
export function extractSkills(skillPaths: string[]): SkillMetadata[] {
  // Skills are loaded from SKILL.md files
  // For now, return basic metadata - we can enhance this by reading the files
  return skillPaths.map((path) => ({
    name: path.split("/").pop()?.replace(".md", "") || path,
    description: `Skill loaded from ${path}`,
    path,
  }));
}

/**
 * Check if agent has memory capability
 */
function hasMemory(config: DeepAgentConfig): boolean {
  return (
    !!config.memory && config.memory.length > 0 ||
    !!config.checkpointer
  );
}

/**
 * Check if agent has filesystem capability
 */
function hasFilesystem(config: DeepAgentConfig): boolean {
  // DeepAgents always have filesystem middleware
  return true;
}

/**
 * Check if agent has sandbox capability
 */
function hasSandbox(config: DeepAgentConfig): boolean {
  // Check if backend is a SandboxBackendProtocol
  // This is a simplified check - in reality we'd need to inspect the backend type
  return config.backend !== undefined && typeof config.backend === "object";
}

/**
 * Check if agent has human-in-the-loop capability
 */
function hasHumanInTheLoop(config: DeepAgentConfig): boolean {
  return !!config.interruptOn && Object.keys(config.interruptOn).length > 0;
}

/**
 * Extract capabilities from a subagent
 */
function extractSubagentCapabilities(subagent: SubAgent): string[] {
  const capabilities: string[] = [];

  if (subagent.tools && subagent.tools.length > 0) {
    capabilities.push("tools");
  }

  if (subagent.middleware && subagent.middleware.length > 0) {
    capabilities.push("middleware");
  }

  if (subagent.model) {
    capabilities.push("custom_model");
  }

  return capabilities;
}

/**
 * Infer tool category from tool name
 */
function inferToolCategory(toolName: string): string {
  const name = toolName.toLowerCase();

  if (name.includes("search") || name.includes("web")) {
    return "search";
  }

  if (
    name.includes("read") ||
    name.includes("write") ||
    name.includes("edit") ||
    name.includes("file")
  ) {
    return "filesystem";
  }

  if (name.includes("exec") || name.includes("shell") || name.includes("bash")) {
    return "execution";
  }

  if (name.includes("todo") || name.includes("plan")) {
    return "planning";
  }

  if (name.includes("task") || name.includes("agent")) {
    return "delegation";
  }

  return "general";
}

/**
 * Get model information from config
 */
export function extractModelInfo(model: unknown): {
  provider: string;
  name: string;
  version?: string;
} | undefined {
  if (typeof model === "string") {
    // Parse model string (e.g., "claude-sonnet-4-20250514")
    return parseModelString(model);
  }

  // If it's a model object, try to extract info
  if (model && typeof model === "object") {
    const modelObj = model as any;

    // ChatAnthropic, ChatOpenAI, etc.
    if (modelObj.modelName) {
      return parseModelString(modelObj.modelName);
    }

    if (modelObj.model) {
      return parseModelString(modelObj.model);
    }
  }

  return undefined;
}

/**
 * Parse model string to extract provider and version
 */
function parseModelString(modelStr: string): {
  provider: string;
  name: string;
  version?: string;
} {
  // Common patterns:
  // - claude-sonnet-4-20250514 (Anthropic)
  // - gpt-4o (OpenAI)
  // - gemini-2.0-flash (Google)

  if (modelStr.includes("claude")) {
    return {
      provider: "anthropic",
      name: modelStr,
      version: modelStr.match(/\d{8}$/)?.[0],
    };
  }

  if (modelStr.includes("gpt")) {
    return {
      provider: "openai",
      name: modelStr,
    };
  }

  if (modelStr.includes("gemini")) {
    return {
      provider: "google",
      name: modelStr,
    };
  }

  return {
    provider: "unknown",
    name: modelStr,
  };
}
