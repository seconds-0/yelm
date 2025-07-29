# Context7 Debug/Verbose Mode

This document explains how to use the verbose/debug mode to see Context7 API calls and responses in detail.

## Overview

Yelm now includes comprehensive debug logging for Context7 API calls. When debug mode is enabled, you'll see:

- Detailed API call information (command, arguments, parameters)
- Timing information for each request
- Full response data including documentation content
- Error details and stack traces when calls fail

## ⚠️ Security and Privacy Warning

**Important**: Debug mode logs sensitive information including:

- Full API responses which may contain proprietary documentation
- System paths in error stack traces
- Complete request parameters and authentication details
- Raw response data without any redaction

**Do not use debug mode in production environments** or when handling sensitive data. Debug logs may expose information that should remain confidential. Always review debug output before sharing logs with others.

## Enabling Debug Mode

### Option 1: Command Line Flag

Run Yelm with the `--debug` or `-d` flag:

```bash
yelm --debug
# or
yelm -d
```

### Option 2: Interactive Mode

When running Yelm interactively with debug mode:

```bash
yelm -d -i "Get React hooks documentation"
```

### Option 3: Non-Interactive Mode

For single prompts with debug output:

```bash
yelm -d -p "Explain Vue composition API"
```

## Debug Output Format

When debug mode is enabled, Context7 calls will produce output like this:

```
[Context7 Debug] Making API call:
  Command: context7-cli
  Arguments: ['react', 'hooks', '10000']
  Library: react
  Topic: hooks
  Tokens: 10000
  Timeout: 3000 ms
  Timestamp: 2025-01-29T10:30:45.123Z

[Context7 Debug] API response:
  Duration: 245 ms
  Success: true
  Library: react
  Topic: hooks
  Documentation length: 8543 characters
  Documentation preview: React Hooks are functions that let you use state and other React features...
  Raw response: {
    "success": true,
    "library": "react",
    "topic": "hooks",
    "documentation": "...",
    "timestamp": 1706525445123
  }
```

## Error Debugging

When API calls fail, debug mode provides detailed error information:

```
[Context7 Debug] API call failed:
  Error: ENOENT: no such file or directory, execvp 'context7-cli'
  Stack trace: Error: ENOENT: no such file or directory...
    at Process.ChildProcess._handle.onexit...
```

## Testing Debug Mode

A test script is provided to demonstrate the debug functionality:

```bash
# Build the project first
npm run build

# Run the test script
node test-context7-debug.js
```

This will show:
1. Normal mode (no debug output)
2. Debug mode (verbose output)
3. Error simulation with debug info

## Implementation Details

The debug logging is implemented in:

- `packages/core/src/tools/context7Wrapper.ts` - Core logging logic
- `packages/core/src/tools/context7-tool.ts` - Passes debug flag from config
- `packages/cli/src/config/config.ts` - CLI argument parsing

Debug mode respects the global `--debug` flag, ensuring consistent behavior across all Yelm features.

## Best Practices

1. **Development**: Use debug mode when developing Context7 integrations to understand API behavior
2. **Troubleshooting**: Enable debug mode to diagnose Context7 lookup failures
3. **Performance**: Debug mode shows request duration, useful for performance optimization
4. **Privacy**: Be aware that debug mode logs full API responses, which may contain sensitive documentation

## Future Enhancements

Potential improvements to debug mode:

1. Separate Context7-specific debug flag (`--debug-context7`)
2. Log filtering by library or topic
3. Export debug logs to file
4. Structured JSON output option
5. Integration with telemetry system

## Related Documentation

- [Context7 Tool Documentation](./CONTEXT7-TOOL-DEMO.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [CLI Configuration](./specs/design.md)