import { NextRequest } from "next/server";
import { HumanMessage } from "@langchain/core/messages";
import { createDeepAgent } from "deepagents";
import { createLLM, getAvailableProviders, type LLMProvider } from "@/app/lib/deepagents-interop/a2a/providers";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";
import { LocalSandbox } from "@/app/lib/deepagents-interop/sandbox/LocalSandbox";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Execute a checkpoint task with a Deep Agent
 * Streams progress updates via Server-Sent Events
 */
export async function POST(request: NextRequest) {
  const { agentId, checkpointId, task, estimatedTokens, recursionLimit } = await request.json();

  if (!task || typeof task !== "string") {
    return new Response(
      JSON.stringify({ error: "Task is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get available providers
  const availableProviders = getAvailableProviders();
  if (availableProviders.length === 0) {
    return new Response(
      JSON.stringify({ error: "No LLM providers configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Priority: ZAI > Anthropic > OpenAI > others
  const providerPriority: LLMProvider[] = ["zai", "anthropic", "openai", "groq", "openrouter", "together", "perplexity"];
  const selectedProvider = providerPriority.find(p => availableProviders.includes(p)) || availableProviders[0];

  console.log(`[Agent Execution] Agent ${agentId} executing checkpoint ${checkpointId} with provider: ${selectedProvider}`);

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Send start event
        send("start", { agentId, checkpointId, task });

        // Create the LLM
        const llm = createLLM(selectedProvider, {
          temperature: 0.3,
        });

        // Create Tavily search tool
        const tavilySearch = new TavilySearch({
          maxResults: 5,
          tavilyApiKey: process.env.TAVILY_API_KEY,
        });

        // Create persistent sandbox for this agent's quest
        // All checkpoints in the same quest will use the same sandbox
        const sandboxPath = path.join(process.cwd(), 'sandbox-workspace', agentId);
        const sandbox = new LocalSandbox({
          workingDirectory: sandboxPath,
          timeout: 60000, // 60 second timeout for commands
        });

        // Create a Deep Agent with tools and persistent sandbox
        const agent = createDeepAgent({
          model: llm,
          sandbox, // Use persistent sandbox
          systemPrompt: `You are an AI agent executing a software development task. Be concise and practical.

Focus on the specific task given. Break it down into steps if needed, and execute each step methodically.

You have access to a web search tool to research information when needed.

IMPORTANT FILE HANDLING:
- When creating code, HTML, CSS, or any text files, you MUST save them using shell commands
- Use 'cat > filename << 'EOF'' heredoc syntax to write multi-line files
- Example: cat > index.html << 'EOF'
  <html>...</html>
  EOF
- Always save your work - don't just describe what to create
- After creating files, confirm they exist with 'ls -la' or 'cat filename'

PERSISTENT FILES:
- Files you create persist across checkpoints in this quest
- If you created index.html in checkpoint 1, it will still exist in checkpoint 2
- You can reference and modify files from previous checkpoints
- Use 'ls -la' to see all existing files before starting work

IMPORTANT: Once you have completed the task, provide a clear final answer. Do not enter loops or repeatedly call the same tool with the same inputs. If a tool fails, try a different approach or explain the limitation.`,
          tools: [tavilySearch],
        });

        // Send thinking event
        send("thinking", { message: `Analyzing task: ${task}` });

        // Use configurable recursion limit with higher default
        const maxRecursion = recursionLimit || 100; // Default: 100 (was 50)
        let iterationCount = 0;

        // Invoke the agent
        const result = await agent.invoke(
          {
            messages: [new HumanMessage(task)],
          },
          {
            recursionLimit: maxRecursion,
            // Stream callback to send progress updates
            callbacks: [{
              handleLLMNewToken(token: string) {
                send("token", { token });
              },
              handleToolStart(tool: any, input: string) {
                iterationCount++;
                // Warn when approaching limit
                if (iterationCount >= maxRecursion * 0.8) {
                  send("warning", {
                    message: `Agent approaching iteration limit (${iterationCount}/${maxRecursion})`,
                    iterationCount,
                    maxRecursion
                  });
                }
                send("tool_start", { tool: tool.name, input, iteration: iterationCount });
              },
              handleToolEnd(output: string) {
                send("tool_end", { output });
              },
              handleToolError(error: Error) {
                send("tool_error", { error: error.message });
              },
            }],
          }
        );

        // Extract final message
        const lastMessage = result.messages[result.messages.length - 1];
        const finalOutput = typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

        // Send completion event with token count
        const tokenCount = estimatedTokens || 1000; // TODO: Get actual token count from result
        send("complete", {
          agentId,
          checkpointId,
          output: finalOutput,
          tokens: tokenCount,
          todos: result.todos?.map((t: any) => ({ content: t.content, status: t.status })) || [],
        });

        controller.close();
      } catch (error) {
        console.error("[Agent Execution] Error:", error);

        // Detect recursion limit errors and provide helpful guidance
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isRecursionLimit = errorMessage.includes("Recursion limit") || errorMessage.includes("recursion");

        send("error", {
          error: errorMessage,
          type: isRecursionLimit ? "recursion_limit" : "execution_error",
          suggestions: isRecursionLimit ? [
            "The task may be too complex - try breaking it into smaller checkpoints",
            "The agent may be stuck in a loop - rephrase the task more specifically",
            "Increase recursionLimit in the request (current: 100, try: 150 or 200)",
            "Check Intelligence Bureau for repeated tool calls"
          ] : undefined,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
