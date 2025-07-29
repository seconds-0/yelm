# Context7 Tool Integration Demo

This document demonstrates how the Context7 tool is now available to agents.

## How the Agent Sees the Tool

When the agent lists available tools, it will see:

```
Tool: context7_docs (Context7 Documentation)
Description: Fetches up-to-date documentation for libraries and frameworks using Context7.
      
This tool helps you get relevant documentation when working with specific libraries or frameworks.
Common libraries include: react, vue, angular, next, express, django, flask, rails, etc.

Examples:
- Get React hooks documentation: { "libraryName": "react", "topic": "hooks" }
- Get Vue composition API docs: { "libraryName": "vue", "topic": "composition" }
- Get general Angular docs: { "libraryName": "angular" }

Parameters:
- libraryName: The library/framework name (e.g., react, vue, angular, next) [required]
- topic: Optional topic within the library (e.g., hooks, components, routing) [optional]
- tokens: Maximum number of tokens to retrieve (default: 10000) [optional]
```

## Usage Examples

### Example 1: Agent Manually Requesting React Hooks Documentation

**User**: "I need help understanding React hooks"

**Agent's Internal Process**:
```json
{
  "tool": "context7_docs",
  "parameters": {
    "libraryName": "react",
    "topic": "hooks"
  }
}
```

**Tool Response**:
```markdown
## react Documentation (hooks)

React hooks documentation
```

**Agent Response to User**: 
"I've fetched the React hooks documentation for you. [Documentation content follows...]"

### Example 2: Agent Requesting Specific Vue Documentation

**User**: "How does Vue's composition API work?"

**Agent's Internal Process**:
```json
{
  "tool": "context7_docs",
  "parameters": {
    "libraryName": "vue",
    "topic": "composition",
    "tokens": 5000
  }
}
```

### Example 3: General Framework Documentation

**User**: "I'm working with Angular but I'm not sure about the basics"

**Agent's Internal Process**:
```json
{
  "tool": "context7_docs",
  "parameters": {
    "libraryName": "angular"
  }
}
```

## Integration with Automatic Context

The Context7 tool complements the automatic context detection:

1. **Automatic**: When files are mentioned in prompts (e.g., "Fix the useAuth.tsx file"), documentation is automatically included
2. **Manual**: When the agent needs specific documentation not tied to a file mention, it can use the `context7_docs` tool

## Benefits

1. **Explicit Control**: The agent can request specific documentation when needed
2. **Topic Targeting**: Can request specific topics within a library
3. **Token Management**: Can control how much documentation to retrieve
4. **No Confirmation Required**: The tool doesn't require user confirmation (read-only operation)
5. **Graceful Failures**: If documentation isn't available, the agent continues working

## Tool Registration

The Context7Tool is registered alongside other core tools in the config:

```typescript
// In packages/core/src/config/config.ts
registerCoreTool(Context7Tool, this);
```

This makes it available to all agents using the Yelm-enhanced Gemini CLI.

## Testing

Run the tests to verify the integration:
```bash
cd packages/core
npm test -- --run context7-tool.test.ts
```

All 16 tests should pass, covering:
- Parameter validation
- Successful documentation lookups
- Error handling
- Abort signal handling
- Token parameter passing