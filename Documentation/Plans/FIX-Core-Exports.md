# FIX-Core-Exports - Fix Yelm Core Package Exports

## Task ID
FIX-Core-Exports

## Problem Statement
The `yelm-core` package was completely rewritten during the fork from Gemini CLI, but the CLI package still expects the old interface. This results in hundreds of TypeScript compilation errors due to missing exports.

Current status:
- ✅ Basic `yelm` command works globally
- ✅ Can run interactive mode 
- ✅ ASCII logo changed to YELM (red)
- ❌ Build fails with 184+ TypeScript errors
- ❌ Many missing exports from yelm-core

## Proposed Solution

### Approach: Restore Original Core Interface
Rather than adding exports piecemeal, restore the complete original interface that the CLI expects:

1. **Backup Current Core**: Save the new yelm-core implementation 
2. **Restore Original Exports**: Add back all the original exports the CLI needs
3. **Merge Implementations**: Combine new features with old interface
4. **Test Integration**: Ensure CLI works with restored interface

### Core Exports Needed
Based on error analysis, the CLI expects these major export categories:

**Authentication & Config:**
- `AuthType`, `UserTierId`, `ApprovalMode`
- `Config`, `SandboxConfig`
- `DEFAULT_GEMINI_*` constants

**Tool System:**
- `ToolConfirmationOutcome` (as value, not just type)
- `BaseTool`, `EditTool`, `ReadFileTool`, etc.
- `ToolRegistry`, `CoreToolScheduler`
- Tool-related interfaces and types

**Core Functionality:**
- `GeminiClient`, `ContentGenerator`
- `Turn`, streaming events, telemetry
- Error utilities, path utilities
- Session management

**UI/Telemetry:**
- `SessionMetrics`, `ModelMetrics`, `ToolCallStats`
- Telemetry services and loggers
- UI-specific types and interfaces

## Implementation Checklist

### Phase 1: Assessment
- [ ] Catalog all missing exports from build errors
- [ ] Identify which exist in current core vs need restoration
- [ ] Create export mapping between old and new interfaces

### Phase 2: Core Interface Restoration
- [ ] Export `ToolConfirmationOutcome` as value (not just type)
- [ ] Add missing tool system exports
- [ ] Add missing config and auth exports
- [ ] Add missing utility function exports

### Phase 3: Implementation Restoration
- [ ] Restore missing classes/interfaces that CLI depends on
- [ ] Ensure compatibility between old interface and new implementation
- [ ] Add missing telemetry and UI support functions

### Phase 4: Testing
- [ ] Build passes without TypeScript errors
- [ ] CLI runs in interactive mode showing YELM logo
- [ ] Basic functionality works (tools, authentication, etc.)
- [ ] No runtime import errors

## Acceptable Tradeoffs
- Temporary complexity in core package to maintain CLI compatibility
- Some duplication between old and new interfaces during transition
- Focus on making it work first, optimize later

## Status
Not Started

## Questions/Uncertainties

### Non-blocking
- Whether to keep both old and new core interfaces long-term
- Best way to merge the new yelm-core features with old interface

### Blocking
- None currently

## Notes
The user has confirmed the basic setup works - they can run `yelm -i "test prompt"` and it launches successfully. The main issue is now the build errors preventing clean compilation. 