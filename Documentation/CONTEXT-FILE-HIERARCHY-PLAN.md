# Context File Hierarchy Update Plan

## Overview

Update Yelm to prioritize `agents.md` as the primary context file, with a fallback hierarchy of:
1. `agents.md` (primary)
2. `CLAUDE.md` (secondary)
3. `GEMINI.md` (tertiary)
4. `.cursor/rules` (quaternary)

## Current State Analysis

### How Context Files Work Currently
- The system looks for `GEMINI.md` files hierarchically from current directory up to project root
- Multiple filenames can be configured (already supports arrays)
- Files are loaded from:
  - Global: `~/.gemini/GEMINI.md`
  - Project root (git repository root)
  - Current working directory
  - Any subdirectories between cwd and project root

### Key Files to Update

#### 1. Core Context Loading Logic
- **File**: `packages/core/src/tools/memoryTool.ts`
  - Update `DEFAULT_CONTEXT_FILENAME` from `'GEMINI.md'` to `'agents.md'`
  - Modify `setGeminiMdFilename()` to accept the hierarchy

#### 2. Memory Discovery Service
- **File**: `packages/core/src/utils/memoryDiscovery.ts`
  - Update to search for files in priority order
  - Add support for `.cursor/rules` (different path structure)

#### 3. Configuration
- **File**: `packages/cli/src/config/extension.ts`
  - Update `getContextFileNames()` to return new hierarchy

#### 4. UI Components
Multiple UI files reference "GEMINI.md" explicitly:
- `packages/cli/src/ui/App.tsx` - Footer display
- `packages/cli/src/ui/components/Tips.tsx` - Help text
- `packages/cli/src/ui/hooks/useShowMemoryCommand.ts` - Memory display messages
- `packages/cli/src/ui/hooks/slashCommandProcessor.test.ts` - Tests
- `packages/cli/src/ui/App.test.tsx` - Tests
- `packages/core/src/core/prompts.ts` - System prompts

## Implementation Plan

### Phase 1: Update Core Logic

#### 1.1 Modify Memory Tool Constants
```typescript
// packages/core/src/tools/memoryTool.ts
export const DEFAULT_CONTEXT_FILENAME = 'agents.md';
export const CONTEXT_FILE_HIERARCHY = [
  'agents.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.cursor/rules'
];

// Update the directory name for consistency
export const YELM_CONFIG_DIR = '.yelm'; // Changed from '.gemini'
```

#### 1.2 Update Memory Discovery Logic
The memory discovery needs to:
1. Search for each filename in the hierarchy
2. Stop at the first file found in each directory
3. Handle `.cursor/rules` specially (it's in a subdirectory)

```typescript
// Pseudocode for updated discovery logic
for each directory in hierarchy (global, project root, subdirs, cwd):
  for each filename in ['agents.md', 'CLAUDE.md', 'GEMINI.md']:
    if file exists:
      add to results
      break // Use first found in this directory
  
  // Special handling for .cursor/rules
  if exists(dir/.cursor/rules):
    add to results
```

### Phase 2: Update UI References

#### 2.1 Dynamic Context File Names
Instead of hardcoding "GEMINI.md", make UI components use the actual loaded filenames:
- Update footer to show "Using 1 agents.md file" (or whatever was actually loaded)
- Update help text to mention the hierarchy
- Update error messages to be generic ("context files")

#### 2.2 Update System Prompts
Modify references in prompts to mention "context files" or "agents.md" instead of "GEMINI.md"

### Phase 3: Migration Support

#### 3.1 Backward Compatibility
- Continue to load existing GEMINI.md files if no higher-priority files exist
- Log a gentle suggestion to rename to agents.md

#### 3.2 Global Directory Migration
- Check for both `.gemini/` and `.yelm/` directories
- Prefer `.yelm/` for new installations

### Phase 4: Testing

#### 4.1 Unit Tests
- Test hierarchy loading order
- Test .cursor/rules special path handling
- Test backward compatibility

#### 4.2 Integration Tests
- Test with various combinations of context files
- Verify UI displays correct filenames

## Implementation Order

1. **Core Changes** (memoryTool.ts)
   - Update constants
   - Add hierarchy support

2. **Discovery Logic** (memoryDiscovery.ts)
   - Implement priority-based file discovery
   - Add .cursor/rules support

3. **UI Updates**
   - Make displays dynamic
   - Update help text and prompts

4. **Tests**
   - Update existing tests
   - Add new hierarchy tests

5. **Documentation**
   - Update CLAUDE.md to mention agents.md
   - Create migration guide

## Special Considerations

### .cursor/rules Structure
- Located at `.cursor/rules` (not `.cursor/rules.md`)
- Plain text file without markdown
- Should be loaded as-is without markdown processing
- Common in Cursor editor projects

### File Priority Logic
- Each directory level should only contribute ONE context file
- Use the highest priority file found at each level
- This prevents duplicate context from renamed files

### UI Flexibility
- Don't hardcode any specific filename in UI
- Always display what was actually loaded
- Support showing multiple different filenames if loaded from different directories

## Success Metrics
- Context files load in correct priority order
- UI correctly displays loaded context files
- Backward compatibility maintained
- No regression in existing functionality