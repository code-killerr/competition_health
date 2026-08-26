# @deepseek-ai/dsh-experimental-tool-lab-knowledge

English | [中文](README.zh.md)

Agent-scoped model tools over `ctx.labKnowledge`. The plugin reuses the Harness agent lifecycle and registers tools with `agent.ctx.tools.register()` for every existing or subsequently created Agent.

## Tools

- `lab_knowledge_import` registers a local source path and returns its immutable document/version status.
- `lab_knowledge_status` reads parsing and indexing status.
- `lab_knowledge_search` returns cited excerpts with version, location, score, and confirmation state.
- `lab_knowledge_conflicts` lists conflicts requiring review.
- `lab_knowledge_confirm` records accountable human confirmation for a citation.

The package does not select a model, provider, preset, API key, or session implementation. Those remain owned by DeepSeek Harness configuration. It also does not execute document parsers, scripts, devices, or arbitrary model output.

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
