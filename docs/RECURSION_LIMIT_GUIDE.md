# Preventing Agent Recursion Limit Errors

## What is a Recursion Limit Error?

```
❌ Execution failed: Recursion limit of 50 reached without hitting a stop condition
```

This happens when a Deep Agent runs in a loop for too many iterations without completing the task.

## Why It Happens

1. **Unclear task description** - Agent doesn't know when to stop
2. **Repeated tool failures** - Agent keeps retrying the same failed operation
3. **Genuinely complex task** - Task requires many steps
4. **Poor prompt design** - Agent lacks clear success criteria

---

## 🛡️ Prevention Strategies

### 1. Write Clear, Specific Tasks

❌ **Bad:**
```
"Improve the codebase"
"Make it better"
"Fix all the bugs"
```

✅ **Good:**
```
"Add error handling to the API endpoint in app/api/agents/execute/route.ts"
"Research React 19 features and create a summary document"
"Update the README.md to include installation instructions"
```

### 2. Break Complex Tasks into Smaller Checkpoints

❌ **Bad:** Single checkpoint
```
"Implement complete authentication system with JWT, sessions, and OAuth"
```

✅ **Good:** Multiple checkpoints
```
Checkpoint 1: "Design database schema for user authentication"
Checkpoint 2: "Implement JWT token generation and validation"
Checkpoint 3: "Create login/logout API endpoints"
Checkpoint 4: "Add OAuth provider integration"
```

### 3. Use Appropriate Recursion Limits

**Default:** 100 iterations (was 50)

**For simple tasks (< 5 steps):**
```typescript
POST /api/agents/execute
{
  "agentId": "agent-1",
  "checkpointId": "cp-1",
  "task": "Update README",
  "recursionLimit": 50  // Optional: lower for simple tasks
}
```

**For complex tasks (10+ steps):**
```typescript
POST /api/agents/execute
{
  "agentId": "agent-1",
  "checkpointId": "cp-1",
  "task": "Research AI frameworks and compare features",
  "recursionLimit": 150  // Higher for complex research tasks
}
```

**For very complex tasks (20+ steps):**
```typescript
POST /api/agents/execute
{
  "agentId": "agent-1",
  "checkpointId": "cp-1",
  "task": "Implement full CRUD API with tests",
  "recursionLimit": 200  // Maximum for extremely complex tasks
}
```

---

## 📊 Monitoring Agent Behavior

### Watch for Warning Events

The API now sends warning events when approaching the limit:

```typescript
event: warning
data: {
  "message": "Agent approaching iteration limit (80/100)",
  "iterationCount": 80,
  "maxRecursion": 100
}
```

**What to do:**
- Check Intelligence Bureau to see what the agent is doing
- If stuck in a loop, cancel and rephrase the task
- If making progress, wait for completion

### Check Intelligence Bureau

Enable LangSmith tracing to see:
- What tools the agent is calling
- If it's repeating the same operations
- Where it's getting stuck

**Setup:**
```env
LANGSMITH_API_KEY=your-key
LANGSMITH_WORKSPACE_ID=your-workspace
```

---

## 🚨 When You Hit the Limit

### Error Response Format

```typescript
event: error
data: {
  "error": "Recursion limit of 100 reached...",
  "type": "recursion_limit",
  "suggestions": [
    "The task may be too complex - try breaking it into smaller checkpoints",
    "The agent may be stuck in a loop - rephrase the task more specifically",
    "Increase recursionLimit in the request (current: 100, try: 150 or 200)",
    "Check Intelligence Bureau for repeated tool calls"
  ]
}
```

### Step-by-Step Recovery

1. **Check Intelligence Bureau**
   - Look for repeated tool calls with same inputs
   - Identify where the loop started

2. **Analyze the Task**
   - Is it too vague? → Make it more specific
   - Is it too complex? → Break into multiple checkpoints
   - Does it require unavailable resources? → Rephrase or provide context

3. **Retry with Adjustments**
   ```typescript
   // Option A: Rephrase the task
   {
     "task": "Create a summary of React 19 features from official documentation (limit to 5 key features)",
     "recursionLimit": 100
   }

   // Option B: Increase limit for complex task
   {
     "task": "Research and compare 10 AI frameworks",
     "recursionLimit": 200
   }

   // Option C: Break into smaller checkpoints
   Checkpoint 1: "Research React 19 features"
   Checkpoint 2: "Summarize top 5 features"
   Checkpoint 3: "Create code examples"
   ```

---

## 📋 Best Practices Checklist

- [ ] Task has clear success criteria
- [ ] Task is specific and measurable
- [ ] Complex goals split into 3-5 checkpoints
- [ ] RecursionLimit matches task complexity
- [ ] Intelligence Bureau enabled for debugging
- [ ] Monitoring for warning events
- [ ] Team knows how to detect/resolve loops

---

## 🔧 Technical Details

### Safeguards Implemented

1. **Higher Default Limit**
   - Old: 50 iterations
   - New: 100 iterations (2x)

2. **Configurable Limit**
   - Pass `recursionLimit` in request body
   - Range: 50-200 recommended

3. **Iteration Tracking**
   - Each `tool_start` event includes iteration count
   - Warning at 80% of limit

4. **Improved System Prompt**
   - Explicit stop conditions
   - Guidance to avoid loops
   - Instructions for tool failure handling

5. **Better Error Messages**
   - Detects recursion limit errors
   - Provides 4 actionable suggestions
   - Links to debugging resources

### Configuration Options

| Task Type | Recommended Limit | Example |
|-----------|-------------------|---------|
| Simple (1-3 steps) | 50 | "Update a config file" |
| Medium (4-7 steps) | 100 (default) | "Add error handling to API" |
| Complex (8-15 steps) | 150 | "Research and summarize topic" |
| Very Complex (16+ steps) | 200 | "Implement feature with tests" |

---

## 🎯 Task Design Examples

### Example 1: File Operations

❌ **Bad:**
```
"Update all the configuration files"
```

✅ **Good:**
```
"Update the next.config.ts file to add the serverExternalPackages configuration"
```

### Example 2: Research Tasks

❌ **Bad:**
```
"Research AI"
```

✅ **Good:**
```
"Search for the top 5 AI frameworks in 2026 and create a comparison table with features, pricing, and use cases"
```

### Example 3: Code Implementation

❌ **Bad:**
```
"Add authentication"
```

✅ **Good - Option A (Single detailed task):**
```
"Create a JWT authentication middleware function in app/lib/auth/middleware.ts that validates tokens and returns user data"
```

✅ **Good - Option B (Multiple checkpoints):**
```
Checkpoint 1: "Create JWT token generation function in app/lib/auth/jwt.ts"
Checkpoint 2: "Create token validation middleware in app/lib/auth/middleware.ts"
Checkpoint 3: "Add protected route example in app/api/protected/route.ts"
```

---

## 📚 Additional Resources

- [LangGraph Recursion Limits](https://docs.langchain.com/oss/javascript/langgraph/GRAPH_RECURSION_LIMIT/)
- [Quest System Guide](QUEST_SYSTEM_IMPLEMENTATION.md)
- [API Documentation](API.md)
- [LangSmith Traces Setup](https://docs.smith.langchain.com/)

---

**Last Updated:** 2026-02-12
**Maintained by:** Agents of Empire Team
**Co-Authored-By:** Claude Sonnet 4.5 🤖
