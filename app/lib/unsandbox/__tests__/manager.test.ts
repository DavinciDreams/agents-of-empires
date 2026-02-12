/**
 * E2B Unsandbox Manager Tests
 *
 * Tests for the E2B sandbox manager functionality.
 * Run with: pnpm test or node --loader ts-node/esm manager.test.ts
 */

import { UnsandboxManager } from "../manager";

/**
 * Simple test runner
 */
async function runTests() {
  console.log("\n=== E2B Unsandbox Manager Tests ===\n");

  const apiKey = process.env.E2B_API_KEY;

  if (!apiKey) {
    console.error("❌ ERROR: E2B_API_KEY not set in environment");
    console.error("Please set E2B_API_KEY in your .env file");
    process.exit(1);
  }

  console.log("✓ E2B_API_KEY found");

  // Test 1: Manager initialization
  console.log("\n1. Testing manager initialization...");
  const manager = new UnsandboxManager({ apiKey });
  console.log(`✓ Manager created`);
  console.log(`✓ E2B available: ${manager.isAvailable()}`);

  // Test 2: Sandbox creation
  console.log("\n2. Testing sandbox creation...");
  const testAgentId = `test-agent-${Date.now()}`;

  try {
    const sandbox = await manager.createSandbox(testAgentId);
    console.log(`✓ Sandbox created for agent: ${testAgentId}`);
    console.log(`✓ Sandbox ID: ${sandbox.sandboxId}`);

    // Test 3: File write operation
    console.log("\n3. Testing file write...");
    const testFile = "test.txt";
    const testContent = "Hello from E2B sandbox test!";

    await sandbox.files.write(testFile, testContent);
    console.log(`✓ File written: ${testFile}`);

    // Test 4: File read operation
    console.log("\n4. Testing file read...");
    const readContent = await sandbox.files.read(testFile);
    console.log(`✓ File read: ${testFile}`);

    if (readContent === testContent) {
      console.log("✓ Content matches!");
    } else {
      throw new Error(`Content mismatch: expected "${testContent}", got "${readContent}"`);
    }

    // Test 5: List files operation
    console.log("\n5. Testing list files...");
    const files = await sandbox.files.list(".");
    console.log(`✓ Listed files: ${files.length} entries`);

    const foundFile = files.find((f) => f.name === testFile);
    if (foundFile) {
      console.log(`✓ Found test file: ${foundFile.name} (${foundFile.type})`);
    } else {
      throw new Error(`Test file not found in listing`);
    }

    // Test 6: Get existing sandbox
    console.log("\n6. Testing get existing sandbox...");
    const existingSandbox = manager.getSandbox(testAgentId);

    if (existingSandbox) {
      console.log(`✓ Retrieved existing sandbox`);
    } else {
      throw new Error("Failed to retrieve existing sandbox");
    }

    // Test 7: Create nested directory and file
    console.log("\n7. Testing nested file operations...");
    const nestedFile = "subdir/nested.txt";
    const nestedContent = "Nested file test";

    await sandbox.files.write(nestedFile, nestedContent);
    console.log(`✓ Nested file written: ${nestedFile}`);

    const nestedReadContent = await sandbox.files.read(nestedFile);
    if (nestedReadContent === nestedContent) {
      console.log("✓ Nested content matches!");
    } else {
      throw new Error(`Nested content mismatch`);
    }

    // Test 8: List subdirectory
    console.log("\n8. Testing list subdirectory...");
    const subdirFiles = await sandbox.files.list("subdir");
    console.log(`✓ Listed subdir files: ${subdirFiles.length} entries`);

    // Test 9: Manager stats
    console.log("\n9. Testing manager stats...");
    const stats = manager.getStats();
    console.log(`✓ Active sandboxes: ${stats.total}`);
    console.log(`✓ Agent IDs: ${stats.agentIds.join(", ")}`);

    // Test 10: Error handling - file not found
    console.log("\n10. Testing error handling (file not found)...");
    try {
      await sandbox.files.read("nonexistent.txt");
      throw new Error("Should have thrown error for nonexistent file");
    } catch (error) {
      if ((error as Error).message.includes("not found") || (error as Error).message.includes("does not exist")) {
        console.log("✓ Correctly handles file not found");
      } else {
        throw error;
      }
    }

    // Test 11: Sandbox cleanup
    console.log("\n11. Testing sandbox cleanup...");
    await manager.destroySandbox(testAgentId);
    console.log(`✓ Sandbox destroyed`);

    const afterStats = manager.getStats();
    console.log(`✓ Active sandboxes after cleanup: ${afterStats.total}`);

    if (afterStats.total === 0) {
      console.log("✓ All sandboxes cleaned up successfully");
    }

    console.log("\n=== All Tests Passed! ===\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error);

    // Cleanup on error
    try {
      await manager.destroySandbox(testAgentId);
      console.log("Cleaned up test sandbox");
    } catch (cleanupError) {
      console.error("Failed to cleanup:", cleanupError);
    }

    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
