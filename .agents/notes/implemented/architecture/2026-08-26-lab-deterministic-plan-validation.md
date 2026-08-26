# Agent Note: Deterministic plan validation preserves source and parameter provenance

Status: implemented

English | [中文](2026-08-26-lab-deterministic-plan-validation.zh.md)

## Problem

Agent-generated plans can contain a valid-looking structure while losing the source required by a request or using parameters outside the referenced Skill definition. A plan status also cannot be treated as proof that the current revision is ready for review.

## Decision

The domain validator accepts only DRAFT plan revisions for pre-approval validation. It checks that plan citations are retrieved and unique, request-required citations are carried into the plan, and every step citation is also listed at plan level. It returns stable field-level issues for missing or unknown sources.

Each plan validation context supplies parameter constraints for the referenced Skill revisions. The validator requires every declared parameter, rejects undeclared parameters, and evaluates deterministic unit and numeric rules such as positive, non-negative, non-positive, negative, lower/upper bounds, and explicit units. Free-form constraint text remains descriptive unless it contains one of these supported forms.

## Alternatives considered

**Trust the Agent's status or explanation.** This would allow a stale or changed revision to reach approval without a repeatable eligibility check, so status and fields are validated independently.

**Treat all step citations as sufficient.** This would allow request-level source requirements to disappear from the plan, so required citations and step-to-plan citation membership are checked separately.

**Evaluate arbitrary constraint expressions.** This would add an unbounded interpreter to the planning path, so the first implementation supports a small documented deterministic vocabulary and leaves richer schemas for a later change.

## Consequences

Planning results now distinguish retrieval gaps, source loss, plan state errors, and parameter violations before human review. The validator needs Skill parameter facts in its context, and callers that need richer constraints must introduce a structured constraint type rather than relying on undocumented text.

## Testing

Domain tests cover non-DRAFT plans, required and step citation consistency, positive/unit parameter failures, undeclared parameters, and the existing dependency, input, operation, device, and Skill checks. Local planning and Agent tool composition tests pass with normalized CSV table excerpts.
