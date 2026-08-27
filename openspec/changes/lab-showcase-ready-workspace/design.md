## Context

The repository already provides a directory-backed Harness Workspace browser, durable Session logs, a laboratory Project service, project-scoped Knowledge and devices, plan and Skill approval, a local Runtime and a typed `/api/lab` Facade. The current laboratory client exposes those capabilities through one `conversation.view` contribution with seven stages, manual Project and Experiment identifiers, text fields for opaque source IDs and raw JSON previews. The active `lab-harness-native-workspace` change still lacks the separately owned Knowledge workspace mount, shared capability fixture, composed smoke and final verification.

The product must remain an opt-in plugin composition. Browser code consumes typed Facade records and public UI slots; it does not import Providers, SQLite stores, model clients or device executors. Harness Session logs remain authoritative for conversation and model-visible events. Laboratory Project and Runtime stores retain laboratory records and rebuildable projections.

The interaction direction combines four proven patterns without copying their object models: Open WebUI contributes active project navigation, LibreChat contributes conversation-first attachment, MLflow/ClearML contribute Experiment and Run tables, and eLabFTW/Chemotion contribute revision-aware approval and grouped evidence. Existing DeepSeek Harness UI plugins remain the implementation foundation.

## Goals / Non-Goals

**Goals:**

- Deliver one truthful, coherent showcase from ordinary Agent conversation or manual Project creation through cited planning, human approval, controlled execution and evidence-backed report.
- Deliver the result as one runnable `examples/lab-web` prototype with one shell, one launch path and shared state across every page.
- Reuse the existing Workspace, Session, conversation, layout, primitive, trajectory and attachment plugins rather than maintaining a second application shell.
- Keep directory Workspace, LabProject, Session, Experiment, Run and Artifact identities explicit and navigable.
- Make Experiment a durable Project-owned record and preserve which Sessions created, continued or reviewed it.
- Support multiple immutable Runs per Experiment, including retry provenance, without binding Run lifetime to a Session tab.
- Replace manual opaque identifiers and raw JSON as the primary user workflow with generated IDs, selectable records, structured tables and clear empty, loading, unavailable and failure states.
- Finish the active Knowledge workspace integration before claiming the showcase flow is complete.

**Non-Goals:**

- Production authentication, multi-tenant authorization, electronic signatures, trusted timestamps or regulatory compliance claims.
- Remote or production device Providers, unattended execution, resource scheduling across projects or recovery that replays interrupted physical commands.
- OCR, coordinate highlighting, advanced table recovery, embedding configuration UI or a general LIMS object designer.
- Aim-style query languages, high-dimensional metric explorers, model registries, pipeline DAG editors or arbitrary nested project folders.
- Making the laboratory composition part of the default Web profile in this change.

## Decisions

### 1. Keep Workspace and LabProject separate and link them explicitly

A directory Workspace continues to own a normalized path, Workspace presentation and cwd-based Session grouping. A LabProject gains an optional opaque `workspaceId` and owns experimental scope, Sessions, Experiments and evidence. One LabProject references at most one Workspace; more than one LabProject may reference the same directory Workspace.

Creating a Project from the current Session defaults to that Session's Workspace. Creating a Project manually requires selecting a registered Workspace or creating one through the existing Workspace picker. Attaching a Session whose cwd does not match the Project Workspace fails with an actionable option to create a new Session in the target Workspace; the client never silently changes the Session cwd.

**Alternative considered: rename LabProject to Workspace.** Rejected because directory membership and laboratory ownership have different lifecycle and deletion rules.

**Alternative considered: duplicate directory selection in the laboratory client.** Rejected because `ui-workspace` already owns directory registration and Session grouping.

### 2. Model Project-owned Experiments and Session provenance as separate records

The Project domain gains durable Experiment records with generated branded identifiers, title, objective, status, `createdInSessionId`, optional `derivedFromExperimentId` and timestamps. An explicit link records whether a Session `created`, `continued` or `reviewed` an Experiment. A Session remains associated with at most one LabProject, while an Experiment can be discussed by many Sessions inside that Project.

The existing Experiment request, plan and cache records reference the durable Experiment identity instead of acting as the Experiment aggregate. Existing evidence projections provide the migration source for records that already have Project, Session and Experiment identifiers.

**Alternative considered: make Experiment a child of its creating Session.** Rejected because later Sessions must continue, compare and report the same Experiment after the original Session is archived.

**Alternative considered: introduce arbitrary nested subexperiments.** Rejected for the first showcase. A derived Experiment records provenance without creating an unlimited folder tree.

### 3. Store multiple immutable Runs under an Experiment

Runtime state changes from `run?: RunView` to an ordered collection of Runs. Every Run records its Experiment, locked Plan revision, launching Session when present, optional retry source, status, timestamps, resolved execution graph, observations, feedback and Artifact manifest. Retry, recovery and parameter change create a new Run; they never overwrite an earlier Run.

Only one non-terminal Run may execute for an Experiment in the first showcase. Completed, failed and stopped Runs remain available for inspection and comparison. Closing or archiving the launching Session does not stop a Run.

**Alternative considered: keep one Run and duplicate the Experiment for retries.** Rejected because it prevents comparison under one scientific question and loses retry provenance.

**Alternative considered: add nested Runs now.** Rejected until sweep, cross-validation or pipeline-stage requirements exist.

### 4. Add an Artifact manifest without building a general file platform

A Run Artifact record contains a generated ID, Run ID, kind, display name, URI or authorized file reference, digest, media type, size and creation time. Runtime observations continue to carry concise evidence strings but may reference Artifacts. Reports select from Run observations and Artifacts and preserve their identities.

The first client supports metadata, safe text/JSON/image previews supplied by existing primitives and download/open actions allowed by the Host. It does not accept arbitrary HTML execution or attach Artifacts to unrelated entity types.

