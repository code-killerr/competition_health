# Agent Note: Controlled execution uses an approved immutable graph

Status: implemented

English | [中文](2026-08-26-lab-controlled-execution-graph.zh.md)

## Problem

The experimental laboratory runtime must keep model proposals separate from device side effects. A plan reference alone does not describe which steps are executable, which Skill revisions were reviewed, or which evidence is required to advance a run. The runtime also needs a durable vocabulary for waiting, blocking, completion, and safe stop without exposing an arbitrary command channel.

## Decision

The runtime freezes the approved plan revision, execution steps, and ACTIVE Skill snapshots into an ExecutionGraph when a plan is approved. Each step declares its Skill revision, operation kind, resource, parameters, approval requirement, expected evidence, and failure policy. Starting a run locks the plan identity and exposes the graph, current step, observations, and cache projection together.

The local Provider supports device, human, and approval operations. Device work always goes through Lab Device Service health checks, run leases, deterministic operation and idempotency identifiers, receipts, and release. Human and approval operations remain waiting until an accountable actor submits evidence. Script and API content is registered as a candidate resource first; Skill validation requires an installed resource, and Runtime operations still produce a failed observation and block or stop according to the declared failure policy rather than invoking model-supplied content.

The tool Consumer exposes plan approval, rejection, and execution steps as JSON input. When the existing approval Service is composed, plan approval passes through the Harness tools/pre-execute and ctx.approval seam; rejection records a reason and optional replacement revision. lab_run_step advances one step and records observations, state transitions, and cache projections in the Agent Session. A plan without execution steps retains the original manual-confirmation compatibility path.

## Alternatives considered

**Let the model provide device commands.** This would create an unreviewed side-effect channel, so the runtime accepts only typed operation kinds and registered Device Service calls.

**Run the whole plan in one Provider call.** This would hide the current step and make human confirmation, cancellation, and partial failure ambiguous, so advancement is explicit and one step at a time.

**Persist only a mutable run status.** This would lose the reviewed Skill inputs and evidence needed to reconstruct a report, so each RunView retains the immutable graph and structured observations.

## Consequences

The controlled path has explicit safety and audit semantics, and the same graph is available to tools, tests, reports, and future recovery code. The local implementation remains intentionally small: dispatch is still inside the Provider, state is process-local, and the graph is supplied by the approved request rather than loaded from a persistent plan store.

The current implementation does not provide a reusable Executor Registry, SQLite recovery, production permission policy, or real device adapters. These gaps remain named so callers do not treat the opt-in local Provider as a production scheduler.

## Testing

Focused Runtime tests cover graph freezing, rejection of unapproved plan revisions, exact approved plan locking, Mock Device execution and release, human evidence, and blocking unsupported script operations. The Agent tool composition test covers experiment creation, plan approval with execution steps and Skill snapshots, run start, device advancement, and observation output. The repository host build and client typecheck pass.