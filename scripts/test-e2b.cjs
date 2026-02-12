#!/usr/bin/env node

/**
 * E2B Integration Test Runner (CommonJS)
 *
 * A simple test script to verify E2B integration works correctly.
 * Run with: node scripts/test-e2b.cjs
 */

const { Sandbox } = require("@e2b/code-interpreter");
const { readFileSync } = require("fs");
const { join } = require("path");

// Load environment variables from .env file
const envPath = join(__dirname, "..", ".env");

try {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join("=");
      }
    }
  });
} catch (error) {
  // .env file might not exist, that's ok if env vars are set elsewhere
}

async function testE2BIntegration() {
  console.log("\n=== E2B Integration Test ===\n");

  const apiKey = process.env.E2B_API_KEY;

  if (!apiKey) {
    console.error("❌ ERROR: E2B_API_KEY not set in environment");
    console.error("Please set E2B_API_KEY in your .env file");
    process.exit(1);
  }

  console.log("✓ E2B_API_KEY found");

  const testAgentId = `test-agent-${Date.now()}`;

  try {
    // Test 1: Create sandbox
    console.log("\n1. Creating E2B sandbox...");
    const sandbox = await Sandbox.create({
      apiKey,
      metadata: {
        agentId: testAgentId,
        test: "true",
      },
    });
    console.log(`✓ Sandbox created: ${sandbox.sandboxId}`);

    // Test 2: Write file
    console.log("\n2. Writing test file...");
    const testFile = "hello.txt";
    const testContent = "Hello from E2B!\nThis is a test file.";
    await sandbox.files.write(testFile, testContent);
    console.log(`✓ File written: ${testFile}`);

    // Test 3: Read file
    console.log("\n3. Reading test file...");
    const readContent = await sandbox.files.read(testFile);
    console.log(`✓ File read successfully`);
    console.log(`Content:\n${readContent}`);

    if (readContent === testContent) {
      console.log("✓ Content matches!");
    } else {
      throw new Error("Content mismatch!");
    }

    // Test 4: List files
    console.log("\n4. Listing files...");
    const files = await sandbox.files.list(".");
    console.log(`✓ Found ${files.length} entries:`);
    files.forEach((file) => {
      const type = file.type === "dir" ? "[DIR]" : "[FILE]";
      console.log(`  ${type} ${file.name}`);
    });

    // Test 5: Create nested directory structure
    console.log("\n5. Creating nested directory structure...");
    await sandbox.files.write("data/config.json", JSON.stringify({ test: true }, null, 2));
    await sandbox.files.write("data/notes.txt", "Important notes go here");
    console.log("✓ Nested files created");

    // Test 6: List nested directory
    console.log("\n6. Listing nested directory...");
    const dataFiles = await sandbox.files.list("data");
    console.log(`✓ Found ${dataFiles.length} files in data/:`);
    dataFiles.forEach((file) => {
      const type = file.type === "dir" ? "[DIR]" : "[FILE]";
      console.log(`  ${type} ${file.name}`);
    });

    // Test 7: Execute Python code
    console.log("\n7. Executing Python code...");
    const execution = await sandbox.runCode("print('Hello from Python!')\nresult = 2 + 2\nresult");
    console.log(`✓ Code executed successfully`);
    if (execution.text) {
      console.log(`Output: ${execution.text}`);
    }
    if (execution.results && execution.results.length > 0) {
      console.log(`Result: ${execution.results[0]}`);
    }

    // Test 8: File operations from Python
    console.log("\n8. File operations from Python...");
    const fileOps = await sandbox.runCode(`
with open('python_test.txt', 'w') as f:
    f.write('Created from Python!')

with open('python_test.txt', 'r') as f:
    content = f.read()

content
`);
    console.log(`✓ Python file operations executed`);
    if (fileOps.results && fileOps.results.length > 0) {
      console.log(`Content: ${fileOps.results[0]}`);
    }

    // Test 9: Verify file created by Python
    console.log("\n9. Verifying file created by Python...");
    const pythonFile = await sandbox.files.read("python_test.txt");
    console.log(`✓ File read: ${pythonFile}`);

    // Cleanup
    console.log("\n10. Cleaning up...");
    await sandbox.kill();
    console.log("✓ Sandbox killed");

    console.log("\n=== All Tests Passed! ===\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.error("\nError details:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testE2BIntegration();
