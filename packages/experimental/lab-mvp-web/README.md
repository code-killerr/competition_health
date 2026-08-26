# @deepseek-ai/dsh-experimental-lab-mvp-web
English | [中文](README.zh.md)

Minimal Host Consumer for the opt-in laboratory workbench. It preserves the read-only `snapshot()` surface and adds a typed command Facade plus the loopback `/api/lab` route. It orchestrates existing Knowledge, Planning, Skill, Device, Runtime, Session, and Storage Consumers; it does not access provider databases or devices directly.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees approved plans, controlled run states, and bounded observations through the package typed service or existing `lab_*` tools. Agent planning reuses the active Harness session and preset.

#### Token effect

Only requested plan fields, current-step status, and bounded evidence are returned; local storage details remain host-side.

#### KV Cache effect

Stable experiment, plan, Skill revision, and run identifiers keep repeated step results compact and prefix-friendly.

## Known Limitations and Deferred Work

- The package is intentionally opt-in and uses the existing Web server loopback route rather than the default API RPC map.
- Hardware, parser productionization, and remote scheduling remain outside this first-stage consumer.
