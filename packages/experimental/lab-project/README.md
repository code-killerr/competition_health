# @deepseek-ai/dsh-experimental-lab-project

English | [中文](README.zh.md)

Durable project and multi-Session conversation records for the opt-in laboratory workflow.

The package owns laboratory project identities, explicit Knowledge source/version and device associations, Session titles/order, approved shared facts, audit records, and rebuildable plan/run/report evidence. It uses the existing Storage Domain lifecycle and keeps Harness Session logs authoritative for messages and tool events.

Each Project is owned by a registered Harness Workspace. `LabProjectService.create()` generates the Project ID and accepts an optional Workspace ID; when omitted, it resolves the creating Session's registered Workspace. `attachSession()` checks Host Workspace membership and returns an actionable mismatch result without changing the Session cwd. `detachSession()` and `archive()` only change Project records; they never delete or rewrite Session logs.

Project and Agent code consumes Knowledge through the read-only `LabKnowledgeConsumer` seam. The package does not parse files, access Knowledge Provider databases, or implement retrieval.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees Project scope, Session association, approved shared facts, and durable workflow evidence through `ctx.labProjects.context()` and `ctx.labProjects.projectEvidence()`.

#### Token effect

Only the selected Project's bounded scope and evidence are returned; private Session messages remain in their owning Session log.

#### KV Cache effect

Stable Project, Session, Experiment, and evidence identifiers keep repeated context projections compact and prefix-friendly.

## Known Limitations and Deferred Work

- This experimental package records control-plane associations and projections; it does not parse Knowledge files, execute devices, or replace the authoritative Session log.
- Project records require an explicitly registered Harness Workspace and do not migrate a Session between workspaces.