**Alternative considered: keep evidence as strings only.** Rejected because users cannot inspect, verify or navigate real outputs.

### 5. Use Harness navigation with a conversation-centered Project layout

The global sidebar exposes Projects, Knowledge and Devices as real navigation contributions instead of hash links inside the workbench. Opening a Project restores its last active view and Session. The Project page uses a stable header and the tabs `Overview`, `Conversations`, `Experiments`, `Runs` and `Evidence`; Knowledge and Devices remain global pages but expose Project-scope selection actions.

The conversation remains the primary planning surface. A compact context strip above the composer shows Project, Workspace directory, active Experiment, selected Knowledge count, selected device count and temporary attachments. Structured Plan, approval and Run status cards appear in the conversation through the appropriate conversation rendering contribution and link to full Project detail pages.

The initial visual direction keeps the existing dark ink-green navigation, warm neutral content panels and amber attention state. Layout, typography, focus treatment, localization and responsive behavior use existing client tokens and components. Visible strings live in locale dictionaries.

**Alternative considered: retain the seven-stage workbench as primary navigation.** Rejected because it exposes implementation order, duplicates global pages and makes returning users restart a wizard mentally.

**Alternative considered: ship the standalone HTML demo as the product UI.** Rejected because its browser presets do not prove Host, Session or Runtime behavior.

### 6. Make the showcase deterministic while preserving a real-capability path

The keyless showcase uses deterministic Knowledge, model and device test Providers but traverses the real Facade, Session, Project, Planning, approval, Runtime and browser contributions. The UI labels unavailable or simulated capabilities accurately. An opt-in profile uses configured DeepSeek credentials and the local Docling runtime without changing the product flow.

`examples/lab-web` is the only product prototype entry. Its sidebar, Project pages, conversation, Knowledge, Experiment, Run and Evidence views read the same Host records and preserve navigation state. No page uses an isolated browser data object, and no second SPA or copied HTML delivery is created. A repository script provides the documented one-command launch after required packages are built.

The acceptance journey is:

```text
ordinary conversation or New Project
  -> choose Workspace
  -> create/attach Project Session
  -> import source in Knowledge workspace
  -> select source and device scope
  -> create cited Experiment and Plan in conversation
  -> validate and approve exact Plan revision
  -> start and confirm Run steps
  -> inspect Run evidence and Project report
```

**Alternative considered: use browser-only fixtures for the primary demonstration.** Rejected because the stated goal is a real, inspectable application flow.

**Alternative considered: deliver several focused mini-apps.** Rejected because they cannot demonstrate state continuity or a credible end-user product.

### 7. Sequence existing change closure before the product acceptance gate

Implementation first reconciles `pdf-knowledge-parser-mvp`, `pdf-docling-ingestion-mvp` and `lab-harness-native-workspace`: the current code and task states must agree, the independent Knowledge workspace must mount, the public capability fixture must pass and the composed source-to-plan smoke must run. The showcase change then adds the Project/Experiment/Run records and product UI. The default Web profile remains unchanged until the opt-in composition passes all acceptance evidence.

**Alternative considered: build the new UI against the current read-only Knowledge placeholder.** Rejected because it would produce another visually complete but incomplete workflow.

## Risks / Trade-offs

- [The change crosses Project, Runtime, Session events and browser packages] -> Land it as ordered implementation sections with focused checks and one proposed Agent Note that owns the new identity relationships.
- [Existing single-Run SQLite data cannot satisfy the new state directly] -> Bump the owning schema version, reject unsupported pre-release records clearly and provide deterministic fixtures for the new format instead of a compatibility shim.
- [Workspace and Project Session lists can diverge] -> Resolve Project Workspace membership through authoritative Workspace and Session records, expose mismatches and never infer a silent move.
- [Runtime persistence can advance before Session evidence is appended] -> Add explicit reconciliation from authoritative Runtime and Project records into rebuildable Session/project projections and test interrupted write ordering.
- [A comprehensive page can become another dense control panel] -> Keep conversation as the primary action surface, use list-detail pages for inspection and show advanced details progressively.
- [Plugin absence can break the live demonstration] -> Every optional capability exposes loading, unavailable and retry states; the keyless showcase profile pins the required deterministic Providers.
- [Open-source inspiration can create incompatible vocabulary] -> Keep Harness terms `Workspace` and `Session` and laboratory terms `Project`, `Experiment`, `Run` and `Artifact`; do not import Folder, Thread or Task as domain aliases.

## Migration Plan

1. Reconcile active Knowledge and workspace change tasks with the current source and complete their shared fixture, workspace mount and composed smoke.
2. Add the new Project, Experiment, Session-link, Run and Artifact records and bump the pre-release storage schemas; update Session events and both SDK projections where required.
3. Extend the typed Facade with generated create, list, open, attach/detach, retry and evidence commands while retaining Provider ownership on the Host.
4. Replace the laboratory hash navigation and stage console inside `examples/lab-web` with new sidebar/workspace/conversation contributions, then remove obsolete manual-ID and local JSON controls once their deterministic developer path has a supported replacement.
5. Add the single-command keyless launch and browser acceptance flow for `examples/lab-web`, then run the same UI with opt-in real-model and real-Docling capabilities when credentials and runtime are configured.
6. Keep the old standalone HTML demonstration unchanged as a design reference only; it is not linked as a product destination and may be removed or archived only in a separate approved change.

Rollback restores the prior opt-in laboratory patch and pre-release SQLite fixtures. No compatibility adapter or partial downgrade is maintained.

## Open Questions

None block proposal readiness. Production authorization, real device transport and advanced comparison visualization require separate changes after the showcase flow is accepted.
