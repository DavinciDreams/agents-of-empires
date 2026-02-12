import { NextRequest } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createDeepAgent } from "deepagents";
import { createLLM, getAvailableProviders, type LLMProvider } from "@/app/lib/deepagents-interop/a2a/providers";
import { TavilySearch } from "@langchain/tavily";
import { resultsPersistence } from "@/app/lib/results-persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resume an agent execution from a saved checkpoint
 * Streams progress updates via Server-Sent Events
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { checkpointId, additionalInstructions, recursionLimit } = await request.json();

  if (!checkpointId || typeof checkpointId !== "string") {
    return new Response(
      JSON.stringify({ error: "Checkpoint ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Load checkpoint state from database
  const checkpoint = await resultsPersistence.getCheckpointState(checkpointId);

  if (!checkpoint) {
    return new Response(
      JSON.stringify({ error: "Checkpoint not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify agent ID matches
  if (checkpoint.agentId !== agentId) {
    return new Response(
      JSON.stringify({ error: "Checkpoint does not belong to this agent" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
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

  console.log(`[Agent Resume] Agent ${agentId} resuming from checkpoint ${checkpointId} with provider: ${selectedProvider}`);

  // Generate unique execution ID for resumed execution
  const executionId = `resume_${Date.now()}_${Math.random().toString(36).substring(7)}`;

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
        // Parse checkpoint state
        const checkpointState = checkpoint.state as any;
        const originalTask = checkpointState.task || "Resume from checkpoint";
        const resumeTask = additionalInstructions
          ? `${originalTask}\n\nAdditional instructions: ${additionalInstructions}`
          : originalTask;

        // Create result record for resumed execution
        resultId = await resultsPersistence.saveResult({
          agentId,
          checkpointId,
          result: '',
          metadata: {
            resumedFrom: checkpointId,
            originalTask,
            additionalInstructions,
            executionId,
            previousSteps: checkpointState.step || 0,
            previousToolOutputs: checkpointState.toolOutputs?.length || 0,
          },
          status: 'running',
        });

        // Log resume start
        await resultsPersistence.saveLog({
          agentId,
          executionId,
          level: 'info',
          message: `Resuming execution from checkpoint ${checkpointId} (${checkpointState.step || 0} steps completed)`,
          source: 'resume-route',
        });

        // Send start event
        send("start", {
          agentId,
          checkpointId,
          task: resumeTask,
          executionId,
          resultId,
          resumedFrom: checkpointId,
          previousSteps: checkpointState.step || 0,
        });

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
          systemPrompt: `You are an AI agent resuming a software development task from a checkpoint. Be concise and practical.

You previously made progress on this task. Here's what you accomplished:
${checkpointState.partialResults?.join('\n') || 'Previous work in progress'}

${checkpointState.toolOutputs?.length ? `Previous tool calls (${checkpointState.toolOutputs.length}):
${checkpointState.toolOutputs.map((t: any) => `- ${t.toolName}: ${t.output?.substring(0, 100)}...`).join('\n')}` : ''}

Continue from where you left off and complete the task.

IMPORTANT: Once you have completed the task, provide a clear final answer. Do not enter loops or repeatedly call the same tool with the same inputs.`,
          tools: [tavilySearch],
        });

        // Send thinking event
        send("thinking", { message: `Resuming task from checkpoint: ${resumeTask}` });

        // Build message history from checkpoint
        const messages: any[] = [new HumanMessage(resumeTask)];

        // Add partial results as context if available
        if (checkpointState.partialResults?.length) {
          messages.push(new AIMessage(`Previous progress: ${checkpointState.partialResults.join('\n')}`));
        }

        // Use configurable recursion limit with higher default
        const maxRecursion = recursionLimit || 100;
        let iterationCount = checkpointState.step || 0; // Continue from previous count
        const toolStartTimes = new Map<string, number>();

        // Invoke the agent
        const result = await agent.invoke(
          {
            messages,
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

                // Warn when approaching limit
                if (iterationCount >= maxRecursion * 0.8) {
                  send("warning", {
                    message: `Agent approaching iteration limit (${iterationCount}/${maxRecursion})`,
                    iterationCount,
                    maxRecursion
                  });

                  // Log warning
                  await resultsPersistence.saveLog({
                    agentId,
                    executionId,
                    level: 'warn',
                    message: `Approaching iteration limit (${iterationCount}/${maxRecursion})`,
                    source: 'agent-callback',
                  });
                }

                // Save trace
                await resultsPersistence.saveTrace({
                  agentId,
                  executionId,
                  type: 'tool_start',
                  content: `Tool: ${tool.name}`,
                  metadata: { input, iteration: iterationCount },
                });

                send("tool_start", { tool: tool.name, input, iteration: iterationCount });
              },
              async handleToolEnd(output: string, runId: string) {
                // Calculate duration
                const toolKey = Array.from(toolStartTimes.keys()).pop();
                const startTime = toolKey ? toolStartTimes.get(toolKey) : undefined;
                const duration = startTime ? Date.now() - startTime : undefined;
                if (toolKey) toolStartTimes.delete(toolKey);

                // Save trace
                await resultsPersistence.saveTrace({
                  agentId,
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
                  agentId,
                  executionId,
                  level: 'error',
                  message: `Tool error: ${error.message}`,
                  source: 'agent-callback',
                });

                // Save trace
                await resultsPersistence.saveTrace({
                  agentId,
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
              resumedFrom: checkpointId,
              originalTask,
              additionalInstructions,
              executionId,
              previousSteps: checkpointState.step || 0,
              newSteps: iterationCount - (checkpointState.step || 0),
              totalSteps: iterationCount,
              todos: result.todos?.map((t: any) => ({ content: t.content, status: t.status })) || [],
            },
          });
        }

        // Save completion log
        await resultsPersistence.saveLog({
          agentId,
          executionId,
          level: 'info',
          message: `Resumed execution completed successfully (${iterationCount} total iterations)`,
          source: 'resume-route',
        });

        // Update checkpoint state with final state (if available)
        if ('checkpointState' in result) {
          await resultsPersistence.saveCheckpointState({
            agentId,
            checkpointId,
            state: (result as any).checkpointState,
            threadId: checkpoint.threadId,
          });
        }

        // Send completion event
        send("complete", {
          agentId,
          checkpointId,
          output: finalOutput,
          todos: result.todos?.map((t: any) => ({ content: t.content, status: t.status })) || [],
          resultId,
          totalIterations: iterationCount,
          newIterations: iterationCount - (checkpointState.step || 0),
        });

        controller.close();
      } catch (error) {
        console.error("[Agent Resume] Error:", error);

        // Detect recursion limit errors and provide helpful guidance
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isRecursionLimit = errorMessage.includes("Recursion limit") || errorMessage.includes("recursion");

        // Update result record with failure
        if (resultId) {
          await resultsPersistence.updateResult(resultId, {
            status: 'failed',
            completedAt: new Date(),
            metadata: {
              resumedFrom: checkpointId,
              executionId,
              error: errorMessage,
              errorType: isRecursionLimit ? "recursion_limit" : "execution_error",
            },
          });
        }

        // Save error log
        await resultsPersistence.saveLog({
          agentId,
          executionId,
          level: 'error',
          message: `Resumed execution failed: ${errorMessage}`,
          source: 'resume-route',
        });

        send("error", {
          error: errorMessage,
          type: isRecursionLimit ? "recursion_limit" : "execution_error",
          suggestions: isRecursionLimit ? [
            "The resumed task may still be too complex - try breaking it into smaller parts",
            "Increase recursionLimit in the request",
            "Check Intelligence Bureau for repeated tool calls"
          ] : undefined,
          resultId,
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
