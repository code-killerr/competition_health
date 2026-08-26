# @deepseek-ai/dsh-experimental-lab-mvp-web
English | [中文](README.zh.md)

Minimal read-only Consumer for laboratory status surfaces. It reads capability Services and returns a serializable snapshot; it does not access provider databases or devices directly.

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
