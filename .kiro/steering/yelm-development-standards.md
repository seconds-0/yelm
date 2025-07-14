# Yelm Coding Agent Development Standards

## Project Context

We are building the Yelm Coding Agent, an advanced CLI-based coding assistant that extends Gemini-CLI with sophisticated context management. The core premise is that coding agents are already amazing but need the right context at the right time to thrive.

## Development Philosophy

### Quality Over Speed
- Every task must pass adversarial review before completion
- Deliverables must be production-ready, not prototypes
- Testing is mandatory, not optional
- Documentation is part of the deliverable, not an afterthought

### Incremental Value
- Each phase must demonstrate measurable improvement
- Early benchmarking to validate our approach
- Build foundation first, add complexity later
- Prove concepts before scaling

### Context-First Architecture
- Every component designed around intelligent context expansion
- Graceful degradation when context sources fail
- Performance targets: CLI <100ms, context operations cached
- User experience prioritizes relevance over speed

## Technical Standards

### TypeScript/Node.js Patterns
- Use strict TypeScript configuration
- Prefer async/await over callbacks
- Use Zod for runtime type validation
- Follow existing Gemini CLI patterns where possible
- Comprehensive error handling with graceful degradation

### Testing Requirements
- Unit tests for all core functionality
- Integration tests for component interactions
- Performance tests for response time targets
- Mock external dependencies (Gemini API, Context7)
- Minimum 80% code coverage

### Code Quality
- ESLint and Prettier for consistent formatting
- Clear, descriptive variable and function names
- Comprehensive JSDoc comments for public APIs
- Error messages must be user-friendly and actionable
- No magic numbers or hardcoded values

### Performance Targets
- CLI commands: <100ms response time
- Context retrieval: <500ms cached, <3s fresh lookup
- Project analysis: Thorough over fast (minutes acceptable)
- Memory usage: <1GB baseline, <2GB with full context

## Architecture Principles

### Modular Design
- Each component can fail independently
- Clear interfaces between components
- Dependency injection for testability
- Configuration-driven behavior

### Context Management
- Aggressive caching of expensive operations
- Lazy loading of context components
- Parallel processing where possible
- Smart batching of related operations

### Error Handling
- Graceful degradation when components fail
- Clear error messages with recovery suggestions
- Comprehensive logging for debugging
- User-friendly error reporting

## Development Process

### Task Execution
1. **Pre-Implementation**: Review task requirements and success criteria
2. **Implementation**: Follow TDD where appropriate, comprehensive error handling
3. **Pre-Delivery Review**: Use adversarial mindset to find problems
4. **Delivery Validation**: Verify all requirements met with evidence
5. **Documentation**: Update relevant docs and examples

### Quality Gates
- All code must pass linting and type checking
- All tests must pass before task completion
- Performance targets must be met and verified
- Security considerations must be addressed
- Documentation must be updated

### Integration Strategy
- Fork Gemini CLI for independence
- Extend their patterns while maintaining compatibility
- Preserve their existing functionality
- Plan for their updates and changes

## Context7 Integration

### Approach
- Use Context7 as MCP server (JavaScript-based from Upstash)
- Implement comprehensive error handling and fallbacks
- Cache results aggressively with TTL
- Graceful degradation when unavailable

### Quality Standards
- Test with multiple file types and documentation sources
- Measure and optimize relevance analysis
- Handle malformed or incomplete responses
- Provide clear feedback when context is unavailable

## Benchmarking Strategy

### V1 Approach
- Start with 10-15 simple coding tasks
- Focus on response quality over speed
- Compare against baseline Gemini CLI
- Store results for historical tracking

### Success Criteria
- Measurable improvement in response relevance
- Maintained or improved response speed
- Higher user satisfaction with suggestions
- Reduced need for manual context gathering

## File Organization

### Project Structure
```
yelm-coding-agent/
├── src/
│   ├── core/           # Core agent engine
│   ├── context/        # Context management
│   ├── models/         # Model backends
│   ├── benchmarks/     # Benchmarking system
│   └── utils/          # Shared utilities
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── benchmarks/     # Benchmark tests
├── docs/               # Documentation
└── .yelm/              # Conversation history
```

### Configuration
- Use `.yelm/` directory for agent-specific files
- JSON configuration with Zod validation
- Environment-specific overrides
- Secure API key management

## Success Metrics

### V1 MVP Success
- Successfully extends Gemini CLI with context management
- Reliable Context7 integration with fallbacks
- Measurable improvement over baseline in benchmarks
- Comprehensive test coverage with regression detection
- <100ms CLI response times maintained
- Easy setup and configuration process

### Quality Indicators
- All tasks pass adversarial review
- All deliverables verified against requirements
- No critical bugs in production use
- Positive user feedback on context relevance
- Maintainable codebase for future enhancements