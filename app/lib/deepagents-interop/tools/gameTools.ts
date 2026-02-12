/**
 * Game Tools for DeepAgents
 *
 * LangChain StructuredTool implementations for game mechanics.
 * These tools allow agents to interact with the game world and perform actions.
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { LocalSandbox } from "../sandbox/LocalSandbox";
import { getUnsandboxManager } from "../../unsandbox/manager";
import fs from "fs/promises";
import path from "path";

// ============================================================================
// File System Tools
// ============================================================================

/**
 * File Read Tool
 * Allows agents to read files from their sandboxed workspace
 * Uses E2B remote sandbox if available, falls back to local filesystem
 */
export class FileReadTool extends StructuredTool {
  name = "read_file";
  description = "Read the contents of a file from the agent's workspace. Use this to examine code, data, or any text files.";

  schema = z.object({
    filepath: z.string().describe("The path to the file to read (relative to agent workspace)"),
  });

  private sandbox: LocalSandbox;
  private agentId: string;
  private useE2B: boolean;

  constructor(agentId: string, workingDirectory?: string) {
    super();
    this.agentId = agentId;
    this.sandbox = new LocalSandbox({
      workingDirectory: workingDirectory || `./sandbox-workspace/${agentId}`,
    });

    // Check if E2B is available
    const manager = getUnsandboxManager();
    this.useE2B = manager.isAvailable();

    if (!this.useE2B) {
      console.warn(
        `[FileReadTool] E2B_API_KEY not set, using local filesystem fallback for agent: ${agentId}`
      );
    }
  }

  async _call({ filepath }: z.infer<typeof this.schema>): Promise<string> {
    // Use E2B if available
    if (this.useE2B) {
      try {
        const manager = getUnsandboxManager();
        const e2bSandbox = await manager.getOrCreateSandbox(this.agentId);

        // Read file using E2B filesystem API
        const fileContent = await e2bSandbox.files.read(filepath);
        return `File: ${filepath}\n\n${fileContent}`;
      } catch (error) {
        if ((error as any).message?.includes("not found") || (error as any).message?.includes("does not exist")) {
          return `Error: File not found: ${filepath}`;
        }
        return `Error reading file from E2B: ${(error as Error).message}`;
      }
    }

    // Fallback to local filesystem
    try {
      await this.sandbox.ensureWorkspace();

      // Validate path is within sandbox
      const fullPath = path.join(this.sandbox.getWorkingDirectory(), filepath);
      const normalizedPath = path.normalize(fullPath);

      if (!normalizedPath.startsWith(this.sandbox.getWorkingDirectory())) {
        throw new Error("Access denied: Path outside workspace");
      }

      // Read file
      const content = await fs.readFile(normalizedPath, "utf-8");
      return `File: ${filepath}\n\n${content}`;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return `Error: File not found: ${filepath}`;
      }
      return `Error reading file: ${(error as Error).message}`;
    }
  }
}

/**
 * File Write Tool
 * Allows agents to write files to their sandboxed workspace
 * Uses E2B remote sandbox if available, falls back to local filesystem
 */
export class FileWriteTool extends StructuredTool {
  name = "write_file";
  description = "Write content to a file in the agent's workspace. Use this to create or update code, data, or configuration files.";

  schema = z.object({
    filepath: z.string().describe("The path to the file to write (relative to agent workspace)"),
    content: z.string().describe("The content to write to the file"),
  });

  private sandbox: LocalSandbox;
  private agentId: string;
  private useE2B: boolean;

  constructor(agentId: string, workingDirectory?: string) {
    super();
    this.agentId = agentId;
    this.sandbox = new LocalSandbox({
      workingDirectory: workingDirectory || `./sandbox-workspace/${agentId}`,
    });

    // Check if E2B is available
    const manager = getUnsandboxManager();
    this.useE2B = manager.isAvailable();

    if (!this.useE2B) {
      console.warn(
        `[FileWriteTool] E2B_API_KEY not set, using local filesystem fallback for agent: ${agentId}`
      );
    }
  }

