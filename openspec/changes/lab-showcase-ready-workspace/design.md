## Context

The repository already provides a directory-backed Harness Workspace browser, durable Session logs, a laboratory Project service, project-scoped Knowledge and devices, plan and Skill approval, a local Runtime and a typed `/api/lab` Facade. The current laboratory client exposes those capabilities through one `conversation.view` contribution with seven stages, manual Project and Experiment identifiers, text fields for opaque source IDs and raw JSON previews. The active `lab-harness-native-workspace` change still lacks the separately owned Knowledge workspace mount, shared capability fixture, composed smoke and final verification.

The product must remain an opt-in plugin composition. Browser code consumes typed Facade records and public UI slots; it does not import Providers, SQLite stores, model clients or device executors. Harness Session logs remain authoritative for conversation and model-visible events. Laboratory Project and Runtime stores retain laboratory records and rebuildable projections. The completed capabilities are integration inputs: this change does not rebuild them, and its frontend-first phase uses only contract-equivalent fixtures that can be replaced by Host adapters.

The interaction direction combines four proven patterns without copying their object models: Open WebUI contributes active project navigation, LibreChat contributes conversation-first attachment, MLflow/ClearML contribute Experiment and Run tables, and eLabFTW/Chemotion contribute revision-aware approval and grouped evidence. Existing DeepSeek Harness UI plugins remain the implementation foundation.

## Implementation correction

The existing UI extension points do not provide a root-scoped application page registry or an additive primary-navigation region. `conversation.view` is a Session tab and `sidebar.footer.action` is an auxiliary action row; neither can own Projects, Knowledge or Devices navigation that must work before a Session exists. The implementation SHALL add the missing general-purpose contracts before moving laboratory pages.

The current `LabWorkbench` structure is not the target architecture. It registers the whole laboratory product as one `conversation.view`, places global navigation in `sidebar.footer.action`, forwards clicks through `window` events, creates Project and Experiment identifiers in browser state and renders experimental requests as a second form beside the real composer. Implementation SHALL remove those responsibilities instead of styling or extending them.

The target browser composition is:

```text
AppFrame
├── SidebarRoot
│   ├── global execution monitor current activity / failures / approvals
│   ├── Projects                 dynamic Project tree
│   │   └── active Project       Overview / Planning / Approval / Execution
│   │                            Steps / Results / Archive
│   ├── Configuration            Knowledge / Agent / Workflow and Lab Skill
│   │                            Devices / People and permissions
│   ├── sidebar.workspaces       ordinary directory Workspaces and Sessions
│   └── Settings
├── LABWEAVE application view
│   ├── Project / Experiment / Run context
│   ├── lifecycle workbench      visual state, review, monitoring and evidence
│   ├── compact Agent dock       one Harness-backed input state machine
│   └── expandable Agent timeline
└── Details

Reusable Harness conversation capabilities
├── Session, draft, queue, slash commands, references and attachments
├── access and model controls
├── ask-user and approval takeovers
└── timeline, message, command and node renderers
```

`ui-layout` owns the active root-scoped application view and exposes `openAppView(id)` and `closeAppView()`. `ui-sidebar` owns only the navigation render location. Laboratory packages register navigation controls and page components; they do not own a second shell or a second input state. In laboratory context LABWEAVE owns the visible composition and consumes reusable Harness conversation capabilities. It does not mount the default Conversation hero, header, inherited-context strip, oversized composer or full-page layout. Wide layouts keep the workbench fully visible above a compact bottom Agent dock and open the timeline as an overlay or bounded panel. Narrow layouts may switch between workbench and expanded Agent timeline, but every mode preserves one input DOM, one draft, the same mounted Session and the active laboratory context.

The visual architecture is frozen before Experiment, Run, Evidence and report details are completed. The global monitor, Project tree, configuration destinations, lifecycle workbench, Agent dock, command cards and detail views use one typography, spacing, status, focus and density system. The Project first viewport prioritizes lifecycle position, current Agent activity, critical path, failures and pending human actions; aggregate counts remain secondary and do not replace Experiment state.
### Implementation audit and client artifact freshness

The source-launched Web Host resolves each browser plugin through its package `./client` export. For `ui-lab-workbench`, that export is the built `lib/client.js`; starting a new Host process does not compile newer files under `src/client/`. A fresh process can therefore serve the old laboratory page when the client bundle or `apps/web/dist` predates the source. Process age and an HTTP 200 response are not evidence that the current client implementation is running.

