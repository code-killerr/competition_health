## ADDED Requirements

### Requirement: The prototype is one integrated runnable application
The system SHALL deliver the showcase through the existing `examples/lab-web` composition with one documented launch command, one Harness navigation shell and shared Host-backed Project, Session, Experiment, Run and evidence records. It SHALL not require users to open separate HTML demonstrations or disconnected feature applications to complete the journey.

#### Scenario: Launch the prototype
- **WHEN** a demonstrator runs the documented prototype command after its prerequisites are available
- **THEN** one application opens with cross-Project monitoring, a dynamic Project tree, the configuration center, the active Project lifecycle and the LABWEAVE Agent surface reachable from the same shell

#### Scenario: Continue across pages
- **WHEN** a user imports Knowledge, creates an Experiment in conversation, starts a Run and opens its Evidence view
- **THEN** every page reflects the same Project and record identities without browser-only state copies or manual re-entry

### Requirement: Global, Project and configuration navigation form one Harness-native sidebar
The Harness client SHALL provide a root-scoped application-view registry and an additive primary-navigation region. The laboratory client SHALL use those contracts to render three stable groups in the Harness sidebar: cross-Project execution monitoring, a dynamic Project tree and a configuration center. It SHALL not use `sidebar.footer.action`, process-local browser events, hash fragments or a second application shell as the primary router.

#### Scenario: Navigate before a Session exists
- **WHEN** no Harness Session is current and a user selects execution monitoring, Projects or a configuration destination
- **THEN** the selected root application view opens in the center workbench and the Harness sidebar remains available

#### Scenario: Expand a Project
- **WHEN** a user selects a Project in the sidebar
- **THEN** that Project expands to show Overview, Planning and Workflow, Plan approval, Execution monitoring, Step orchestration, Results and Evidence, and Archive; the workbench, active Experiment selection and Agent context use the same Project identity

#### Scenario: Return to a Project
- **WHEN** a user reopens a previously visited Project
- **THEN** the interface restores the last valid lifecycle destination and active Experiment when authorized records still exist and falls back to Overview otherwise

### Requirement: LABWEAVE owns the visible Agent surface and reuses Harness conversation capabilities
In laboratory context the system SHALL replace the default Conversation page composition with a LABWEAVE-owned Agent surface. The Agent surface SHALL reuse the active Harness Session, input machine, draft, queue, slash commands, references, attachments, access and model controls, ask-user and approval takeovers, timeline state and registered message/node renderers. It SHALL not render a second input implementation or preserve the default hero, Session header, horizontal context strip, large composer or full-page Conversation layout as product requirements.

#### Scenario: Enter a Project Session
- **WHEN** a user opens or creates a Session for an active Project
- **THEN** the workbench shows one compact Agent dock with the current status, latest relevant activity, pending interaction and one input control backed by that Session

#### Scenario: Expand Agent history
- **WHEN** a user expands the Agent dock
- **THEN** the same mounted Session displays its complete timeline, tool calls and structured lifecycle cards without replacing the workbench or creating another draft

#### Scenario: A takeover becomes pending
- **WHEN** ask-user, approval or another registered composer takeover becomes active
- **THEN** the LABWEAVE Agent surface renders that takeover through the existing conversation interaction chain and does not bypass it with a direct `send()` call

#### Scenario: Use the default Web profile
- **WHEN** a non-laboratory application uses the ordinary Conversation composition
- **THEN** its default Conversation layout and behavior remain unchanged

### Requirement: Agent input and lifecycle output remain the primary orchestration path
Users SHALL submit experimental goals through the LABWEAVE Agent input backed by the Harness conversation input machine. Agent clarification, cited Plan proposals, approval state and Run launch state SHALL appear as structured timeline content linked to full Project records. The workbench SHALL not provide a competing objective form or browser-owned execution controls.

#### Scenario: Agent requests clarification
- **WHEN** required samples, constraints, citations or device capabilities are missing
- **THEN** the Agent surface displays the existing conversation interaction and records the answer in the current Session

#### Scenario: Review a proposed Plan
- **WHEN** the Agent submits a valid cited Plan
- **THEN** the Agent timeline and Planning workbench render its revision, citations, assumptions, unresolved inputs and approval actions without requiring pasted JSON

### Requirement: Agent and workbench form one continuous laboratory surface
The central experiment workbench SHALL remain the primary visual region. A compact Agent dock SHALL remain available at the bottom of the workbench and MAY expand into an overlaid or adjacent timeline at wide widths. Narrow layouts MAY switch explicitly between the expanded timeline and workbench, but the compact input, Session, draft and active laboratory context SHALL retain one identity across every presentation.

#### Scenario: Inspect progress while conversing
- **WHEN** a user opens an active Run from an Agent lifecycle card
- **THEN** the experiment canvas displays the Run steps and progress while the compact Agent dock remains available and expanding it reveals the same Session timeline

