## Why

The current laboratory Web Consumer proves the lifecycle through a custom stage overlay, but it does not yet provide a natural Harness-native Agent conversation and project workspace. The next increment should make the laboratory prototype operate as a DeepSeek Harness workspace: users navigate knowledge and devices globally, open an experiment project, hold multiple sessions, and let the configured Agent ask questions and draft a cited plan before any human-approved execution.

## What Changes

- Consume the stable public Knowledge Service/Facade contract delivered by `pdf-knowledge-parser-mvp`; this change does not implement parsing, storage or retrieval internals. Its separately packaged Knowledge workspace uses only the public `/api/lab` contract.
- Replace the custom full-screen planning interaction with Harness-native `ui-conversation`, `ui-sidebar`, `ui-layout`, `ui-attachment` and Session surfaces. The experiment UI contributes project-specific cards and controls through existing slots.
- Add global Knowledge, Devices and Projects sidebar entries. The Knowledge entry mounts the independent workspace contributor for the current MVP contract; Harness owns the mount point and never imports Provider or SQLite implementation code.
- Add experiment projects that associate knowledge scope, devices, plans, runs and multiple Harness Session conversations without replacing Harness Session persistence.
- Allow the Agent to retrieve cited knowledge and device facts, ask clarification questions, propose structured plans and create Skill drafts through existing `lab_*` tools. Plan approval, Skill activation and execution remain explicit human-gated actions.
- Keep the completed `interactive-lab-mvp-web` change intact as the baseline HTTP Facade and lifecycle contract; this change extends its browser and provider composition without changing the default Web profile.

## Capabilities

### New Capabilities

- `lab-project-conversations`: experiment projects, project-scoped knowledge/device context, multiple Harness Sessions and conversation-linked plan/run evidence.

### Modified Capabilities

- None. `pdf-knowledge-parser-mvp` owns the current Knowledge ingestion, indexing and retrieval implementation; this change consumes its public contract and supplies the independently packaged workspace integration.

## Impact

- Affects `packages/client/ui-lab-workbench` or its replacement Harness slot contributors, `packages/experimental/lab-mvp-web`, Agent composition, the lab domain and project persistence packages; it does not change Knowledge Provider indexing internals.
- Reuses the Web profile's existing `llm-deepseek`, credentials, Session, Agent preset, `ui-conversation`, `ui-sidebar`, `ui-layout`, `ui-attachment`, Approval and Storage composition.
- Requires project/session association records and a stable integration with Knowledge source IDs, citation IDs, confirmation states, retrieval results and published SOP records; the authoritative conversation log remains Harness Session persistence and the experiment cache remains a rebuildable projection.
- Does not enable the laboratory bundle in the default Web profile, execute arbitrary PDF instructions, auto-install Skills, bypass human approval, or add production authentication and remote device access.