The laboratory launch path SHALL build or validate every required client artifact before exposing the showcase. Its build record or content revision must prove that `ui-lab-workbench/lib/client.js` and the Web application dist correspond to the current sources. A stale or missing artifact fails startup or acceptance with an actionable diagnostic; the launcher must not silently continue with an older page. Development may use the existing client watch/HMR chain, but the documented non-watch command must remain deterministic.

Phase completion is based on the assembled `examples/lab-web` composition. Exported React components, fixture-only renders and jsdom tests establish component behavior but do not prove that a Project, Experiment, Run, Evidence or Report view is mounted, receives Host-style records or can invoke authorized actions. A task that requires an integrated page remains incomplete until the real composition exposes that page and the relevant interaction can be observed in a browser.

Before phase 8 visual closure and every phase 9 acceptance run, verification records the source revision, client build revision, launch command and browser-visible destination. The browser must receive the current `ui-lab-workbench` plugin bundle, show the hierarchical LABWEAVE shell and preserve a single Harness-backed Agent input without rendering the default Conversation composition. Restarting an unchanged stale bundle, checking only the root HTML or reviewing an isolated component does not satisfy this gate.

## Goals / Non-Goals

**Goals:**

- Deliver one truthful, coherent showcase from ordinary Agent conversation or manual Project creation through cited planning, human approval, controlled execution and evidence-backed report.
- Deliver the result as one runnable `examples/lab-web` prototype with one shell, one launch path and shared state across every page.
- Reuse existing Workspace, Session, conversation state, layout, primitive, trajectory and attachment capabilities while allowing LABWEAVE to own their visible composition.
- Keep directory Workspace, LabProject, Session, Experiment, Run and Artifact identities explicit and navigable.
- Make Experiment a durable Project-owned record and preserve which Sessions created, continued or reviewed it.
- Support multiple immutable Runs per Experiment, including retry provenance, without binding Run lifetime to a Session tab.
- Replace manual opaque identifiers and raw JSON as the primary user workflow with generated IDs, selectable records, structured tables and clear empty, loading, unavailable and failure states.
- Finish the active Knowledge workspace integration before claiming the showcase flow is complete.
- Make the Agent lifecycle, rather than page navigation, the organizing flow for goal interpretation, Knowledge and capability discovery, Plan and Lab Skill proposal, approval, monitoring, replanning, result assessment and reporting.
- Allow the frontend composition and visual states to be completed against contract-equivalent fixtures before connecting every Host-backed projection.

**Non-Goals:**

- Production authentication, multi-tenant authorization, electronic signatures, trusted timestamps or regulatory compliance claims.
- Remote or production device Providers, unattended execution, resource scheduling across projects or recovery that replays interrupted physical commands.
- OCR, coordinate highlighting, advanced table recovery, embedding configuration UI or a general LIMS object designer.
- Aim-style query languages, high-dimensional metric explorers, model registries, pipeline DAG editors or arbitrary nested project folders.
- Making the laboratory composition part of the default Web profile in this change.

## Decisions

### 1. Keep Workspace and LabProject separate and link them explicitly

A directory Workspace continues to own a normalized path, Workspace presentation and cwd-based Session grouping. Every LabProject stores one opaque `workspaceId` and owns experimental scope, Sessions, Experiments and evidence. More than one LabProject may reference the same directory Workspace.

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

### 5. Compose a hierarchical LABWEAVE shell around one reusable Agent surface

`ui-layout` gains an additive root-scoped `app.view` list and an `ILayout` application-view selection API. `ui-sidebar` gains an additive `sidebar.navigation` seat that can render the global execution monitor, dynamic Project tree and configuration center. Navigation must work with no current Session and must not use `window` events, hash fragments or browser-only route copies. The ordinary Workspace and Session browser remains available as Harness infrastructure and does not become a second laboratory navigation system.

Opening a Project selects its durable record, opens the Project application view and expands lifecycle destinations for `Overview`, `Planning and Workflow`, `Plan approval`, `Execution monitoring`, `Step orchestration`, `Results and evidence` and `Archive`. Conversations are supporting provenance reached from the active Project or Agent timeline, not the primary Project taxonomy. Returning to a Project restores its last valid destination from presentation state and reloads authoritative records from the Host.

The Agent remains the primary orchestration path, but LABWEAVE owns its visible surface. `ui-conversation` exposes a reusable presentation contract backed by the same Session, input state machine, draft, queue, slash and reference handling, attachments, access and model controls, ask-user and approval takeovers, timeline, command and node renderers. The laboratory profile renders those capabilities as a compact bottom dock plus an expandable timeline. It SHALL NOT keep the default Conversation page beside or above the workbench, create a second text area, call a lower-level send method that bypasses the input state machine, or hide the original composer with CSS while mounting another input.

