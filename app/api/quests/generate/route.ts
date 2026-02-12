import { NextRequest, NextResponse } from "next/server";
import { createLLM, getAvailableProviders, type LLMProvider } from "@/app/lib/deepagents-interop/a2a/providers";

export async function POST(request: NextRequest) {
  try {
    const { command, agentIds } = await request.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "Command is required and must be a string" },
        { status: 400 }
      );
    }

    // Get available providers (prefer ZAI, then Anthropic, then any other)
    const availableProviders = getAvailableProviders();
    if (availableProviders.length === 0) {
      return NextResponse.json(
        { error: "No LLM providers configured. Please set ZAI_API_KEY, ANTHROPIC_API_KEY, or another provider API key." },
        { status: 500 }
      );
    }

    // Priority: ZAI > Anthropic > OpenAI > others
    const providerPriority: LLMProvider[] = ["zai", "anthropic", "openai", "groq", "openrouter", "together", "perplexity"];
    const selectedProvider = providerPriority.find(p => availableProviders.includes(p)) || availableProviders[0];

    console.log(`[Quest Generation] Using provider: ${selectedProvider}`);

    const llm = createLLM(selectedProvider, {
      temperature: 0.3,
    });

    // Use Claude to generate structured quest
    const prompt = `You are a quest designer for an RTS game about AI agents solving real software tasks.

User command: "${command}"

Generate a structured quest with 3-7 checkpoints that break down this task into concrete steps.

Guidelines:
- Each checkpoint should be a specific, measurable action
- Estimate token usage (research: 500-2k, code: 1k-5k, testing: 500-1k)
- Checkpoints should progress logically
- Total quest should be achievable in one session
- Keep descriptions concise and actionable

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "Brief quest title (max 50 chars)",
  "description": "What this accomplishes (1 sentence)",
  "checkpoints": [
    {
      "stepNumber": 1,
      "description": "Concrete action to take",
      "estimatedTokens": 1000
    }
  ],
  "estimatedTotalTokens": 5000
}`;

    const response = await llm.invoke(prompt);

    // Extract text content
    const content = response.content;
    if (typeof content !== "string") {
      throw new Error("Unexpected response type from Claude");
    }

    let questData;
    try {
      // Try to parse the response directly
      questData = JSON.parse(content);
    } catch (parseError) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                       content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        questData = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON object in the text
        const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          questData = JSON.parse(jsonObjectMatch[0]);
        } else {
          throw new Error("Could not parse JSON from response");
        }
      }
    }

    // Validate quest data structure
    if (
      !questData.title ||
      !questData.description ||
      !Array.isArray(questData.checkpoints) ||
      questData.checkpoints.length === 0
    ) {
      throw new Error("Invalid quest data structure");
    }

    // Generate quest ID and checkpoint positions
    const questId = `quest-${Date.now()}`;
    const checkpoints = questData.checkpoints.map((cp: any, index: number) => ({
      id: `checkpoint-${questId}-${index}`,
      questId,
      stepNumber: cp.stepNumber,
      description: cp.description,
      position: generateCheckpointPosition(index, questData.checkpoints.length),
      status: "pending" as const,
      estimatedTokens: cp.estimatedTokens,
    }));

    // Create quest
    const quest = {
      id: questId,
      title: questData.title,
      description: questData.description,
      status: "pending" as const,
      targetStructureId: null,
      requiredAgents: 1,
      assignedAgentIds: agentIds || [],
      rewards: [],
      checkpointIds: checkpoints.map((cp: any) => cp.id),
      estimatedTokens: questData.estimatedTotalTokens,
      actualTokens: 0,
    };

    return NextResponse.json({ quest, checkpoints });
  } catch (error) {
    console.error("Error generating quest:", error);
    return NextResponse.json(
      {
        error: "Failed to generate quest",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Place checkpoints in a path across the map
 */
function generateCheckpointPosition(
  index: number,
  total: number
): [number, number, number] {
  const mapSize = 50;
  const pathCurve = 0.3; // Slight curve for visual interest

  // Progress from 0 to 1
  const progress = total > 1 ? index / (total - 1) : 0;

  // X: linear progression across map
  const x = 10 + progress * 30;

  // Z: sine curve for visual variety
  const z = 25 + Math.sin(progress * Math.PI) * pathCurve * 10;

  return [x, 0, z];
}
