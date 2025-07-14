# Pre-Delivery Critical Review Hook

## Trigger
Before marking any task as complete or declaring work finished

## Purpose
Perform adversarial self-review to catch issues, gaps, and problems before delivery

## Hook Instructions

When you are about to complete a task or declare work finished, you MUST first conduct a critical self-review by adopting an adversarial mindset. Act as a hostile reviewer whose job is to find problems with your work.

### Critical Review Questions

**Completeness Review:**
1. Did I actually complete ALL the stated requirements?
2. Are there any sub-tasks or deliverables I missed?
3. What would a perfectionist critic say is missing?
4. Did I take any shortcuts that compromise quality?

**Quality Review:**
5. Is this code/solution production-ready or just a prototype?
6. What are the most likely failure modes I didn't address?
7. Where did I make assumptions that might be wrong?
8. What edge cases did I ignore?

**Requirements Alignment:**
9. Does this actually solve the original problem stated?
10. Did I drift from the requirements during implementation?
11. Would the end user be satisfied with this deliverable?
12. What requirements did I interpret too loosely?

**Technical Review:**
13. What are the biggest technical risks in this approach?
14. Where is this solution most likely to break?
15. What performance or scalability issues did I ignore?
16. Is this maintainable by someone else?

### Review Process

1. **Adopt Hostile Mindset**: Actively try to find problems with your work
2. **Document Issues Found**: List every problem, gap, or concern identified
3. **Assess Severity**: Categorize issues as Critical, Major, or Minor
4. **Fix Critical Issues**: Address all critical problems before proceeding
5. **Document Remaining Risks**: Clearly state what risks/limitations remain

### Output Format

```markdown
## Pre-Delivery Critical Review

### Issues Identified:
- **Critical**: [List critical issues that must be fixed]
- **Major**: [List major issues that should be addressed]
- **Minor**: [List minor issues for future consideration]

### Issues Addressed:
- [List what you fixed based on the review]

### Remaining Risks/Limitations:
- [Clearly document what limitations remain]

### Review Conclusion:
- [ ] Ready for delivery (all critical issues resolved)
- [ ] Needs more work (critical issues remain)
```

## When to Skip This Hook

This hook should be used for ALL task completions. No exceptions.

## Success Criteria

You have successfully completed this review when:
1. You have genuinely tried to find problems with your work
2. You have addressed all critical issues identified
3. You have clearly documented remaining limitations
4. You can honestly say the work meets the stated requirements