## ADDED Requirements

### Requirement: The system SHALL provide an opt-in interactive experiment workbench

The experiment Web overlay SHALL load through the DeepSeek Harness client module system and SHALL render a workbench whose state comes from the experiment Web Facade. The workbench SHALL expose knowledge, request, plan, confirmation, execution and verification stages, and SHALL not require the default Web profile to load experimental packages.

#### Scenario: Loading the experimental overlay

- **WHEN** the opt-in experiment overlay is enabled and the Web client starts
- **THEN** the browser loads the declared client bundle, obtains a typed experiment snapshot, and renders the stage navigation without importing a Provider or database module

#### Scenario: Loading with no experiment data

- **WHEN** the experiment database has no documents, plans or runs
- **THEN** the workbench renders explicit empty states and keeps import, request and device inspection actions available without inventing sample data

### Requirement: The system SHALL expose knowledge import and citation-bearing retrieval actions

The workbench SHALL allow a user to submit supported knowledge sources and inspect import status, failures and metadata. A retrieval result SHALL show document/version identity, page or block location, excerpt, confirmation/conflict status and score before the result can be used in a plan.

#### Scenario: Importing a source from the workbench

- **WHEN** a user submits a valid source and metadata through the knowledge stage
- **THEN** the Facade registers the source through Knowledge Service, returns an import identifier, and the workbench refreshes the processing status without writing directly to SQLite

#### Scenario: Searching with insufficient evidence

- **WHEN** a user searches for a requirement and no usable evidence matches
- **THEN** the workbench shows an explicit no-match or insufficient-evidence state and does not add an inferred protocol fact to the request or plan

#### Scenario: Inspecting a conflicted citation

- **WHEN** retrieval returns a citation with an open conflict or without human confirmation
- **THEN** the workbench marks the citation as unresolved and prevents the user from treating it as confirmed planning evidence until the existing knowledge confirmation flow resolves it

### Requirement: The system SHALL translate a user request into an inspectable plan

The workbench SHALL collect an experiment objective, samples, constraints and expected outputs, then allow the user to request either an explicit local demonstration plan or an Agent-generated plan. Every plan step SHALL display its citations, Skill revision, operation kind, inputs, parameters, dependencies and missing information.

#### Scenario: Generating a plan with the configured Agent

- **WHEN** the user explicitly requests Agent planning and the configured Harness Agent/preset is available
- **THEN** the Facade records the request in the existing Session context, invokes the existing planning tools, and returns a structured non-executable plan with citations and validation state

#### Scenario: Generating a keyless local demonstration plan

- **WHEN** the user selects local demonstration mode without a model token
- **THEN** the system uses only an explicit test/development fixture or deterministic local Provider result, labels the plan as local demonstration output, and applies the same plan validation rules

#### Scenario: The request lacks required information

- **WHEN** required inputs, confirmed citations, Skill revisions or device capabilities are missing
- **THEN** the plan remains non-executable and the workbench lists stable field-level blocking issues instead of filling the gaps with undocumented defaults

### Requirement: The system SHALL require human confirmation for generated plans and steps

The workbench SHALL present the exact plan revision, assumptions, unresolved conflicts, referenced Skill revisions, device allocations and risk-controlled operations for confirmation. A generated step SHALL not be executed until the user has explicitly confirmed that step and the plan revision it belongs to.

#### Scenario: Confirming a complete plan revision

- **WHEN** the user confirms a validated plan and all required Skill revisions
- **THEN** the system records identity, time and revision in the existing approval/session flow and enables execution for that exact plan revision

#### Scenario: Confirming individual steps

- **WHEN** the user reviews a plan step and confirms its parameters, Skill and operation resource
- **THEN** the step receives a durable confirmation state tied to the plan revision and only that confirmed step becomes eligible for runtime execution

#### Scenario: Editing or rejecting a step

- **WHEN** the user changes a parameter, dependency or operation, or rejects a step
- **THEN** the system creates or retains a non-approved plan revision, reruns deterministic validation and disables execution until confirmation is repeated

### Requirement: The system SHALL execute only approved declarative operations

Execution commands from the workbench SHALL call Runtime and registered Skill/Operation executors only. The browser SHALL never send raw device commands, arbitrary scripts or arbitrary API requests. Runtime status, device state, step outputs and failures SHALL be visible in the workbench.

#### Scenario: Starting an approved run

- **WHEN** the user starts a plan whose required plan and step confirmations are present and whose Skill revisions are active
- **THEN** Runtime creates a run from the locked plan snapshot and the workbench displays the run identifier and initial status

#### Scenario: A step requires a mock device

- **WHEN** an approved step is assigned to an available Mock Device capability
- **THEN** Runtime invokes the registered device executor, records a structured observation and the workbench shows the step transition without exposing the device implementation to the browser

#### Scenario: A step is blocked or stopped

- **WHEN** a step is missing a confirmation, device capability, installed operation or safe result, or the user requests stop
- **THEN** Runtime leaves an auditable blocked/stopped status, does not run later unsafe steps, and the workbench shows the blocking reason

### Requirement: The system SHALL support result verification and final feedback

The workbench SHALL show step observations, verification inputs, pass/fail outcomes, unresolved issues and a final report. Feedback SHALL be stored through the existing Runtime/Session/Storage projection and SHALL be associated with the experiment, plan revision and run.

#### Scenario: Verifying a completed run

- **WHEN** a user reviews the observations of a completed or stopped run and submits verification
- **THEN** the system records the verification decision and evidence references, refreshes the run report and keeps the result associated with its run snapshot

#### Scenario: Reviewing the final report

- **WHEN** the user opens the feedback stage for a run with available observations
- **THEN** the workbench renders the ordered timeline, plan/Skill references, device results, verification outcome and unresolved issues from runtime data

### Requirement: The system SHALL expose stable errors and preserve safety gates

The Facade SHALL validate request bodies and domain state before invoking side effects. Errors SHALL include a stable code and user-actionable details. Model unavailability, parser failure, provider absence, conflict, invalid revision and device failure SHALL remain visible and SHALL not be converted into successful demo states.

#### Scenario: An invalid command is submitted

- **WHEN** the browser submits an unknown command, malformed JSON or a payload that fails the command schema
- **THEN** the Facade returns a client error with a stable code and the workbench keeps the previous authoritative state unchanged

#### Scenario: An Agent or Provider is unavailable

- **WHEN** the user requests Agent planning without a configured model or a required experimental Provider is unavailable
- **THEN** the workbench reports the unavailable capability, offers only the explicitly supported local path, and does not claim that a plan or run was generated
