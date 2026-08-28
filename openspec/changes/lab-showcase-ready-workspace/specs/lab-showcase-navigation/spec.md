## ADDED Requirements

### Requirement: The prototype is one integrated runnable application
The system SHALL deliver the showcase through the existing `examples/lab-web` composition with one documented launch command, one Harness navigation shell and shared Host-backed Project, Session, Experiment, Run and evidence records. It SHALL not require users to open separate HTML demonstrations or disconnected feature applications to complete the journey.

#### Scenario: Launch the prototype
- **WHEN** a demonstrator runs the documented prototype command after its prerequisites are available
- **THEN** one application opens with Projects, Knowledge, Devices, conversation, Experiments, Runs and Evidence reachable from the same shell

#### Scenario: Continue across pages
- **WHEN** a user imports Knowledge, creates an Experiment in conversation, starts a Run and opens its Evidence view
- **THEN** every page reflects the same Project and record identities without browser-only state copies or manual re-entry

### Requirement: Global and Project navigation use Harness-native layout slots
The Harness client SHALL provide a root-scoped application-view registry and an additive primary-navigation region. The laboratory client SHALL register Projects, Knowledge and Devices through those public contracts. A Project SHALL expose Overview, Conversations, Experiments, Runs and Evidence views without using `sidebar.footer.action`, process-local browser events or hash fragments as the primary router.

#### Scenario: Navigate before a Session exists
- **WHEN** no Harness Session is current and a user selects Projects, Knowledge or Devices
- **THEN** the selected root application view opens in the center column and the Workspace/Session browser remains available

#### Scenario: Switch Project views
- **WHEN** a user moves between a Project conversation, Experiment and Run detail
- **THEN** the Harness layout preserves the active Project and restores the last relevant Session without creating an untracked conversation

#### Scenario: Return to a Project
- **WHEN** a user reopens a previously visited Project
- **THEN** the interface restores the last valid Project view and falls back to Overview if that record is unavailable

### Requirement: Conversation remains the primary planning surface
Users SHALL submit experimental goals through the existing Harness composer. Agent clarification, cited Plan proposals, approval state and Run launch state SHALL appear as structured conversation content linked to full Project records. The client SHALL not provide a second chat implementation.

#### Scenario: Agent requests clarification
- **WHEN** required samples, constraints, citations or device capabilities are missing
- **THEN** the existing conversation interaction displays the question and records the answer in the current Session

#### Scenario: Review a proposed Plan
- **WHEN** the Agent submits a valid cited Plan
- **THEN** the conversation renders its revision, citations, assumptions, unresolved inputs and approval actions without requiring pasted JSON

### Requirement: Product pages use structured progressive disclosure
The primary workflow SHALL use selectable records, tables, status summaries and focused detail panels. Raw JSON SHALL remain an optional diagnostic view and SHALL not be the only representation of Project, Plan, Run, evidence or report data.

#### Scenario: Open Project Overview
- **WHEN** a Project contains Sessions, Experiments and Runs
- **THEN** Overview summarizes objective, Workspace, active work, pending human actions, recent evidence and capability status with links to the owning detail views

#### Scenario: Open an empty Project
- **WHEN** a Project has no Experiment or selected source
- **THEN** the page explains the next available action and does not show a blank table or fabricated example data

### Requirement: The showcase remains accessible and responsive
The laboratory UI SHALL use locale dictionaries, existing design tokens, keyboard focus states, semantic status text and responsive layouts. Core Project, conversation, approval, Run and evidence actions SHALL remain operable without drag-and-drop and at narrow desktop or tablet widths.

#### Scenario: Navigate by keyboard
- **WHEN** a keyboard user enters the laboratory workspace
- **THEN** global navigation, tabs, records, approval actions and dialogs expose visible focus and a deterministic order

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