  async _call({ filepath, content }: z.infer<typeof this.schema>): Promise<string> {
    // Use E2B if available
    if (this.useE2B) {
      try {
        const manager = getUnsandboxManager();
        const e2bSandbox = await manager.getOrCreateSandbox(this.agentId);

        // Write file using E2B filesystem API
        await e2bSandbox.files.write(filepath, content);
        return `Successfully wrote ${content.length} characters to ${filepath}`;
      } catch (error) {
        return `Error writing file to E2B: ${(error as Error).message}`;
      }
    }

    // Fallback to local filesystem
    try {
      await this.sandbox.ensureWorkspace();

      // Validate path is within sandbox
      const fullPath = path.join(this.sandbox.getWorkingDirectory(), filepath);
      const normalizedPath = path.normalize(fullPath);

      if (!normalizedPath.startsWith(this.sandbox.getWorkingDirectory())) {
        throw new Error("Access denied: Path outside workspace");
      }

      // Ensure parent directory exists
      const dir = path.dirname(normalizedPath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(normalizedPath, content, "utf-8");
      return `Successfully wrote ${content.length} characters to ${filepath}`;
    } catch (error) {
      return `Error writing file: ${(error as Error).message}`;
    }
  }
}

/**
 * List Files Tool
 * Allows agents to list files in their workspace
 * Uses E2B remote sandbox if available, falls back to local filesystem
 */
export class ListFilesTool extends StructuredTool {
  name = "list_files";
  description = "List files and directories in the agent's workspace. Use this to explore what files exist.";

  schema = z.object({
    directory: z.string().optional().describe("The directory to list (defaults to workspace root)"),
  });

  private sandbox: LocalSandbox;
  private agentId: string;
  private useE2B: boolean;

  constructor(agentId: string, workingDirectory?: string) {
    super();
    this.agentId = agentId;
    this.sandbox = new LocalSandbox({
      workingDirectory: workingDirectory || `./sandbox-workspace/${agentId}`,
    });

    // Check if E2B is available
    const manager = getUnsandboxManager();
    this.useE2B = manager.isAvailable();

    if (!this.useE2B) {
      console.warn(
        `[ListFilesTool] E2B_API_KEY not set, using local filesystem fallback for agent: ${agentId}`
      );
    }
  }

  async _call({ directory = "." }: z.infer<typeof this.schema>): Promise<string> {
    // Use E2B if available
    if (this.useE2B) {
      try {
        const manager = getUnsandboxManager();
        const e2bSandbox = await manager.getOrCreateSandbox(this.agentId);

        // List files using E2B filesystem API
        const entries = await e2bSandbox.files.list(directory);

        if (entries.length === 0) {
          return `Directory is empty: ${directory}`;
        }

        const files = entries.map(entry => {
          const type = entry.type === "dir" ? "[DIR]" : "[FILE]";
          return `${type} ${entry.name}`;
        });

        return `Files in ${directory}:\n${files.join("\n")}`;
      } catch (error) {
        return `Error listing files in E2B: ${(error as Error).message}`;
      }
    }

    // Fallback to local filesystem
    try {
      await this.sandbox.ensureWorkspace();

      // Validate path is within sandbox
      const fullPath = path.join(this.sandbox.getWorkingDirectory(), directory);
      const normalizedPath = path.normalize(fullPath);

      if (!normalizedPath.startsWith(this.sandbox.getWorkingDirectory())) {
        throw new Error("Access denied: Path outside workspace");
      }

      // List files
      const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
      const files = entries.map(entry => {
        const type = entry.isDirectory() ? "[DIR]" : "[FILE]";
        return `${type} ${entry.name}`;
      });

      if (files.length === 0) {
        return `Directory is empty: ${directory}`;
      }

      return `Files in ${directory}:\n${files.join("\n")}`;
    } catch (error) {
      return `Error listing files: ${(error as Error).message}`;
    }
  }
}

// ============================================================================
// Search Tool
// ============================================================================

/**
 * Web Search Tool
 * Allows agents to search the web for information
 * Note: This is a placeholder - implement with actual search API (Tavily, Google, etc.)
 */
export class WebSearchTool extends StructuredTool {
  name = "web_search";
  description = "Search the web for information. Use this when you need current information or answers to questions.";

  schema = z.object({
    query: z.string().describe("The search query"),
    maxResults: z.number().optional().describe("Maximum number of results (default: 5)"),
  });

  async _call({ query, maxResults = 5 }: z.infer<typeof this.schema>): Promise<string> {
    // TODO: Implement actual search API integration
    // Options: Tavily, Google Custom Search, Bing API, etc.

    return `[Search Tool - Not Yet Implemented]
Query: ${query}

To enable web search, integrate a search API:
1. Tavily: https://tavily.com (recommended for AI agents)
2. Google Custom Search: https://developers.google.com/custom-search
3. Bing Web Search API: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api

Add the API key to .env and implement the search logic here.`;
  }
}

// ============================================================================
// Code Execution Tool
// ============================================================================

/**
 * Code Execution Tool
 * Allows agents to execute code snippets (sandboxed)
 * Note: This is a placeholder - implement with actual sandbox (e2b, modal, etc.)
 */
export class CodeExecutionTool extends StructuredTool {
  name = "execute_code";
  description = "Execute code in a sandboxed environment. Use this to run scripts, test code, or perform computations.";

