import { NextRequest } from "next/server";
import { HumanMessage } from "@langchain/core/messages";
import { createDeepAgent } from "deepagents";
import { createLLM, getAvailableProviders, type LLMProvider } from "@/app/lib/deepagents-interop/a2a/providers";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";
import { resultsPersistence } from "@/app/lib/results-persistence";
import { retryWithBackoff, LLM_RETRY_OPTIONS, isTransientError } from "@/app/lib/utils/retry";
import { saveCheckpoint, type CheckpointData, type ToolOutput } from "@/app/lib/services/persistence";

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

  // Generate unique execution ID
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Initialize result record in database
      let resultId: string | null = null;

      try {
        // Create initial result record
        resultId = await resultsPersistence.saveResult({
          agentId: agentId || 'unknown',
          checkpointId,
          result: '',
          metadata: {
            task,
            estimatedTokens,
            recursionLimit,
            executionId,
          },
          status: 'running',
        });

        // Log execution start
        await resultsPersistence.saveLog({
          agentId: agentId || 'unknown',
          executionId,
          level: 'info',
          message: `Execution started: ${task}`,
          source: 'execute-route',
        });

        // Send start event
        send("start", { agentId, checkpointId, task, executionId, resultId });

        // Create the LLM
        const llm = createLLM(selectedProvider, {
          temperature: 0.3,
        });

        // Create Tavily search tool
        const tavilySearch = new TavilySearch({
          maxResults: 5,
          tavilyApiKey: process.env.TAVILY_API_KEY,
        });

        // Create a Deep Agent with tools
        const agent = createDeepAgent({
          model: llm,
          systemPrompt: `You are an AI agent executing a software development task. Be concise and practical.

Focus on the specific task given. Break it down into steps if needed, and execute each step methodically.

You have access to a web search tool to research information when needed.

IMPORTANT: Once you have completed the task, provide a clear final answer. Do not enter loops or repeatedly call the same tool with the same inputs. If a tool fails, try a different approach or explain the limitation.`,
          tools: [tavilySearch],
        });

        // Send thinking event
        send("thinking", { message: `Analyzing task: ${task}` });

        // Use configurable recursion limit with higher default
        const maxRecursion = recursionLimit || 100; // Default: 100 (was 50)
        let iterationCount = 0;
        const toolStartTimes = new Map<string, number>();

        // Track checkpoint data for recovery
        const checkpointData: CheckpointData = {
          step: 0,
          task,
          partialResults: [],
          toolOutputs: [],
          agentState: {},
          timestamp: new Date().toISOString(),
          metadata: { agentId, checkpointId, executionId },
        };
        const threadId = `thread_${executionId}`;

        // Invoke the agent with retry logic
        const result = await retryWithBackoff(
          async () => {
            return await agent.invoke(
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
                  async handleToolStart(tool: any, input: string) {
                    iterationCount++;
                    const toolKey = `${tool.name}_${iterationCount}`;
                    toolStartTimes.set(toolKey, Date.now());

                    // Update checkpoint data
                    checkpointData.step = iterationCount;

                    // Warn when approaching limit
                    if (iterationCount >= maxRecursion * 0.8) {
                      send("warning", {
                        message: `Agent approaching iteration limit (${iterationCount}/${maxRecursion})`,
                        iterationCount,
                        maxRecursion
                      });

                      // Log warning
                      await resultsPersistence.saveLog({
                        agentId: agentId || 'unknown',
                        executionId,
                        level: 'warn',
                        message: `Approaching iteration limit (${iterationCount}/${maxRecursion})`,
                        source: 'agent-callback',
                      });
                    }

                    // Save trace
                    await resultsPersistence.saveTrace({
                      agentId: agentId || 'unknown',
                      executionId,
                      type: 'tool_start',
                      content: `Tool: ${tool.name}`,
                      metadata: { input, iteration: iterationCount },
                    });

                    send("tool_start", { tool: tool.name, input, iteration: iterationCount });
                  },
                  async handleToolEnd(output: string, runId: string, parentRunId?: string, tags?: string[]) {
                    // Calculate duration
                    const toolKey = Array.from(toolStartTimes.keys()).pop();
                    const startTime = toolKey ? toolStartTimes.get(toolKey) : undefined;
                    const duration = startTime ? Date.now() - startTime : undefined;
                    if (toolKey) toolStartTimes.delete(toolKey);

                    // Store tool output in checkpoint data
                    const toolOutput: ToolOutput = {
                      toolName: toolKey?.split('_')[0] || 'unknown',
                      input: '',
                      output: output.substring(0, 1000),
                      timestamp: new Date().toISOString(),
                      duration,
                    };
                    checkpointData.toolOutputs.push(toolOutput);

                    // Save checkpoint after each tool call for recovery
                    if (checkpointId) {
                      try {
                        await saveCheckpoint(
                          agentId || 'unknown',
                          checkpointId,
                          threadId,
                          checkpointData
                        );
                      } catch (err) {
                        console.error('[Checkpoint] Failed to save:', err);
                      }
                    }

                    // Save trace
                    await resultsPersistence.saveTrace({
                      agentId: agentId || 'unknown',
                      executionId,
                      type: 'tool_end',
                      content: output.substring(0, 1000), // Limit size
                      metadata: { runId },
                      duration,
                    });

                    send("tool_end", { output });
                  },
                  async handleToolError(error: Error) {
                    // Save error log
                    await resultsPersistence.saveLog({
                      agentId: agentId || 'unknown',
                      executionId,
                      level: 'error',
                      message: `Tool error: ${error.message}`,
                      source: 'agent-callback',
                    });

                    // Save trace
                    await resultsPersistence.saveTrace({
                      agentId: agentId || 'unknown',
                      executionId,
                      type: 'tool_error',
                      content: error.message,
                      metadata: { stack: error.stack },
                    });

                    send("tool_error", { error: error.message });
                  },
                }],
              }
            );
          },
          {
            ...LLM_RETRY_OPTIONS,
            maxRetries: 2, // Conservative retry for agent execution
            onRetry: (attempt, error, nextDelay) => {
              // Notify via SSE about retry
              send("retry", {
                attempt,
                error: error.message,
                nextDelay,
                isTransient: isTransientError(error),
              });

              // Log retry attempt
              resultsPersistence.saveLog({
                agentId: agentId || 'unknown',
                executionId,
                level: 'warn',
                message: `Retry attempt ${attempt} after error: ${error.message}. Waiting ${nextDelay}ms`,
                source: 'retry-logic',
              });
            },
          }
        );

        // Extract final message
        const lastMessage = result.messages[result.messages.length - 1];
        const finalOutput = typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

        // Update result record with completion
        if (resultId) {
          await resultsPersistence.updateResult(resultId, {
            result: finalOutput,
            status: 'completed',
            completedAt: new Date(),
            metadata: {
              task,
              estimatedTokens,
              recursionLimit,
              executionId,
              iterationCount,
              todos: result.todos?.map((t: any) => ({ content: t.content, status: t.status })) || [],
            },
          });
        }

        // Save completion log
        await resultsPersistence.saveLog({
          agentId: agentId || 'unknown',
          executionId,
          level: 'info',
          message: `Execution completed successfully (${iterationCount} iterations)`,
          source: 'execute-route',
        });

        // Save checkpoint state for resume capability (if available)
        if (checkpointId && 'checkpointState' in result) {
          await resultsPersistence.saveCheckpointState({
            agentId: agentId || 'unknown',
            checkpointId,
            state: (result as any).checkpointState,
            threadId: (result as any).threadId || executionId,
          });
        }

        // Send completion event with token count
        const tokenCount = estimatedTokens || 1000; // TODO: Get actual token count from result
        send("complete", {
          agentId,
          checkpointId,
          output: finalOutput,
          tokens: tokenCount,
          todos: result.todos?.map((t: any) => ({ content: t.content, status: t.status })) || [],
          resultId,
        });

        controller.close();
      } catch (error) {
        console.error("[Agent Execution] Error:", error);

        // Detect error types
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isRecursionLimit = errorMessage.includes("Recursion limit") || errorMessage.includes("recursion");
        const isTimeout = errorMessage.includes("timeout") || errorMessage.includes("timed out");
        const isTransient = error instanceof Error && isTransientError(error);

        // Determine if error is recoverable
        const isRecoverable = isTransient || isTimeout;
        const status = isRecoverable ? 'failed_recoverable' : 'failed_permanent';

        // TODO: Partial checkpoint save - requires checkpointData tracking
        // Currently disabled pending full implementation

        // Update result record with failure
        if (resultId) {
          await resultsPersistence.updateResult(resultId, {
            status: 'failed',
            completedAt: new Date(),
            metadata: {
              task,
              estimatedTokens,
              recursionLimit,
              executionId,
              error: errorMessage,
              errorType: isRecursionLimit ? "recursion_limit" : isTimeout ? "timeout" : "execution_error",
              isRecoverable,
              checkpointSaved: isRecoverable && checkpointData.toolOutputs && checkpointData.toolOutputs.length > 0,
              stepsCompleted: checkpointData.step || 0,
            },
          });
        }

        // Save error log
        await resultsPersistence.saveLog({
          agentId: agentId || 'unknown',
          executionId,
          level: 'error',
          message: `Execution failed (${status}): ${errorMessage}`,
          source: 'execute-route',
        });

        // Prepare error response
        const errorResponse: any = {
          error: errorMessage,
          type: isRecursionLimit ? "recursion_limit" : isTimeout ? "timeout" : "execution_error",
          resultId,
          isRecoverable,
          stepsCompleted: checkpointData.step || 0,
        };

        // Add suggestions based on error type
        if (isRecursionLimit) {
          errorResponse.suggestions = [
            "The task may be too complex - try breaking it into smaller checkpoints",
            "The agent may be stuck in a loop - rephrase the task more specifically",
            "Increase recursionLimit in the request (current: 100, try: 150 or 200)",
            "Check Intelligence Bureau for repeated tool calls"
          ];
        } else if (isTimeout) {
          errorResponse.suggestions = [
            "The task took too long to complete - try breaking it into smaller parts",
            "Partial progress was saved and can be resumed",
            "Check Intelligence Bureau for execution traces"
          ];
        } else if (isRecoverable) {
          errorResponse.suggestions = [
            "This appears to be a temporary error - retry the request",
            "Partial progress was saved",
            `Checkpoint available for resume (${checkpointData.step || 0} steps completed)`
          ];
        }

        send("error", errorResponse);
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