#### Scenario: Use a narrow layout
- **WHEN** the viewport cannot display both panes at a usable size
- **THEN** the user can switch between the expanded Agent timeline and workbench without creating another conversation, another input element or losing the current draft

### Requirement: The sidebar exposes cross-Project execution state
The execution-monitor destination SHALL summarize active, waiting, failed and recently completed Runs across Projects using Host-style Project, Experiment and Run identities. It SHALL provide navigation to the owning Project and Run and SHALL not imply cross-Project scheduling or mutate Runtime state.

#### Scenario: Open a failed Run from global monitoring
- **WHEN** the monitor shows a failed Run and the user selects it
- **THEN** the sidebar activates the owning Project, the workbench opens its execution or result destination and the Agent context uses that Project and Run

#### Scenario: No Runs are active
- **WHEN** no Project has an active or waiting Run
- **THEN** the monitor shows a truthful empty state and recent terminal Runs when available instead of fabricated activity

### Requirement: Common laboratory capabilities are grouped as configuration
The configuration center SHALL expose Knowledge, Agent configuration, Workflow/Lab Skill configuration, Devices and People/Permissions as stable destinations. Each destination SHALL render records and actions supplied by its owning capability and SHALL present read-only or unavailable state when that capability does not provide the required management operation. The People/Permissions destination SHALL not fabricate user, role or authorization data, and this change SHALL not add production multi-tenant authorization.

#### Scenario: Add Knowledge to the active Project
- **WHEN** a user opens Knowledge from the configuration group and adds a READY source version to the active Project
- **THEN** the Project scope and Agent context update from the typed Host action without changing the selected Project

#### Scenario: Open unavailable People and Permissions
- **WHEN** no laboratory people-management capability is configured
- **THEN** the destination explains that the capability is unavailable and does not show editable example users or roles

### Requirement: Agent navigation is typed, scoped and reversible
The Agent SHALL be able to request presentation of a registered Project, Knowledge, Experiment, Run, Evidence or citation destination through a typed presentation intent. The system SHALL validate the destination against the current Project scope, record the user-visible intent and preserve manual navigation. It SHALL reject arbitrary URLs, DOM operations and unauthorized record identities.

#### Scenario: Agent opens the active Run
- **WHEN** the Agent reports a step failure and emits a valid intent for that Run
- **THEN** the workbench opens the Run step view and the Session records the presentation action

#### Scenario: Agent requests an unauthorized destination
- **WHEN** a presentation intent references a record outside the active Project
- **THEN** the system rejects the navigation, preserves the current view and records an actionable error

### Requirement: Product pages use lifecycle-oriented progressive disclosure
The primary workflow SHALL use an experiment lifecycle, Workflow and execution state as the main visual hierarchy, with selectable records, tables, status summaries and focused detail panels for inspection. Aggregate counts and generic cards SHALL remain secondary. Raw JSON SHALL remain an optional diagnostic view and SHALL not be the only representation of Project, Plan, Run, evidence or report data.

#### Scenario: Open Project Overview
- **WHEN** a Project contains Sessions, Experiments and Runs
- **THEN** Overview leads with lifecycle position, current Agent activity, critical path, failures and pending human actions, then provides objective, Workspace, recent evidence and capability links as supporting context

#### Scenario: Open an empty Project
- **WHEN** a Project has no Experiment or selected source
- **THEN** the page explains the next available action and does not show a blank table or fabricated example data

### Requirement: The showcase remains accessible and responsive
The laboratory UI SHALL use locale dictionaries, shared LABWEAVE tokens, keyboard focus states, semantic status text and responsive layouts. Core sidebar, Project, Agent input, approval, Run and evidence actions SHALL remain operable without drag-and-drop and at narrow desktop or tablet widths.

#### Scenario: Navigate by keyboard
- **WHEN** a keyboard user enters the laboratory workspace
- **THEN** sidebar groups, Project lifecycle destinations, Agent controls, records, approval actions and dialogs expose visible focus and a deterministic order

#### Scenario: Use a narrow viewport
- **WHEN** available width cannot show list and detail panes together
- **THEN** the interface presents one pane at a time with an explicit back path and no clipped primary action

### Requirement: Demonstration states remain truthful
The UI SHALL distinguish deterministic test Providers, mock devices, real configured capabilities, unavailable capabilities and skipped opt-in checks. It SHALL not present browser-only presets or generated example results as production observations.

#### Scenario: Show the keyless demonstration
- **WHEN** the showcase uses deterministic Providers
- **THEN** the UI labels the environment as a demonstration while all displayed Project, Session, Plan, Run and evidence records come from the real application paths

#### Scenario: A capability fails during the demonstration
- **WHEN** Knowledge, model, device or Runtime capability becomes unavailable
- **THEN** the current page preserves completed records, displays the failing capability and offers only actions supported by its current state
