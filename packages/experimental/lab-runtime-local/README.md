# @deepseek-ai/dsh-experimental-lab-runtime-local
English | [中文](README.zh.md)

In-process Provider for the experimental controlled laboratory runtime.

The Provider is opt-in and persists experiment, approved-plan, ExecutionGraph, immutable Runs, and observation state in SQLite by default. Pass `statePath: ':memory:'` for an isolated test. Each Experiment can have multiple terminal Runs, while at most one non-terminal Run is active; retry creates a new Run with `retryOfRunId` provenance and retains the original evidence. It accepts only the exact approved plan revision. Device steps call the injected Lab Device Service for health checks, leases, idempotent execution, and release; human and approval steps wait for evidence. Unsupported script and API steps become BLOCKED observations and are never executed.

Use the lab-mvp bundle or mount the Provider after Lab Runtime and Lab Device Service. The SQLite state store restores control-plane state after process recreation, but the Provider is not a production scheduler and does not automatically re-submit interrupted device commands.

## Persistence and artifacts

The SQLite payload is versioned at `2`; the former single-Run payload is rejected during recovery instead of being silently migrated. Run and observation records expose artifact manifests and artifact ids, but the Provider does not accept arbitrary browser-supplied artifact paths. Artifact registration remains a Host-owned integration point.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees approved plans, controlled run states, and bounded observations through the package typed service or `lab_*` tools.

#### Token effect

Only requested plan fields, current-step status, and bounded evidence are returned; local storage details remain host-side.

#### KV Cache effect

Stable experiment, plan, Skill revision, and run identifiers keep repeated step results compact and prefix-friendly.

## Known Limitations and Deferred Work

- This experimental package provides local typed contracts and does not claim production persistence, recovery, or hardware integration.
