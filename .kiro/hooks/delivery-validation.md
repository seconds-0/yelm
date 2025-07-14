# Delivery Validation Hook

## Trigger
When declaring a task complete or work finished

## Purpose
Verify that actual deliverables match stated requirements and success criteria

## Hook Instructions

When you declare a task complete, you MUST validate that you actually delivered what was promised. This hook prevents premature declarations of completion and ensures accountability.

### Validation Process

**Step 1: Requirements Mapping**
- List every requirement from the original task
- For each requirement, identify the specific deliverable that addresses it
- Flag any requirements that lack corresponding deliverables

**Step 2: Deliverable Verification**
- For each claimed deliverable, provide evidence it exists and works
- Test functionality where applicable
- Verify quality meets stated standards

**Step 3: Success Criteria Check**
- Review the original success criteria for the task
- Verify each criterion is actually met
- Provide evidence for each criterion

**Step 4: Gap Analysis**
- Identify any gaps between what was promised and what was delivered
- Assess the impact of any missing elements
- Determine if gaps are acceptable or require additional work

### Validation Questions

**Deliverable Verification:**
1. Can I point to specific files/code/documentation that fulfill each requirement?
2. Have I actually tested that the deliverables work as intended?
3. Do the deliverables meet the quality standards specified?
4. Are there any "placeholder" or incomplete elements I'm ignoring?

**Requirement Fulfillment:**
5. Did I address every single requirement listed in the task?
6. Are there any requirements I interpreted too loosely?
7. Would an independent reviewer agree that each requirement is met?
8. Did I deliver the spirit of the requirements, not just the letter?

**Success Criteria:**
9. Can I demonstrate that each success criterion is actually achieved?
10. Are there any success criteria I'm claiming without evidence?
11. Would the success criteria pass an independent audit?
12. Did I lower the bar on any success criteria during implementation?

### Output Format

```markdown
## Delivery Validation Report

### Requirements Fulfillment:
| Requirement | Deliverable | Status | Evidence |
|-------------|-------------|---------|----------|
| [Req 1] | [Specific deliverable] | ✅/❌ | [Link/proof] |
| [Req 2] | [Specific deliverable] | ✅/❌ | [Link/proof] |

### Success Criteria Verification:
| Criterion | Status | Evidence |
|-----------|---------|----------|
| [Criterion 1] | ✅/❌ | [Proof of achievement] |
| [Criterion 2] | ✅/❌ | [Proof of achievement] |

### Gap Analysis:
- **Missing Elements**: [What was promised but not delivered]
- **Quality Gaps**: [Where deliverables don't meet standards]
- **Scope Reductions**: [Where requirements were interpreted narrowly]

### Validation Conclusion:
- [ ] Task fully complete (all requirements met, all criteria achieved)
- [ ] Task substantially complete (minor gaps acceptable)
- [ ] Task incomplete (significant gaps require more work)

### Next Steps:
- [If incomplete, what specific work remains]
- [If complete, any follow-up items for future tasks]
```

## Validation Standards

**Complete**: All requirements fulfilled, all success criteria met, deliverables tested and working

**Substantially Complete**: 90%+ of requirements met, minor gaps documented and acceptable

**Incomplete**: Significant requirements missing or success criteria not met

## When This Hook Applies

This validation applies to:
- All task completions
- All milestone deliveries  
- Any claim that work is "done"
- Any handoff to another phase

## Success Criteria for This Hook

You have successfully completed delivery validation when:
1. Every requirement has been mapped to a specific deliverable
2. Every deliverable has been verified to exist and work
3. Every success criterion has been checked with evidence
4. Any gaps have been honestly assessed and documented
5. The validation conclusion accurately reflects the actual state of work