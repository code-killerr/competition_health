# @deepseek-ai/dsh-experimental-lab-skill
English | [中文](README.zh.md)

Service Definition for declarative laboratory Skill drafts, validation, human approval, activation, retirement, and run snapshots.

This capability is separate from Harness `ctx.skills`: `ctx.skills` remains an instruction registry, while this package defines experimental actions and their execution eligibility. Script and API content is registered as a candidate resource first; Skill validation requires an explicitly installed resource, and the Runtime still does not execute arbitrary resource content.

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
- Model-generated scripts and API payloads remain candidate artifacts until a registered resource is explicitly installed; Runtime execution still requires a typed registered executor.
