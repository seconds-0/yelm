# Yelm Coding Agent - Development Context

## Project Overview

**Yelm** is an advanced CLI-based coding assistant that extends Gemini-CLI with sophisticated context management capabilities. The core premise is that coding agents are already amazing but need **the right context at the right time** to thrive.

**Current Status**: V1 MVP foundation complete (~60%), but build system has TypeScript compilation issues preventing full CLI access. Core package works, simple CLI wrapper available.

**Primary Goal**: Add context enhancement to Gemini CLI without breaking existing functionality, following incremental development with benchmarking.

## Decision-Making Rules

### Development Approach
- **Follow the incremental plan**: [Documentation/INCREMENTAL-IMPLEMENTATION-PLAN.md](Documentation/INCREMENTAL-IMPLEMENTATION-PLAN.md)
- **One feature at a time** with testing and benchmarking before proceeding
- **Measure >10% improvement** over previous step or don't proceed
- **Never break existing Gemini CLI functionality**

### When to Ask for Approval
- **Before major architecture changes** (not in the incremental plan)
- **Before adding new dependencies** (especially external services)
- **When benchmarking shows <10% improvement** (should we pivot?)
- **When encountering build system issues** that require structural changes

### Quality Gates
- All code must pass: `npm run lint`, `npm run typecheck`, `npm run test`
- Must maintain or improve performance from previous step
- Changes must be reversible (feature flags, graceful degradation)

## Current Build Status & Issues

### What Works ✅
- **Core package** (`packages/core`): 131+ exports from Gemini CLI working
- **Simple CLI** (`./yelm-simple.js`): Basic status/help/benchmark commands
- **Test suite**: Vitest configured, tests passing
- **Base functionality**: Can extend Gemini CLI classes

### What's Broken ❌
- **CLI package build** (`packages/cli`): TypeScript compilation hangs (circular dependencies)
- **Full React/Ink UI**: Not accessible due to build failure
- **Context management**: Not yet implemented

### Architecture References
- **Detailed architecture**: [Documentation/ARCHITECTURE.md](Documentation/ARCHITECTURE.md)
- **Requirements**: [Documentation/specs/requirements.md](Documentation/specs/requirements.md)
- **Implementation plan**: [Documentation/INCREMENTAL-IMPLEMENTATION-PLAN.md](Documentation/INCREMENTAL-IMPLEMENTATION-PLAN.md)

## Essential Commands

### Development Workflow
```bash
# Check current status
./yelm-simple.js status           # System health check
npm run build                     # Build all packages (may hang on CLI)
npm run test                      # Run all tests
npm run lint && npm run typecheck # Quality checks

# Debug build issues
npm run build 2>&1 | grep -A5 -B5 "circular"  # Find circular dependencies
cd packages/core && npm run build              # Test core separately
cd packages/cli && npm run build               # Test CLI separately

# Git workflow (using GitHub CLI)
gh pr create --title "feat: add project detection" --body "..."
gh pr merge                       # After review and CI passes
```

### File Locations (Quick Reference)
- **Main CLI entry**: `packages/cli/src/yelm.tsx`
- **Core exports**: `packages/core/src/index.ts`
- **Simple CLI**: `./yelm-simple.js` (temporary working version)
- **Build config**: `packages/*/tsconfig.json`, `scripts/build.js`

## Coding Standards & Context7 Integration

### Key Patterns
- **TypeScript**: Strict types with Zod validation
- **Error Handling**: Graceful degradation - never break core CLI functionality
- **Testing**: Comprehensive mocking of external dependencies
- **Async**: Prefer Promise.allSettled for parallel operations with fallbacks

### Context7 Integration Notes
Context7 provides API endpoints but no CLI. We need to build a CLI wrapper:
- **Our responsibility**: Create executable that wraps Context7 API calls
- **Integration**: Subprocess execution of our wrapper
- **Fallback**: Must work without Context7 available

**Reference**: See [Documentation/ARCHITECTURE.md](Documentation/ARCHITECTURE.md) for detailed patterns and examples.

## Next Steps

**Current Priority**: Step 1 of [Incremental Implementation Plan](Documentation/INCREMENTAL-IMPLEMENTATION-PLAN.md)
- Fix build system and establish baseline metrics
- Get TypeScript compilation working for CLI package
- Run baseline benchmarks to measure future improvements

**Follow the plan step-by-step** - each step has specific testing and benchmarking requirements.

## Critical Constraints

### Must Never Break
- Existing Gemini CLI functionality
- Core package exports (131+ functions)
- User's existing workflows

### Must Always Do
- Test thoroughly before proceeding to next step
- Benchmark >10% improvement or don't proceed
- Ask for approval before major changes
- Use GitHub CLI for commits: `gh pr create --title "..." --body "..."`

### Common Pitfalls
- Don't make Context7 a hard dependency
- Don't block users on slow context operations
- Don't create circular dependencies in build system
- Don't add features without proving value through benchmarking

## Performance Targets
- **CLI Commands**: <100ms 
- **Context Gathering**: <500ms cached, <3s fresh
- **Improvement Target**: >25% better than baseline Gemini CLI
- **Minimum Threshold**: >10% improvement per feature

This document provides the essential context for effective development while referencing detailed documentation where needed.