The Agent dock shows active Project, Workspace, Experiment and Run context in its own compact chrome. Structured Knowledge retrieval, capability gap, Workflow, Lab Skill, Plan, approval, Run, replan and result-assessment cards register through the durable Session projection and link to workbench detail pages. The laboratory UI SHALL not render objective, sample and constraint forms as a replacement for Agent-led orchestration.

The global execution monitor summarizes active Runs, failures and pending approvals across Projects and links to their authorized destinations. It is a status and navigation projection, not a cross-Project scheduler. The configuration center exposes Knowledge, Agent, Workflow and Lab Skill, Devices, and People and permissions. Every destination consumes a real capability contribution and shows a truthful read-only or unavailable state when the capability is absent; People and permissions SHALL NOT fabricate identities, memberships or authorization.

The Agent may emit a typed presentation intent containing a registered view kind and authorized record identity. The Host validates Project scope and records the user-visible intent before the client changes selection. The model never receives a DOM, arbitrary URL or generic script interface. User navigation always remains available and can override the Agent-selected view.

The visual direction uses dark ink-green navigation and workbench framing, warm neutral reading surfaces and amber attention states through shared client tokens. Global monitor, Project tree, configuration destinations, Workflow, Run, Evidence and Agent views use the same density, hierarchy and focus treatment. Lifecycle position, current work, critical path, failures and human actions lead the page; generic KPI cards remain secondary. Visible strings live in locale dictionaries.

**Alternative considered: retain the seven-stage workbench as primary navigation.** Rejected because it exposes implementation order, duplicates global pages and makes returning users restart a wizard mentally.

**Alternative considered: ship the standalone HTML demo as the product UI.** Rejected because its browser presets do not prove Host, Session or Runtime behavior.

### 6. Make the Agent lifecycle the product orchestration path

The Agent starts from the user's goal, asks for missing inputs, retrieves confirmed Knowledge, queries device and operation capabilities, and then proposes an Experiment Plan. Each Plan step references an active Lab Skill revision; when no suitable revision exists, the Agent may propose a declarative Lab Skill draft with citations, inputs, outputs, operation bindings, completion criteria and failure policy.

The product-facing Experiment Workflow is a projection of the proposed or approved Plan, its locked Lab Skill revisions and the ExecutionGraph compiled by deterministic services. Harness Skills remain model instructions, and `dsh-workflow` remains available for short Agent collaboration; neither owns durable laboratory execution state.

During a Run, the Agent consumes logged step, observation, device, approval and Artifact events. It explains progress and may propose a new Plan or Skill revision after failure, but Runtime remains the only owner of step progression. Result assessment combines deterministic validation, configured algorithm outputs, Agent synthesis and required human QC. Only the service-owned verdict and approvals can complete or release an Experiment.

**Alternative considered: let the Agent execute generated Workflow steps directly.** Rejected because that would bypass version locks, deterministic validation, device permissions, idempotency and recovery semantics.

### 7. Build the frontend journey against replaceable typed adapters

The frontend implementation begins with view models, command result types and event projections shared by two adapters. A deterministic showcase adapter replays typed fixtures through the same observable interfaces used by the Host adapter. Components render records and emit typed user intents; they do not generate domain identities, persist records, advance Run state or calculate verdicts.

The first frontend slice completes typed Agent/workbench behavior, navigation, Workflow graph, Skill and Plan review, step progress, evidence and result states. A dedicated visual-architecture slice replaces the provisional split page with the hierarchical sidebar, lifecycle workbench, compact Agent dock, expandable timeline, responsive behavior and shared presentation system before detail views are completed. The following integration slice connects those components to the existing Facade and durable Session projections. Fixture-only controls are removed or confined to the configured deterministic Provider, so visual completion cannot be mistaken for backend completion.

**Alternative considered: style directly against ad hoc component state and reconcile APIs later.** Rejected because it would recreate the browser-owned state and disconnected-page problem this change is intended to remove.

### 8. Make the showcase deterministic while preserving a real-capability path

The keyless showcase uses deterministic Knowledge, model and device test Providers but traverses the real Facade, Session, Project, Planning, approval, Runtime and browser contributions. The UI labels unavailable or simulated capabilities accurately. An opt-in profile uses configured DeepSeek credentials and the local Docling runtime without changing the product flow.

