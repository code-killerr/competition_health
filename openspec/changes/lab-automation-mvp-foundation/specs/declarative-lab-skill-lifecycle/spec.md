## ADDED Requirements

### Requirement: The system SHALL represent experiment Skills as validated declarative revisions

Each Lab Skill revision SHALL declare its purpose, applicability, inputs, outputs, parameter constraints, operations, completion conditions, failure policy, knowledge citations and resource references. The service SHALL reject a revision with missing required fields, unresolved citations, invalid operation bindings or unsupported resources.

#### Scenario: A valid Skill draft is submitted

- **WHEN** the Agent submits a declarative Skill draft with valid citations, parameters and installed resource references
- **THEN** the service creates a draft revision and returns deterministic validation results for the draft

#### Scenario: A Skill draft has an invalid operation binding

- **WHEN** the draft references an unregistered operation implementation or unsupported resource
- **THEN** validation fails with a field-level error and the draft cannot be activated

### Requirement: The system SHALL enforce the Lab Skill lifecycle

The service SHALL enforce the ordered lifecycle `DRAFT → VALIDATED → HUMAN_APPROVED → ACTIVE → RETIRED`. Only an `ACTIVE` revision SHALL be eligible for a plan step, and every activation SHALL retain the approving identity, validation result and revision identity.

#### Scenario: A user approves and activates a validated revision

- **WHEN** a validated draft receives explicit human approval and an activation request
- **THEN** the service creates an active immutable revision with approval evidence and makes it resolvable by revision ID

#### Scenario: An unvalidated draft is activated

- **WHEN** an activation request targets a draft that has not passed validation and human approval
- **THEN** the service rejects the request and leaves the draft non-executable

### Requirement: The system SHALL treat generated scripts as candidate assets

Agent-generated scripts, API payloads or device commands SHALL be stored as candidate artifacts only. They SHALL NOT be executed or bound as active operations until an installed Provider resource has validated and registered the implementation and the Skill revision has completed human approval.

#### Scenario: The Agent generates a script candidate

- **WHEN** planning produces executable-looking script content without an installed approved resource
- **THEN** the system stores the content as a candidate artifact, reports the missing approval or installation state and blocks execution

### Requirement: The system SHALL snapshot active Skill revisions for each run

When an experiment run is created, the system SHALL snapshot every referenced active Skill revision and SHALL use that snapshot for the run. Activating or retiring a later revision SHALL NOT change an already started run.

#### Scenario: A Skill is revised during a run

- **WHEN** a newer Skill revision is activated after a run has started
- **THEN** the active run continues to resolve its original Skill revision snapshot and records the revision identity in step results

