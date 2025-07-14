# Code Review Hook

## Trigger
When TypeScript/JavaScript files are modified or before committing code

## Purpose
Automatically review code for patterns, best practices, and potential issues

## Hook Instructions

When code files are modified, automatically conduct a comprehensive code review focusing on:

### Code Quality Review
1. **TypeScript Patterns**: Verify proper type usage, interface definitions, and type safety
2. **Error Handling**: Ensure comprehensive error handling with graceful degradation
3. **Performance**: Check for potential performance issues and optimization opportunities
4. **Security**: Identify potential security vulnerabilities or unsafe patterns
5. **Maintainability**: Assess code readability, documentation, and maintainability

### Yelm-Specific Standards
1. **Context Management**: Verify context operations include caching and fallbacks
2. **CLI Performance**: Ensure CLI operations target <100ms response time
3. **Testing**: Verify adequate test coverage for new functionality
4. **Documentation**: Check for proper JSDoc comments on public APIs
5. **Error Messages**: Ensure user-friendly, actionable error messages

### Review Process
1. **Static Analysis**: Check code structure, patterns, and potential issues
2. **Standards Compliance**: Verify adherence to Yelm development standards
3. **Integration Points**: Review how code integrates with existing components
4. **Performance Impact**: Assess impact on CLI response times and memory usage

### Output Format
```markdown
## Code Review Results

### Issues Found:
- **Critical**: [Issues that must be fixed before merge]
- **Major**: [Issues that should be addressed]
- **Minor**: [Suggestions for improvement]

### Standards Compliance:
- [ ] TypeScript patterns followed
- [ ] Error handling comprehensive
- [ ] Performance targets met
- [ ] Testing adequate
- [ ] Documentation complete

### Recommendations:
- [Specific suggestions for improvement]

### Approval Status:
- [ ] Approved for merge
- [ ] Needs revision
```

## Success Criteria
Code review is complete when all critical issues are resolved and standards compliance is verified.