# @deepseek-ai/dsh-experimental-lab-skill-local
English | [中文](README.zh.md)

Process-local Provider for the experimental laboratory Skill lifecycle.

The Provider owns draft validation, human approval, activation, retirement, and immutable run snapshots. Active revisions are exposed through the existing `ctx.skills` provider registry. Durable storage and installed resource management remain later increments.

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
- This experimental package provides local typed contracts and does not claim production persistence, recovery, or hardware integration.
