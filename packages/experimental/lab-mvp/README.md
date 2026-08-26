# @deepseek-ai/dsh-experimental-lab-mvp
English | [中文](README.zh.md)

Opt-in bundle for the first-round laboratory prototype. It mounts the Knowledge, Planning, Lab Skill, Device, and Runtime Service Definitions together with the local Knowledge, Planning, Skill, Mock Device, Runtime, and read-only Web Consumer Providers.

Configure knowledgePath, storagePath, planning, skill, device, and runtime when loading the bundle. Knowledge defaults to `.lab-data/knowledge.sqlite`, Runtime authority defaults to `.lab-data/runtime.sqlite`, and the Harness cache domain defaults to `.lab-data/lab-storage.sqlite`; use `:memory:` explicitly in isolated tests. The default Harness profile is unchanged; this bundle must be explicitly composed. Agent-facing tools remain a separate opt-in Consumer in tool-lab.

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
- Tool registration is not automatic for an Agent unless tool-lab is explicitly composed.
