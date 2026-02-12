/**
 * TPMJS Integration Examples
 *
 * This file contains example code for testing the TPMJS integration.
 * These examples can be used in components or for manual testing.
 */

import { getTPMJSClient } from './tpmjs-client';
import { useGameStore } from '@/app/components/a2ui/game/store/gameStore';

// ============================================================================
// Example 1: Search for tools
// ============================================================================

export async function exampleSearchTools() {
  try {
    const client = getTPMJSClient();

    // Search for web scraping tools
    const results = await client.searchTools('web scraper', 10);

    console.log(`Found ${results.tools.length} tools`);
    results.tools.forEach(tool => {
      console.log(`- ${tool.package}/${tool.toolName}: ${tool.description}`);
      console.log(`  Quality: ${tool.qualityScore}, Downloads: ${tool.downloads}`);
    });

    return results;
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 2: List tools by category
// ============================================================================

export async function exampleListToolsByCategory(category: string) {
  try {
    const client = getTPMJSClient();

    // List tools in a specific category
    const results = await client.listTools({
      category,
      limit: 20,
      offset: 0,
    });

    console.log(`Found ${results.tools.length} tools in category "${category}"`);
    return results;
  } catch (error) {
    console.error('List failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 3: Get tool details
// ============================================================================

export async function exampleGetToolDetails(packageName: string, toolName: string) {
  try {
    const client = getTPMJSClient();

    const tool = await client.getToolDetails(packageName, toolName);

    console.log(`Tool: ${tool.package}/${tool.toolName}`);
    console.log(`Description: ${tool.description}`);
    console.log(`Category: ${tool.category}`);
    console.log(`Quality Score: ${tool.qualityScore}`);
    console.log(`Health Status: ${tool.healthStatus}`);
    console.log(`Official: ${tool.official}`);
    console.log(`Version: ${tool.version}`);
    console.log(`Downloads: ${tool.downloads}`);

    return tool;
  } catch (error) {
    console.error('Get details failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 4: Install tool to agent
// ============================================================================

export async function exampleInstallToolToAgent(agentId: string) {
  try {
    const store = useGameStore.getState();

    // First search for a tool
    await store.searchTPMJSTools('search');

    // Get the first result
    const tool = store.tpmjsSearchResults[0];
    if (!tool) {
      console.error('No tools found');
      return;
    }

    // Install to agent
    store.installTPMJSTool(tool, agentId);

    console.log(`Installed ${tool.package}/${tool.toolName} to agent ${agentId}`);

    // Check agent inventory
    const agent = store.agents[agentId];
    console.log(`Agent now has ${agent.inventory.length} tools`);
  } catch (error) {
    console.error('Install failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 5: Install tool to party
// ============================================================================

export async function exampleInstallToolToParty(partyId: string) {
  try {
    const store = useGameStore.getState();

    // Search for a tool
    await store.searchTPMJSTools('code');

    const tool = store.tpmjsSearchResults[0];
    if (!tool) {
      console.error('No tools found');
      return;
    }

    // Install to party shared resources
    store.installTPMJSToolToParty(tool, partyId);

    console.log(`Installed ${tool.package}/${tool.toolName} to party ${partyId}`);

    // Check party shared tools
    const party = store.parties[partyId];
    console.log(`Party now has ${party.sharedResources.tools.length} shared tools`);
  } catch (error) {
    console.error('Install to party failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 6: Test tool execution
// ============================================================================

export async function exampleTestToolExecution() {
  try {
    const store = useGameStore.getState();

    // Example: Execute a simple tool
    const result = await store.testTPMJSTool(
      'example-package',
      'example-tool',
      { input: 'test data' }
    );

    console.log('Tool execution result:', result);
    return result;
  } catch (error) {
    console.error('Tool execution failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 7: Check rate limit status
// ============================================================================

export function exampleCheckRateLimit() {
  try {
    const client = getTPMJSClient();
    const info = client.getRateLimitInfo();

    console.log('Rate Limit Status:');
    console.log(`- Remaining: ${info.remaining}/${info.limit} requests`);
    console.log(`- Resets at: ${new Date(info.reset).toLocaleTimeString()}`);

    const percentUsed = ((info.limit - info.remaining) / info.limit) * 100;
    console.log(`- Usage: ${percentUsed.toFixed(1)}%`);

    if (info.remaining < 10) {
      console.warn('Warning: Approaching rate limit!');
    }

    return info;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 8: Uninstall tool
// ============================================================================

export function exampleUninstallTool(packageName: string, toolName: string) {
  try {
    const store = useGameStore.getState();
    const toolId = `${packageName}/${toolName}`;

    store.uninstallTPMJSTool(toolId);

    console.log(`Uninstalled ${toolId} from all agents and parties`);
  } catch (error) {
    console.error('Uninstall failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 9: List all installed TPMJS tools
// ============================================================================

export function exampleListInstalledTools() {
  try {
    const store = useGameStore.getState();

    console.log('Installed TPMJS Tools:');
    store.installedTPMJSTools.forEach(toolId => {
      const tool = store.tpmjsCache[toolId];
      if (tool) {
        console.log(`- ${toolId} (Quality: ${tool.qualityScore})`);
      } else {
        console.log(`- ${toolId} (not in cache)`);
      }
    });

    return Array.from(store.installedTPMJSTools);
  } catch (error) {
    console.error('List installed tools failed:', error);
    throw error;
  }
}

// ============================================================================
// Example 10: Full workflow - Search, Install, Equip
// ============================================================================

export async function exampleFullWorkflow(agentId: string, searchQuery: string) {
  try {
    const store = useGameStore.getState();

    console.log(`Step 1: Searching for "${searchQuery}"...`);
    await store.searchTPMJSTools(searchQuery);

    if (store.tpmjsSearchResults.length === 0) {
      console.log('No tools found');
      return;
    }

    // Find the highest quality tool
    const bestTool = store.tpmjsSearchResults.reduce((best, current) =>
      current.qualityScore > best.qualityScore ? current : best
    );

    console.log(`Step 2: Installing best tool: ${bestTool.package}/${bestTool.toolName} (Quality: ${bestTool.qualityScore})`);
    store.installTPMJSTool(bestTool, agentId);

    const agent = store.agents[agentId];
    const installedTool = agent.inventory[agent.inventory.length - 1];

    console.log(`Step 3: Equipping tool to agent...`);
    store.equipTool(agentId, installedTool);

    console.log(`Success! Agent ${agent.name} is now equipped with ${installedTool.name}`);
    console.log(`Tool Rarity: ${installedTool.rarity}, Power: ${installedTool.power}`);

    return {
      tool: bestTool,
      agent,
      equippedTool: installedTool,
    };
  } catch (error) {
    console.error('Full workflow failed:', error);
    throw error;
  }
}
