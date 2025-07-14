# Documentation Update Hook

## Trigger
When interfaces, APIs, or significant functionality is modified

## Purpose
Automatically generate or update documentation when code changes

## Hook Instructions

When TypeScript interfaces, public APIs, or core functionality changes, automatically update relevant documentation:

### Documentation Types to Update
1. **API Documentation**: Update JSDoc comments and interface documentation
2. **Architecture Docs**: Update design documents when architecture changes
3. **Integration Guides**: Update when integration points change
4. **README Files**: Update when setup or usage changes
5. **Examples**: Update code examples when APIs change

### Update Process
1. **Identify Changes**: Detect what interfaces or APIs have changed
2. **Impact Analysis**: Determine what documentation needs updating
3. **Generate Updates**: Create or update relevant documentation
4. **Validate Examples**: Ensure code examples still work
5. **Cross-Reference**: Update related documentation sections

### Documentation Standards
- Clear, concise explanations
- Working code examples
- Error handling examples
- Performance considerations
- Integration guidance

### Output Format
```markdown
## Documentation Updates

### Files Updated:
- [List of documentation files modified]

### Changes Made:
- [Summary of documentation changes]

### Examples Updated:
- [List of code examples updated]

### Validation:
- [ ] All examples tested
- [ ] Cross-references updated
- [ ] Standards compliance verified
```

## Success Criteria
Documentation is updated when all affected files are current and examples are validated.