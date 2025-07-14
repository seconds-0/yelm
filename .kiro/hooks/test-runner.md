# Test Runner Hook

## Trigger
When code is modified or before commits

## Purpose
Run relevant tests when code changes to catch regressions early

## Hook Instructions

When code files are modified, automatically run relevant tests to ensure changes don't break existing functionality:

### Test Selection Strategy
1. **Unit Tests**: Run tests for modified files and their dependencies
2. **Integration Tests**: Run when interfaces or core components change
3. **Performance Tests**: Run when performance-critical code changes
4. **Full Suite**: Run complete test suite before merges to develop/main

### Test Types
1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: Component interaction testing
3. **CLI Tests**: Command-line interface testing
4. **Context Tests**: Context7 integration and fallback testing
5. **Performance Tests**: Response time and memory usage validation

### Test Execution
```bash
# Unit tests for changed files
npm run test -- --changed

# Integration tests
npm run test:integration

# Performance tests (main branch only)
npm run test:performance

# Full test suite
npm run test:ci
```

### Coverage Requirements
- Minimum 80% code coverage for new code
- No reduction in overall coverage
- Critical paths must have 100% coverage

### Output Format
```markdown
## Test Results

### Tests Run:
- Unit Tests: [X passed, Y failed]
- Integration Tests: [X passed, Y failed]
- Performance Tests: [X passed, Y failed]

### Coverage:
- Overall: [X%]
- New Code: [X%]
- Critical Paths: [X%]

### Failures:
- [List of failed tests with details]

### Performance:
- CLI Response Time: [Xms] (target: <100ms)
- Memory Usage: [XMB] (target: <1GB)

### Status:
- [ ] All tests passing
- [ ] Coverage targets met
- [ ] Performance targets met
- [ ] Ready for merge
```

## Success Criteria
Tests pass when all relevant tests execute successfully and coverage/performance targets are met.