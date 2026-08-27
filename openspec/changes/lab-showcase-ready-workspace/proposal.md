## Why

The laboratory prototype has real Project, Session, Knowledge, Planning, Skill, Device and Runtime paths, but users still encounter manual identifiers, stage-oriented forms, raw JSON and separate demonstrations instead of one coherent product. This change turns those existing capabilities into one launchable, easy-to-navigate, evidence-backed prototype that begins with an ordinary Agent conversation or an explicitly created laboratory project and remains truthful about unavailable integrations.

## What Changes

- Finish the current laboratory workspace integration prerequisites: mount the separately owned Knowledge workspace, consume its public source/version/citation records and prove the composed import-to-planning path.
- Connect a laboratory project to one Harness directory Workspace without merging their identities; keep the directory Workspace responsible for files and Session grouping and the LabProject responsible for experimental scope and evidence.
- Add chat-first and project-first entry paths, generated opaque identifiers, explicit attach/detach behavior and visible context changes when an existing Session joins a project.
- Promote Experiment to a durable project-owned record, keep Session-to-Experiment provenance explicit and let an Experiment retain multiple immutable Runs without making Session lifetime control execution.
- Replace the developer-oriented stage console with Harness-native project, conversation, experiment, Run and evidence views that reuse existing sidebar, workspace, conversation, primitive, trajectory and attachment plugins.
- Add a compact active-context strip, structured plan and approval cards, Run tables and detail views, evidence grouping, actionable empty/error states and responsive presentation suitable for a live product demonstration.
- Make the existing `examples/lab-web` composition the single prototype entry with one launch command, one navigation shell and one shared Project/Session/Experiment/Run state; do not deliver disconnected pages or a second browser-only application.
- Preserve a keyless deterministic demonstration path and add an opt-in real-model/real-Docling path; neither path may present mock devices, skipped capabilities or browser presets as production execution.
- Keep production authentication, multi-tenant authorization, electronic signatures, remote device transport, OCR, advanced metric explorers and arbitrary object schemas out of this change.

## Capabilities

### New Capabilities

- `lab-project-entry`: Conversation-first and project-first entry, Workspace-to-LabProject association, generated identities, Session attachment and visible inherited context.
- `lab-project-knowledge-workspace`: Independent Knowledge workspace navigation, project source selection and a composed source-to-cited-planning workflow through public laboratory capability records.
- `lab-experiment-workbench`: Durable project-owned Experiments, explicit Session provenance, multiple Runs, structured execution/evidence views and report navigation.
- `lab-showcase-navigation`: One integrated Harness-native prototype, product information architecture, reusable UI components, responsive states and a deterministic end-to-end showcase journey.

### Modified Capabilities

None. The repository has no synchronized main OpenSpec capabilities yet; this change depends on active laboratory changes and records its resulting user-facing requirements as new capabilities.

## Impact

- Affects the experimental laboratory domain, project persistence, Runtime persistence, Session event projections, `/api/lab` project/experiment/Run commands and the TypeScript/Python SDK projections required by Session event changes.
- Reworks `@deepseek-ai/dsh-client-ui-lab-workbench` and composes existing `ui-sidebar`, `ui-layout`, `ui-workspace`, `ui-conversation`, `ui-primitives`, `ui-trajectory` and `ui-attachment` contributions instead of adding a parallel application shell.
- Depends on the public Knowledge capability and workspace contribution completed by `pdf-knowledge-parser-mvp`/`pdf-knowledge-parser` and closes the remaining integration tasks in `lab-harness-native-workspace` before showcase acceptance.
- Requires a proposed Agent Note because it changes project ownership, experiment execution history and product navigation across packages.
- Evolves `examples/lab-web` into the single prototype composition and adds focused domain, protocol, browser, keyless composed and opt-in real-capability verification; it does not change the default Web profile until that composition passes its acceptance flow.
