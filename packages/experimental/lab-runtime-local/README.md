# @deepseek-ai/dsh-experimental-lab-runtime-local
English | [中文](README.zh.md)

In-process Provider for the experimental controlled laboratory runtime.

The Provider is opt-in and persists experiment, approved-plan, ExecutionGraph, run, and observation state in SQLite by default. Pass `statePath: ':memory:'` for an isolated test. It accepts only the exact approved plan revision. Device steps call the injected Lab Device Service for health checks, leases, idempotent execution, and release; human and approval steps wait for evidence. Unsupported script and API steps become BLOCKED observations and are never executed.

Use the lab-mvp bundle or mount the Provider after Lab Runtime and Lab Device Service. The SQLite state store restores control-plane state after process recreation, but the Provider is not a production scheduler and does not automatically re-submit interrupted device commands.

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
