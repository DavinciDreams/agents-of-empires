#!/usr/bin/env node

/**
 * Test imports for E2B integration
 */

console.log("Testing imports...\n");

try {
  // Test manager import
  console.log("1. Importing UnsandboxManager...");
  const managerModule = await import("../app/lib/unsandbox/manager.ts");
  console.log("✓ UnsandboxManager imports successfully");
  console.log(`   - Exports: ${Object.keys(managerModule).join(", ")}`);

  console.log("\n2. Importing gameTools...");
  const gameToolsModule = await import("../app/lib/deepagents-interop/tools/gameTools.ts");
  console.log("✓ gameTools imports successfully");
  console.log(`   - Exports: ${Object.keys(gameToolsModule).slice(0, 5).join(", ")}...`);

  console.log("\n3. Testing Sandbox import from E2B...");
  const { Sandbox } = await import("@e2b/code-interpreter");
  console.log("✓ E2B Sandbox imports successfully");
  console.log(`   - Type: ${typeof Sandbox}`);

  console.log("\n=== All imports successful! ===\n");
  process.exit(0);
} catch (error) {
  console.error("\n❌ Import failed:", error.message);
  if (error.stack) {
    console.error("\nStack:", error.stack);
  }
  process.exit(1);
}