`examples/lab-web` is the only product prototype entry. Its sidebar, Project pages, conversation, Knowledge, Experiment, Run and Evidence views read the same Host records and preserve navigation state. Project, Experiment, Run and Artifact identities are generated by their owning Host services. No page uses an isolated browser data object, a timestamp-derived identifier, a default `project-1`/`experiment-1`, or a second SPA. A repository script provides the documented one-command launch after required packages are built.

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

### 9. Sequence existing change closure before the product acceptance gate

Implementation first reconciles `pdf-knowledge-parser-mvp`, `pdf-docling-ingestion-mvp` and `lab-harness-native-workspace`: the current code and task states must agree, the independent Knowledge workspace must mount, the public capability fixture must pass and the composed source-to-plan smoke must run. The showcase change then adds the Project/Experiment/Run records and product UI. The default Web profile remains unchanged until the opt-in composition passes all acceptance evidence.

**Alternative considered: build the new UI against untyped placeholders.** Rejected because frontend-first work is acceptable only when fixtures implement the same records, commands, failures and event order as the Host adapter.

## Risks / Trade-offs

- [The change crosses Project, Runtime, Session events and browser packages] -> Land it as ordered implementation sections with focused checks and one proposed Agent Note that owns the new identity relationships.
- [Existing single-Run SQLite data cannot satisfy the new state directly] -> Bump the owning schema version, reject unsupported pre-release records clearly and provide deterministic fixtures for the new format instead of a compatibility shim.
- [Workspace and Project Session lists can diverge] -> Resolve Project Workspace membership through authoritative Workspace and Session records, expose mismatches and never infer a silent move.
- [Runtime persistence can advance before Session evidence is appended] -> Add explicit reconciliation from authoritative Runtime and Project records into rebuildable Session/project projections and test interrupted write ordering.
- [A comprehensive page can become another dense control panel] -> Keep Agent-led orchestration primary, use lifecycle list-detail views for inspection and disclose advanced details progressively.
- [A LABWEAVE-specific input can bypass Harness behavior] -> Reuse the conversation input state machine and takeover renderers through an explicit presentation contract, assert one input DOM and test draft, slash, reference, attachment, ask-user and approval behavior in the assembled profile.
- [The hierarchical sidebar can imply unavailable administration] -> Resolve every configuration destination from registered capability state and render explicit read-only or unavailable states instead of sample identities or permissions.
- [Frontend completion can be mistaken for product completion] -> Mark the fixture adapter as deterministic demonstration infrastructure, keep its records typed and require Host-adapter and event-reload acceptance before completing the change.
- [Agent-driven navigation can surprise users or cross scope] -> Validate registered destinations and record ownership on the Host, log the presentation intent and preserve direct user navigation.
- [Plugin absence can break the live demonstration] -> Every optional capability exposes loading, unavailable and retry states; the keyless showcase profile pins the required deterministic Providers.
- [Open-source inspiration can create incompatible vocabulary] -> Keep Harness terms `Workspace` and `Session` and laboratory terms `Project`, `Experiment`, `Run` and `Artifact`; do not import Folder, Thread or Task as domain aliases.

## Migration Plan

1. Reconcile active Knowledge and workspace change tasks with the current source and complete their shared fixture, workspace mount and composed smoke.
2. Add the new Project, Experiment, Session-link, Run and Artifact records and bump the pre-release storage schemas; update Session events and both SDK projections where required.
3. Extend the typed Facade with generated create, list, open, attach/detach, retry and evidence commands while retaining Provider ownership on the Host.
4. Define the shared frontend records, command results, event projections, reusable conversation presentation contract and presentation intents.
5. Replace the provisional split page with the hierarchical sidebar, Project lifecycle destinations, central workbench, compact Agent dock and expandable timeline; remove obsolete context-strip, manual-ID, local state-transition and raw-JSON controls.
6. Add global monitoring and configuration destinations with truthful capability-backed unavailable states, then complete lifecycle detail views against the deterministic adapter.
7. Connect the same components to the existing Host Facade and durable Session projections, then verify reload, isolation, approval, Runtime, result-assessment and one-input behavior.
8. Add the single-command keyless launch and browser acceptance flow for `examples/lab-web`, then run the same UI with opt-in real-model and real-Docling capabilities when credentials and runtime are configured.
9. Keep the old standalone HTML demonstration unchanged as a design reference only; it is not linked as a product destination and may be removed or archived only in a separate approved change.

Rollback restores the prior opt-in laboratory patch and pre-release SQLite fixtures. No compatibility adapter or partial downgrade is maintained.

## Open Questions

None block proposal readiness. Production authorization, real device transport and advanced comparison visualization require separate changes after the showcase flow is accepted.
