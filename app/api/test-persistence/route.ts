/**
 * Test endpoint for Results Persistence Service
 *
 * Run basic tests to verify database connectivity and persistence functionality
 */

import { NextRequest, NextResponse } from "next/server";
import { resultsPersistence } from "@/app/lib/results-persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const results: any = {
    success: true,
    tests: [],
  };

  try {
    // Test 1: Create a result
    results.tests.push({ name: "Create result", status: "running" });
    const resultId = await resultsPersistence.saveResult({
      agentId: 'test-agent-001',
      checkpointId: 'test-checkpoint-001',
      questId: 'test-quest-001',
      result: 'Initial test result',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
      status: 'running',
    });
    results.tests[0].status = "passed";
    results.tests[0].resultId = resultId;

    // Test 2: Save execution log
    results.tests.push({ name: "Save log", status: "running" });
    await resultsPersistence.saveLog({
      agentId: 'test-agent-001',
      executionId: 'test-exec-001',
      level: 'info',
      message: 'Test log message',
      source: 'test-endpoint',
    });
    results.tests[1].status = "passed";

    // Test 3: Save trace
    results.tests.push({ name: "Save trace", status: "running" });
    await resultsPersistence.saveTrace({
      agentId: 'test-agent-001',
      executionId: 'test-exec-001',
      type: 'tool_start',
      content: 'Test trace',
      metadata: { test: true },
      duration: 100,
    });
    results.tests[2].status = "passed";

    // Test 4: Update result
    results.tests.push({ name: "Update result", status: "running" });
    await resultsPersistence.updateResult(resultId, {
      result: 'Updated test result',
      status: 'completed',
      completedAt: new Date(),
    });
    results.tests[3].status = "passed";

    // Test 5: Save checkpoint
    results.tests.push({ name: "Save checkpoint", status: "running" });
    await resultsPersistence.saveCheckpointState({
      agentId: 'test-agent-001',
      checkpointId: 'test-checkpoint-001',
      state: {
        step: 1,
        data: 'test checkpoint data',
      },
      threadId: 'test-thread-001',
    });
    results.tests[5].status = "passed";

    // Test 6: Retrieve result
    results.tests.push({ name: "Retrieve result", status: "running" });
    const retrievedResult = await resultsPersistence.getResult(resultId);
    if (retrievedResult && retrievedResult.result === 'Updated test result') {
      results.tests[5].status = "passed";
      results.tests[5].data = {
        id: retrievedResult.id,
        status: retrievedResult.status,
        result: retrievedResult.result,
      };
    } else {
      results.tests[5].status = "failed";
      results.tests[5].error = "Result not found or data mismatch";
    }

    // Test 7: Get checkpoint
    results.tests.push({ name: "Get checkpoint", status: "running" });
    const checkpoint = await resultsPersistence.getCheckpointState('test-checkpoint-001');
    if (checkpoint && checkpoint.checkpointId === 'test-checkpoint-001') {
      results.tests[6].status = "passed";
      results.tests[6].data = {
        checkpointId: checkpoint.checkpointId,
        agentId: checkpoint.agentId,
        state: checkpoint.state,
      };
    } else {
      results.tests[6].status = "failed";
      results.tests[6].error = "Checkpoint not found";
    }

    // Test 8: Get logs
    results.tests.push({ name: "Get logs", status: "running" });
    const logs = await resultsPersistence.getExecutionLogs('test-exec-001');
    results.tests[7].status = "passed";
    results.tests[7].count = logs.length;

    // Test 9: Get traces
    results.tests.push({ name: "Get traces", status: "running" });
    const traces = await resultsPersistence.getExecutionTraces('test-exec-001');
    results.tests[8].status = "passed";
    results.tests[8].count = traces.length;

    // Test 10: Get agent results
    results.tests.push({ name: "Get agent results", status: "running" });
    const agentResults = await resultsPersistence.getAgentResults('test-agent-001');
    results.tests[9].status = "passed";
    results.tests[9].count = agentResults.length;

    // Summary
    const passedTests = results.tests.filter((t: any) => t.status === "passed").length;
    const totalTests = results.tests.length;
    results.summary = `${passedTests}/${totalTests} tests passed`;

    if (passedTests !== totalTests) {
      results.success = false;
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('[Test Persistence] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      tests: results.tests,
    }, { status: 500 });
  }
}
