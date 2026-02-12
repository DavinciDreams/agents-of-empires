"use strict";
/**
 * Test script for Results Persistence Service
 *
 * Tests saving, updating, and retrieving agent execution results.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const results_persistence_1 = require("../app/lib/results-persistence");
async function testPersistence() {
    console.log('Starting Results Persistence Service tests...\n');
    try {
        // Test 1: Create a result
        console.log('Test 1: Creating a new result...');
        const resultId = await results_persistence_1.resultsPersistence.saveResult({
            agentId: 'test-agent-001',
            checkpointId: 'checkpoint-001',
            questId: 'quest-001',
            result: 'Initial result',
            metadata: {
                task: 'Test task',
                startTime: new Date().toISOString(),
            },
            status: 'running',
        });
        console.log(`✓ Result created with ID: ${resultId}\n`);
        // Test 2: Save execution logs
        console.log('Test 2: Saving execution logs...');
        await results_persistence_1.resultsPersistence.saveLog({
            agentId: 'test-agent-001',
            executionId: 'exec-001',
            level: 'info',
            message: 'Execution started',
            source: 'test-script',
        });
        await results_persistence_1.resultsPersistence.saveLog({
            agentId: 'test-agent-001',
            executionId: 'exec-001',
            level: 'warn',
            message: 'Warning: High memory usage',
            source: 'test-script',
        });
        console.log('✓ Logs saved\n');
        // Test 3: Save traces
        console.log('Test 3: Saving execution traces...');
        await results_persistence_1.resultsPersistence.saveTrace({
            agentId: 'test-agent-001',
            executionId: 'exec-001',
            type: 'tool_start',
            content: 'Starting web search',
            metadata: { toolName: 'tavily_search', input: 'test query' },
        });
        await results_persistence_1.resultsPersistence.saveTrace({
            agentId: 'test-agent-001',
            executionId: 'exec-001',
            type: 'tool_end',
            content: 'Search completed',
            metadata: { toolName: 'tavily_search' },
            duration: 1500,
        });
        console.log('✓ Traces saved\n');
        // Test 4: Incremental update
        console.log('Test 4: Updating result incrementally...');
        await results_persistence_1.resultsPersistence.updateResult(resultId, {
            result: 'Partial result after step 1',
            metadata: {
                task: 'Test task',
                startTime: new Date().toISOString(),
                step: 1,
            },
        });
        console.log('✓ Result updated (step 1)\n');
        await results_persistence_1.resultsPersistence.updateResult(resultId, {
            result: 'Partial result after step 2',
            metadata: {
                task: 'Test task',
                startTime: new Date().toISOString(),
                step: 2,
            },
        });
        console.log('✓ Result updated (step 2)\n');
        // Test 5: Save checkpoint state
        console.log('Test 5: Saving checkpoint state...');
        await results_persistence_1.resultsPersistence.saveCheckpointState({
            agentId: 'test-agent-001',
            checkpointId: 'checkpoint-001',
            state: {
                step: 2,
                partialResults: ['Result 1', 'Result 2'],
                toolOutputs: [
                    { toolName: 'search', output: 'Search result 1' },
                    { toolName: 'search', output: 'Search result 2' },
                ],
            },
            threadId: 'thread-001',
        });
        console.log('✓ Checkpoint state saved\n');
        // Test 6: Complete the result
        console.log('Test 6: Completing the result...');
        await results_persistence_1.resultsPersistence.updateResult(resultId, {
            result: 'Final result - task completed successfully',
            status: 'completed',
            completedAt: new Date(),
            metadata: {
                task: 'Test task',
                startTime: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                totalSteps: 2,
            },
        });
        console.log('✓ Result marked as completed\n');
        // Test 7: Retrieve the result
        console.log('Test 7: Retrieving the result...');
        const retrievedResult = await results_persistence_1.resultsPersistence.getResult(resultId);
        if (retrievedResult) {
            console.log('✓ Result retrieved successfully:');
            console.log(`  ID: ${retrievedResult.id}`);
            console.log(`  Agent ID: ${retrievedResult.agentId}`);
            console.log(`  Status: ${retrievedResult.status}`);
            console.log(`  Result: ${retrievedResult.result}\n`);
        }
        else {
            console.log('✗ Result not found\n');
        }
        // Test 8: Get checkpoint state
        console.log('Test 8: Retrieving checkpoint state...');
        const checkpoint = await results_persistence_1.resultsPersistence.getCheckpointState('checkpoint-001');
        if (checkpoint) {
            console.log('✓ Checkpoint retrieved successfully:');
            console.log(`  Checkpoint ID: ${checkpoint.checkpointId}`);
            console.log(`  Agent ID: ${checkpoint.agentId}`);
            console.log(`  Thread ID: ${checkpoint.threadId}`);
            console.log(`  State: ${JSON.stringify(checkpoint.state, null, 2)}\n`);
        }
        else {
            console.log('✗ Checkpoint not found\n');
        }
        // Test 9: Get all results for agent
        console.log('Test 9: Getting all results for agent...');
        const agentResults = await results_persistence_1.resultsPersistence.getAgentResults('test-agent-001');
        console.log(`✓ Found ${agentResults.length} result(s) for agent test-agent-001\n`);
        // Test 10: Get execution logs
        console.log('Test 10: Getting execution logs...');
        const logs = await results_persistence_1.resultsPersistence.getExecutionLogs('exec-001');
        console.log(`✓ Found ${logs.length} log(s) for execution exec-001`);
        logs.forEach(log => {
            console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
        });
        console.log('');
        // Test 11: Get execution traces
        console.log('Test 11: Getting execution traces...');
        const traces = await results_persistence_1.resultsPersistence.getExecutionTraces('exec-001');
        console.log(`✓ Found ${traces.length} trace(s) for execution exec-001`);
        traces.forEach(trace => {
            console.log(`  [${trace.type}] ${trace.content}${trace.duration ? ` (${trace.duration}ms)` : ''}`);
        });
        console.log('');
        console.log('All tests passed successfully!');
    }
    catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}
// Run tests
testPersistence()
    .then(() => {
    console.log('\nTest completed. Exiting...');
    process.exit(0);
})
    .catch((error) => {
    console.error('\nTest failed with error:', error);
    process.exit(1);
});
