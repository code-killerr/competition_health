## ADDED Requirements

### Requirement: Experiments are durable Project-owned records
The system SHALL store each Experiment under one LabProject with a generated opaque identifier, title, objective, status, creation Session, optional derived-from Experiment and timestamps. Experiment identity SHALL survive Session closure, archive and conversation compaction.

#### Scenario: Create an Experiment in conversation
- **WHEN** the Agent has enough goal information in a Session associated with the active Project
- **THEN** the Agent invokes the Host-owned Experiment creation operation, the Host generates the Experiment identity under that Project, records the creating Session, registers the same identity with Runtime and links the conversation to its detail page

#### Scenario: Agent attempts to create an Experiment outside the current Project
- **WHEN** an Agent request identifies a Workspace or Project that is not associated with its calling Session
- **THEN** the Host rejects the request without creating a Project, Experiment or Runtime record

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
The system SHALL use the active Harness Agent to coordinate goal clarification, current-Project context retrieval, Knowledge and capability discovery, Host-owned Experiment creation, Plan and Lab Skill proposal, approval requests, execution monitoring, failure explanation, replanning, result assessment and report generation. Every model-visible input and Agent-visible lifecycle result SHALL be reconstructable from the Session log. The Agent SHALL NOT create a Workspace or LabProject, approve Plan or Skill revisions, start a Run, confirm a human step or publish an authoritative verdict.

#### Scenario: Start from a user goal
- **WHEN** a user describes an Experiment through the LABWEAVE Agent input backed by the Harness input state machine
- **THEN** the Agent reads the Project resolved from its current Session, resolves missing information, creates the Experiment in that Project and produces the next reviewable lifecycle action

#### Scenario: Start a Run after Agent planning
- **WHEN** the Agent has created an Experiment and proposed a Plan and required Skill revisions
- **THEN** the workbench requires a user to review or adjust the proposal, approve the exact validated revisions and explicitly start the Run

#### Scenario: Continue after execution starts
- **WHEN** Runtime emits step, device, approval, observation or Artifact events
- **THEN** the workbench updates and the Agent can explain the recorded state without maintaining an independent execution cursor

### Requirement: The laboratory Agent receives scoped identity and workflow guidance
The laboratory composition SHALL contribute an additive LABWEAVE system-prompt section that identifies the Agent as the planning, coordination and explanation Agent for the current Project; defines the ordered Experiment lifecycle; identifies Agent, human, Runtime and capability responsibilities; and requires Project context retrieval before Project-scoped mutation. The contribution SHALL preserve the Harness identity, deployment persona, tool protocol and permission instructions. Model-visible prompt and dynamic Project context SHALL remain reconstructable from Session events.

#### Scenario: Assemble the laboratory Agent prompt
- **WHEN** a Harness Agent starts in the laboratory composition with a Session linked to a Project
- **THEN** its assembled prompt includes the LABWEAVE role, ordered lifecycle, current-scope rule, human gates and wait behavior in addition to the ordinary Harness identity and tool instructions

#### Scenario: Use the ordinary Harness profile
- **WHEN** an Agent starts outside the laboratory composition
- **THEN** no LABWEAVE identity or workflow guidance is added and the ordinary Harness prompt remains unchanged

### Requirement: Non-terminal lifecycle states always expose a permitted continuation
Every laboratory command or projection that cannot complete immediately SHALL identify its state, scoped record identities, reason, `nextActor`, `allowedActions` and a registered workbench destination when human action is available. A continuation SHALL never require the Agent to invoke a policy-denied operation or require a human action absent from the workbench. At a human gate the Agent SHALL request the action once and yield without polling or retrying the denied command; the resulting human action SHALL be recorded durably for the next Agent turn.

#### Scenario: Bootstrap a Project with no Experiment
- **WHEN** the current Session resolves to a Project with no Experiment and the Agent has enough goal information
- **THEN** the Agent invokes one Host-owned creation operation without supplying Project or Experiment IDs, the Host creates and links the Experiment exactly once, and planning can continue without a separate human creation action

#### Scenario: Wait for Plan approval and Run start
- **WHEN** validated Plan and Skill revisions require human approval or an approved Plan requires explicit Run start
- **THEN** the result identifies the human as `nextActor`, exposes only authorized review or start actions and their workbench destination, and the Agent yields until a durable human-action event is available

#### Scenario: A required capability is unavailable
- **WHEN** Knowledge, device, planning or Runtime capability cannot perform the next operation
- **THEN** the result names the unavailable capability and exposes a permitted retry, configuration, clarification or stop action instead of leaving the Experiment in an unexplained waiting state

#### Scenario: A repeated creation call is recovered
- **WHEN** the same Agent tool call is retried after the Host created the Experiment but before the result reached the Session
- **THEN** the Host returns the existing Experiment identity and does not create another Project Experiment or Runtime record

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
