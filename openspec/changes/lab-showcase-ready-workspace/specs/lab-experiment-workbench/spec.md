## ADDED Requirements

### Requirement: Experiments are durable Project-owned records
The system SHALL store each Experiment under one LabProject with a generated opaque identifier, title, objective, status, creation Session, optional derived-from Experiment and timestamps. Experiment identity SHALL survive Session closure, archive and conversation compaction.

#### Scenario: Create an Experiment in conversation
- **WHEN** a user confirms an Agent-proposed Experiment in a Project Session
- **THEN** the system creates the Experiment under that Project, records the creating Session and links the conversation to its detail page

#### Scenario: Derive an Experiment
- **WHEN** a user creates a variant from an existing Experiment or a selected conversation checkpoint
- **THEN** the new Experiment records its source Experiment and changed inputs without modifying the source record

### Requirement: Sessions retain explicit Experiment relationships
The system SHALL record whether a Project Session created, continued or reviewed an Experiment. An Experiment SHALL be accessible from every linked Session and SHALL not become owned by one Session.

#### Scenario: Continue an Experiment in another Session
- **WHEN** a user selects an existing Experiment as the active context in another Project Session
- **THEN** the system records the continued relationship and the new Session can create later Plans or Runs for that Experiment

### Requirement: An Experiment retains multiple immutable Runs
The Runtime SHALL retain an ordered set of Runs for an Experiment. Each Run SHALL record its locked Plan revision, launching Session when available, optional retry source, lifecycle status, timestamps, resolved execution graph, observations, feedback and Artifact manifest. Starting a retry or changed execution SHALL create a new Run.

#### Scenario: Retry a failed Run
- **WHEN** a user retries a failed Run after satisfying the required approval state
- **THEN** the system creates a new Run that references the failed Run and preserves both histories

#### Scenario: Session closes during a Run
- **WHEN** the launching Session is closed or archived while a Run remains active
- **THEN** the Run continues according to Runtime policy and remains accessible from the Experiment and Project views

#### Scenario: Start a concurrent Run
- **WHEN** an Experiment already has a non-terminal Run and the user requests another Run
- **THEN** the first showcase rejects the request with the active Run identity instead of starting concurrent physical execution

### Requirement: Run evidence is structured and navigable
The system SHALL store Run Artifacts with identity, kind, display name, authorized location, digest, media type, size and creation time. Observations and reports SHALL preserve references to their Runs, steps, Artifacts and responsible actors.

#### Scenario: Inspect a completed Run
- **WHEN** a user opens a completed Run
- **THEN** the Run detail shows Overview, Parameters, Steps, Evidence, Logs and Timeline using the stored execution and Artifact records

#### Scenario: Preview an Artifact
- **WHEN** an Artifact uses a supported safe preview type
- **THEN** the client renders it through an existing primitive and retains an explicit download or open action

### Requirement: Experiment and Run pages support inspection and comparison
The Project SHALL expose Experiment and Run lists with status, source Session, Plan revision, timestamps and summary results. Users SHALL be able to select completed Runs from one Experiment and compare overview, resolved parameters, observations and Artifact metadata.

#### Scenario: Compare two Runs
- **WHEN** a user selects two completed Runs from the same Experiment
- **THEN** the comparison view highlights parameter, status, duration, observation and Artifact differences without inventing missing metrics

### Requirement: The Agent leads the Experiment lifecycle
The system SHALL use the active Harness Agent to coordinate goal clarification, Knowledge and capability discovery, Experiment proposal, Plan and Lab Skill proposal, approval requests, execution monitoring, failure explanation, replanning, result assessment and report generation. Every model-visible input and Agent-visible lifecycle result SHALL be reconstructable from the Session log.

#### Scenario: Start from a user goal
- **WHEN** a user describes an Experiment through the LABWEAVE Agent input backed by the Harness input state machine
- **THEN** the Agent establishes or selects Project and Experiment context, resolves missing information and produces the next reviewable lifecycle action

#### Scenario: Continue after execution starts
- **WHEN** Runtime emits step, device, approval, observation or Artifact events
- **THEN** the workbench updates and the Agent can explain the recorded state without maintaining an independent execution cursor

### Requirement: Experiment Workflow locks approved Plan and Lab Skill revisions
The product-facing Experiment Workflow SHALL present the Plan steps, dependencies, selected Lab Skill revisions, operation bindings, completion criteria and failure policies used to compile an ExecutionGraph. The Agent MAY reuse active Skills or propose declarative Skill drafts, but only deterministic validation and explicit human approval SHALL make a Plan executable. Harness Skill instructions and short-lived Agent workflows SHALL not own durable experiment state.

#### Scenario: Generate a reviewable Workflow
- **WHEN** the Agent has sufficient cited context and capabilities
- **THEN** the workbench displays the proposed steps, dependencies, inputs, outputs, Skill revisions, validation findings and unresolved items before approval

#### Scenario: Approve an exact revision
- **WHEN** a user approves a validated Plan and all required Skill revisions
- **THEN** Runtime locks those revisions and compiles the Run ExecutionGraph without allowing later drafts to alter it

### Requirement: Failures produce reviewable replanning instead of hidden mutation
The Agent MAY propose a new Plan, Lab Skill or derived Experiment after a failed or blocked Run. The proposal SHALL include the triggering evidence, changed steps or parameters, validation result and revision lineage. It SHALL not mutate the locked Plan or completed Run.

#### Scenario: Replan after a failed step
- **WHEN** Runtime records a failed step with observations or device evidence
- **THEN** the Agent may propose a new revision and the workbench highlights its differences while preserving the failed Run

### Requirement: Result assessment is evidence-backed and gated
The system SHALL derive result assessment from stored completion criteria, deterministic validation, configured algorithm outputs, observations and Artifacts. The Agent MAY synthesize and explain those records, but required QC or release decisions SHALL remain explicit human actions. The authoritative verdict SHALL identify its evidence, method, actor and timestamp.

#### Scenario: Result satisfies automatic criteria
- **WHEN** all configured deterministic criteria pass and no human QC gate is required
- **THEN** the service records a passed verdict with linked observations and Artifacts and the Agent presents the supported conclusion

#### Scenario: Result is ambiguous or high risk
- **WHEN** algorithm outputs conflict, evidence is incomplete or policy requires human QC
- **THEN** the Run enters a waiting state, the Agent explains the evidence and the system requires a named human decision before final disposition

#### Scenario: Result fails
- **WHEN** the authoritative assessment records a failed verdict
- **THEN** the Experiment remains unarchived and the Agent offers evidence-linked replanning, derivation or stop actions without rewriting the Run result
