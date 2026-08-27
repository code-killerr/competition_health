# @deepseek-ai/dsh-experimental-tool-lab-knowledge

English | [中文](README.zh.md)

Agent-scoped read-only model tools over ctx.labKnowledge. The plugin reuses the Harness Agent lifecycle and registers tools with agent.ctx.tools.register() for every existing or subsequently created Agent.

## Tools

- lab_knowledge_status reads parsing and indexing status.
- lab_knowledge_search returns cited excerpts with version, location, score, and confirmation state.
- lab_knowledge_conflicts lists conflicts requiring review.

Source ingestion, fact confirmation, SOP curation, parsing, and retrieval ownership remain with the separate Knowledge workspace and its public Service/Facade. This Consumer only exposes the read-only records needed for laboratory planning.

The package does not select a model, provider, preset, API key, or session implementation. Those remain owned by DeepSeek Harness configuration. It does not execute document parsers, scripts, devices, or arbitrary model output.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees cited excerpts, immutable source/version identities, confirmation state, and open conflicts through the read-only lab_knowledge_* tools.

#### Token effect

Only requested citation fields and bounded status data are returned; local storage details remain host-side.

#### KV Cache effect

Stable source, version, citation, and conflict identifiers keep repeated retrieval results compact and prefix-friendly.

## Known Limitations and Deferred Work

- This experimental package provides local typed contracts and does not claim production persistence, recovery, or hardware integration.
