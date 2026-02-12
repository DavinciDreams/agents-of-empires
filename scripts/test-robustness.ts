/**
 * Test Script for Robustness Improvements
 *
 * Tests retry logic, timeout cancellation, and checkpoint recovery
 */

import { retryWithBackoff, isTransientError, LLM_RETRY_OPTIONS } from '../app/lib/utils/retry';
import {
  saveCheckpoint,
  loadCheckpoint,
  checkpointExists,
  deleteCheckpoint,
  type CheckpointData,
} from '../app/lib/services/persistence';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, colors.green);
}

function error(message: string) {
  log(`✗ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

function section(title: string) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

// Test 1: Retry Logic with Simulated Failures
async function testRetryLogic() {
  section('Test 1: Retry Logic');

  let attemptCount = 0;

  // Simulate function that fails twice then succeeds
  const unstableFunction = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('network timeout');
    }
    return 'success';
  };

  try {
    info('Testing retry with transient errors...');
    attemptCount = 0;

    const result = await retryWithBackoff(unstableFunction, {
      ...LLM_RETRY_OPTIONS,
      baseDelay: 100, // Fast for testing
      maxDelay: 500,
      onRetry: (attempt, err, delay) => {
        info(`  Retry attempt ${attempt}: ${err.message} (waiting ${delay}ms)`);
      },
    });

    if (result === 'success' && attemptCount === 3) {
      success('Retry logic works correctly (succeeded after 2 retries)');
    } else {
      error(`Unexpected result: ${result}, attempts: ${attemptCount}`);
    }
  } catch (err) {
    error(`Retry test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Test permanent error (should not retry)
  try {
    info('\nTesting permanent error (should not retry)...');
    attemptCount = 0;

    const permanentErrorFunction = async () => {
      attemptCount++;
      throw new Error('Invalid request - 400');
    };

    await retryWithBackoff(permanentErrorFunction, {
      ...LLM_RETRY_OPTIONS,
      baseDelay: 100,
    });

    error('Should have thrown permanent error');
  } catch (err) {
    if (attemptCount === 1) {
      success('Permanent errors are not retried (1 attempt only)');
    } else {
      error(`Too many attempts for permanent error: ${attemptCount}`);
    }
  }
}

// Test 2: Transient Error Detection
async function testErrorDetection() {
  section('Test 2: Error Detection');

  const transientErrors = [
    'network timeout',
    'ECONNREFUSED',
    'rate limit exceeded',
    '503 Service Unavailable',
    'Server overloaded',
  ];

  const permanentErrors = [
    'Invalid input',
    '400 Bad Request',
    '401 Unauthorized',
    'Not found',
    'Recursion limit exceeded',
  ];

  info('Testing transient error detection...');
  let passed = true;
  for (const msg of transientErrors) {
    const isTransient = isTransientError(new Error(msg));
    if (isTransient) {
      info(`  ✓ "${msg}" correctly identified as transient`);
    } else {
      error(`  ✗ "${msg}" should be transient but wasn't`);
      passed = false;
    }
  }

  info('\nTesting permanent error detection...');
  for (const msg of permanentErrors) {
    const isTransient = isTransientError(new Error(msg));
    if (!isTransient) {
      info(`  ✓ "${msg}" correctly identified as permanent`);
    } else {
      error(`  ✗ "${msg}" should be permanent but wasn't`);
      passed = false;
    }
  }

  if (passed) {
    success('All error detection tests passed');
  } else {
    error('Some error detection tests failed');
  }
}

// Test 3: Checkpoint Save and Load
async function testCheckpointPersistence() {
  section('Test 3: Checkpoint Persistence');

  const testCheckpointId = `test_checkpoint_${Date.now()}`;
  const testAgentId = 'test_agent';
  const testThreadId = `thread_${Date.now()}`;

  const checkpointData: CheckpointData = {
    step: 5,
    task: 'Test robustness features',
    partialResults: ['result1', 'result2'],
    toolOutputs: [
      {
        toolName: 'tavily_search_results_json',
        input: 'test query',
        output: 'test result',
        timestamp: new Date().toISOString(),
        duration: 1500,
      },
    ],
    agentState: {
      messages: ['msg1', 'msg2'],
    },
    timestamp: new Date().toISOString(),
    metadata: {
      test: true,
    },
  };

  try {
    info('Saving checkpoint...');
    await saveCheckpoint(testAgentId, testCheckpointId, testThreadId, checkpointData);
    success('Checkpoint saved successfully');

    info('Checking if checkpoint exists...');
    const exists = await checkpointExists(testCheckpointId);
    if (exists) {
      success('Checkpoint exists');
    } else {
      error('Checkpoint should exist but doesn\'t');
      return;
    }

    info('Loading checkpoint...');
    const loaded = await loadCheckpoint(testCheckpointId);
    if (loaded) {
      success('Checkpoint loaded successfully');

      // Verify data integrity
      if (
        loaded.step === checkpointData.step &&
        loaded.task === checkpointData.task &&
        loaded.toolOutputs.length === checkpointData.toolOutputs.length
      ) {
        success('Checkpoint data integrity verified');
      } else {
        error('Checkpoint data mismatch');
        console.log('Expected:', checkpointData);
        console.log('Loaded:', loaded);
      }
    } else {
      error('Failed to load checkpoint');
    }

    info('Deleting checkpoint...');
    await deleteCheckpoint(testCheckpointId);

    const stillExists = await checkpointExists(testCheckpointId);
    if (!stillExists) {
      success('Checkpoint deleted successfully');
    } else {
      error('Checkpoint should be deleted but still exists');
    }
  } catch (err) {
    error(`Checkpoint test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    console.error(err);
  }
}

// Test 4: Exponential Backoff Calculation
async function testExponentialBackoff() {
  section('Test 4: Exponential Backoff');

  const delays: number[] = [];
  let attemptCount = 0;

  const alwaysFailFunction = async () => {
    attemptCount++;
    throw new Error('rate limit exceeded');
  };

  try {
    await retryWithBackoff(alwaysFailFunction, {
      maxRetries: 4,
      baseDelay: 100,
      maxDelay: 2000,
      shouldRetry: isTransientError,
      onRetry: (attempt, err, nextDelay) => {
        delays.push(nextDelay);
        info(`  Attempt ${attempt}: delay = ${nextDelay}ms`);
      },
    });
  } catch (err) {
    // Expected to fail
  }

  // Verify exponential growth: 100, 200, 400, 800
  const expected = [100, 200, 400, 800];
  let correct = true;

  info('\nVerifying exponential backoff delays:');
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] === expected[i]) {
      info(`  ✓ Delay ${i + 1}: ${delays[i]}ms (expected ${expected[i]}ms)`);
    } else {
      error(`  ✗ Delay ${i + 1}: ${delays[i]}ms (expected ${expected[i]}ms)`);
      correct = false;
    }
  }

  if (correct) {
    success('Exponential backoff calculation is correct');
  } else {
    error('Exponential backoff calculation is incorrect');
  }
}

// Main test runner
async function runTests() {
  log('\n🧪 Robustness Improvements Test Suite', colors.cyan);
  log('Testing Phase F implementation\n', colors.cyan);

  const startTime = Date.now();

  try {
    await testRetryLogic();
    await testErrorDetection();
    await testExponentialBackoff();
    await testCheckpointPersistence();

    const duration = Date.now() - startTime;
    log(`\n${'='.repeat(60)}`, colors.cyan);
    log(`✓ All tests completed in ${duration}ms`, colors.green);
    log(`${'='.repeat(60)}`, colors.cyan);
  } catch (err) {
    error(`\nTest suite failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    console.error(err);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { runTests };
