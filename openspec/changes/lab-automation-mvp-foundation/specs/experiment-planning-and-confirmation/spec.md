## ADDED Requirements

### Requirement: The system SHALL translate an experiment request into a cited plan draft

The planning flow SHALL capture the user's experiment objective, samples, constraints, expected outputs and unresolved information. The Agent SHALL use Knowledge Service retrieval and SHALL attach citations, assumptions and missing inputs to each generated plan or step.

#### Scenario: The request contains enough evidence

- **WHEN** the user provides an experiment objective and the knowledge service returns applicable evidence
- **THEN** the Agent creates a plan draft containing ordered or dependent steps, citations, parameter sources and expected outputs

#### Scenario: The request is underspecified

- **WHEN** required information or confirmed evidence is missing
- **THEN** the Agent reports the missing information or conflict and leaves the plan in a non-executable state

### Requirement: The system SHALL validate plans deterministically before approval

The plan validator SHALL check step dependencies, required inputs, unit-bearing parameters, evidence citations, device capabilities, operation bindings, Skill revision state and risk-controlled actions. Validation SHALL return stable field-level errors and SHALL not be replaced by an Agent assertion.

#### Scenario: A plan passes validation

- **WHEN** every step has valid dependencies, required inputs, citations, capabilities and an eligible Skill revision
- **THEN** validation returns a pass result that identifies the exact plan revision eligible for human review

#### Scenario: A plan references an inactive Skill

- **WHEN** a plan step references a draft, retired or otherwise non-active Skill revision
- **THEN** validation fails for that step and the plan cannot be approved or started

### Requirement: The system SHALL require human confirmation before execution

The system SHALL present the plan revision, referenced Skill revisions, assumptions, unresolved conflicts, device allocations and risk-controlled operations for explicit human confirmation. Plan approval SHALL be recorded with identity, time and revision identity, and an unapproved plan SHALL not start.

#### Scenario: A user confirms a complete plan

- **WHEN** the user confirms a validated plan and all required Skill revisions
- **THEN** the system records approval evidence and permits creation of a run from that exact plan revision

#### Scenario: A user rejects or changes a plan

- **WHEN** the user rejects the plan or changes a parameter, dependency or operation
- **THEN** the system creates or retains a new non-approved revision and requires validation and confirmation again

### Requirement: The system SHALL expose planning through stage-scoped tools

Knowledge, planning, approval and device capability tools SHALL return structured results, declare their side effects and be exposed only to the stage that needs them. Planning tools SHALL not start a run or submit a raw device command.

#### Scenario: The Agent queries device capability during planning

- **WHEN** the planner needs to determine whether a step can be assigned to a device
- **THEN** the capability tool returns read-only device information without reserving or commanding the device

