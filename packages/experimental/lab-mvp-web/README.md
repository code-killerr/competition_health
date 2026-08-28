# @deepseek-ai/dsh-experimental-lab-mvp-web
English | [中文](README.zh.md)

Minimal Host Consumer for the opt-in laboratory workbench. It preserves the read-only `snapshot()` surface and adds a typed command Facade plus the loopback `/api/lab` route. It orchestrates existing Knowledge, Planning, Skill, Device, Runtime, Session, and Storage Consumers; it does not access provider databases or devices directly.

Project commands use registered Workspace records and Host-generated Project IDs. `project-session-attach` reports Workspace conflicts without moving a Session, `project-session-detach` preserves the Session log, and `project-archive` preserves all Project Sessions for later inspection.

The project protocol also exposes typed page queries and actions for Experiment list/open/create/derive/link, Run list/open/start/stop/retry/compare, structured reports, and Host-authorized Artifact metadata. Page consumers receive domain records and Run views rather than selecting an implicit current Run or submitting browser-generated business ids.

## HTTP command envelope

The loopback endpoint accepts a JSON object with an optional `namespace` field. Use `namespace: "lab"` for the general Knowledge, planning, Skill, device and Runtime commands, and `namespace: "project"` for Project, Experiment, Run and Artifact page commands. The server keeps the namespace out of the typed command passed to the Facade.

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
