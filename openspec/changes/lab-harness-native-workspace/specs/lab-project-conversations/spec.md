## ADDED Requirements

### Requirement: A laboratory project SHALL contain explicit scope and multiple Harness Sessions

The system SHALL provide a durable laboratory project identity with a name, description, selected Knowledge document/version scope and selected device scope. A project SHALL associate with zero or more Harness Session IDs, and each association SHALL retain a display title, ordering and creation metadata. Harness Session persistence SHALL remain authoritative for conversation messages and tool events.

#### Scenario: Creating a project

- **WHEN** a user creates a laboratory project
- **THEN** the system stores the project identity and displays an empty project workspace with its Knowledge and device scope controls

#### Scenario: Adding multiple conversations

- **WHEN** a user starts a second conversation inside the same project
- **THEN** the system creates or associates a separate Harness Session while retaining the project's selected scope

#### Scenario: Opening a project conversation

- **WHEN** a user selects one of the project's Sessions
- **THEN** the Harness conversation surface opens that Session and the project context is available to the laboratory context builder

### Requirement: The project workspace SHALL reuse Harness-native browser surfaces

The laboratory browser contribution SHALL use existing `ui-sidebar`, `ui-layout`, `ui-workspace`, `ui-conversation`, `ui-attachment` and Session slot contracts for navigation, messages, composer, attachments and history. It SHALL not render a replacement full-screen chat implementation or import Host Providers/databases into the browser bundle.

#### Scenario: Navigating between global areas

- **WHEN** a user selects Knowledge, Devices or Projects in the sidebar
- **THEN** the Harness layout changes the active project/workspace view without losing the current Session draft or creating an untracked conversation

#### Scenario: Attaching a source in the Knowledge area

- **WHEN** a user selects a supported source file in the Knowledge area
- **THEN** the separately contributed Knowledge workspace sends it through its typed import flow and the Harness conversation does not send it as an ordinary Agent chat message

### Requirement: The Harness workspace SHALL consume Knowledge through a versioned contract

The project, navigation and Agent context layers SHALL consume capability status, source/version identities, citations, confirmation state and retrieval results through the typed contract published by `pdf-knowledge-parser-mvp`. They SHALL not import the Knowledge Provider, parser, embedding adapter, SQLite schema, ranking implementation or Knowledge workspace client internals.

#### Scenario: Associating Knowledge with a project

- **WHEN** a user selects source/version identities returned by a compatible Knowledge Consumer
- **THEN** the project stores those opaque references and supplies them as scope without copying document content or vectors into project persistence

#### Scenario: Parallel Knowledge line is not available

- **WHEN** the required Knowledge capability or workspace contribution is unavailable or incompatible
- **THEN** Knowledge navigation shows an explicit unavailable state while project/session navigation and fake-Consumer tests remain operable

### Requirement: The Agent SHALL plan through the current Harness Session

The Agent SHALL use the existing `llm-deepseek` route, Agent preset, credentials, Session and model-facing `lab_*` tools. The conversational flow SHALL allow the Agent to retrieve project-scoped knowledge and devices, ask clarification questions and propose a structured plan with citations, assumptions, unresolved inputs and Skill drafts.

#### Scenario: Agent has insufficient inputs

- **WHEN** the current Session lacks a required sample, constraint, device capability or citation
- **THEN** the Agent asks a clarification question and does not submit an executable plan

#### Scenario: Agent proposes a plan

- **WHEN** the Agent has enough project-scoped evidence to draft a plan
- **THEN** it calls the existing planning tools, persists the proposal in the current Session and displays the cited plan as a reviewable conversation-linked card

#### Scenario: Agent provider is unavailable

- **WHEN** the current Harness Session has no usable model credential or route
- **THEN** the conversation displays the provider error and the user can continue with an explicit keyless/local demonstration path

### Requirement: Human approval SHALL gate Skills and execution

The Agent SHALL not approve a plan, activate a Skill revision or start/advance a run solely from a conversational instruction. The project workspace SHALL provide explicit human actions for plan review, Skill validation/approval/activation, step confirmation, stop and report, and SHALL persist their Session/Approval evidence.

#### Scenario: User approves a plan

- **WHEN** a human reviews a validated plan and confirms it
- **THEN** the system records the approval, locks the exact plan/Skill revisions and leaves execution as a separate action

#### Scenario: Agent attempts execution before approval

- **WHEN** an Agent calls a plan approval, Skill activation or run command before the required human gate
- **THEN** the existing Approval/Runtime policy blocks the action and returns a stable reason visible in the conversation

#### Scenario: Execution result is recorded

- **WHEN** a human confirms a step with evidence or stops a run
- **THEN** the system appends the observation/feedback to the current Session, updates the rebuildable experiment cache and exposes the result in the project report

### Requirement: Project context SHALL not leak unapproved Session state

The project context builder SHALL include only explicitly selected Knowledge/device scope and approved/shared project facts. An unapproved plan, draft Skill or private message from another Session SHALL not become confirmed context for a new Session merely because both Sessions belong to the same project.

#### Scenario: Starting a new Session after a rejected plan

- **WHEN** a project contains a rejected plan in another Session and a user starts a new Session
- **THEN** the new context may include the rejection metadata but does not present the rejected plan as an executable or confirmed fact

#### Scenario: Sharing an approved project fact

- **WHEN** a user explicitly publishes or attaches an approved citation or project decision
- **THEN** subsequent Sessions can retrieve it with its source and approval provenance