  schema = z.object({
    language: z.enum(["python", "javascript", "typescript", "bash"]).describe("Programming language"),
    code: z.string().describe("The code to execute"),
  });

  async _call({ language, code }: z.infer<typeof this.schema>): Promise<string> {
    // TODO: Implement actual code execution sandbox
    // Options: E2B, Modal, Docker containers, etc.

    return `[Code Execution Tool - Not Yet Implemented]
Language: ${language}
Code:
\`\`\`${language}
${code}
\`\`\`

To enable code execution, integrate a sandbox:
1. E2B: https://e2b.dev (recommended for AI code execution)
2. Modal: https://modal.com
3. Docker containers with resource limits

Add the integration and implement secure execution here.`;
  }
}

// ============================================================================
// Game Action Tools
// ============================================================================

/**
 * Quest Complete Tool
 * Allows agents to mark quests as complete
 */
export class QuestCompleteTool extends StructuredTool {
  name = "complete_quest";
  description = "Mark a quest objective as complete. Use this when you've accomplished a quest goal.";

  schema = z.object({
    questId: z.string().describe("The ID of the quest to complete"),
    notes: z.string().optional().describe("Optional notes about how the quest was completed"),
  });

  async _call({ questId, notes }: z.infer<typeof this.schema>): Promise<string> {
    // This will be handled by the game store via events
    // The tool returns a message, and the frontend listens for quest completion events
    return `Quest completion request sent for: ${questId}${notes ? `\nNotes: ${notes}` : ""}`;
  }
}

/**
 * Spawn Subagent Tool
 * Allows agents to spawn subagents for delegation
 */
export class SpawnSubagentTool extends StructuredTool {
  name = "spawn_subagent";
  description = "Spawn a new subagent to help with a specific task. Use this for delegation and parallel work.";

  schema = z.object({
    name: z.string().describe("Name for the subagent"),
    task: z.string().describe("The specific task for the subagent"),
    systemPrompt: z.string().optional().describe("Optional custom system prompt for the subagent"),
  });

  async _call({ name, task, systemPrompt }: z.infer<typeof this.schema>): Promise<string> {
    // This will be handled by the game store via events
    return `Subagent spawn request sent:
Name: ${name}
Task: ${task}
${systemPrompt ? `Custom Prompt: ${systemPrompt}` : ""}`;
  }
}

// ============================================================================
// Tool Factory
// ============================================================================

/**
 * Create tools for a game agent
 */
export function createGameTools(
  agentId: string,
  enabledTools: string[] = ["all"]
): StructuredTool[] {
  const tools: StructuredTool[] = [];

  const shouldInclude = (toolName: string) =>
    enabledTools.includes("all") || enabledTools.includes(toolName);

  // File system tools
  if (shouldInclude("file_read")) {
    tools.push(new FileReadTool(agentId));
  }
  if (shouldInclude("file_write")) {
    tools.push(new FileWriteTool(agentId));
  }
  if (shouldInclude("list_files")) {
    tools.push(new ListFilesTool(agentId));
  }

  // Search tools
  if (shouldInclude("web_search")) {
    tools.push(new WebSearchTool());
  }

  // Code execution
  if (shouldInclude("execute_code")) {
    tools.push(new CodeExecutionTool());
  }

  // Game actions
  if (shouldInclude("complete_quest")) {
    tools.push(new QuestCompleteTool());
  }
  if (shouldInclude("spawn_subagent")) {
    tools.push(new SpawnSubagentTool());
  }

  return tools;
}

/**
 * Map game tool types to enabled tools
 */
export function mapEquippedToolToEnabledTools(equippedTool?: {
  id: string;
  name: string;
  type: string;
}): string[] {
  if (!equippedTool) {
    return ["file_read", "file_write", "list_files"];
  }

  // Map tool types from ToolCard.tsx to actual tools
  const toolMapping: Record<string, string[]> = {
    "search": ["web_search", "file_read", "list_files"],
    "code": ["execute_code", "file_read", "file_write", "list_files"],
    "file": ["file_read", "file_write", "list_files"],
    "combat": ["complete_quest"],
    "delegation": ["spawn_subagent", "complete_quest"],
  };

  return toolMapping[equippedTool.type] || ["file_read", "file_write", "list_files"];
}
