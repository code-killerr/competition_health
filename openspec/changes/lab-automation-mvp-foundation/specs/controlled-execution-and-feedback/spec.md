## ADDED Requirements

### Requirement: The system SHALL execute only approved plan steps through registered executors

The Runtime SHALL generate an execution graph from an approved plan and Skill snapshot. Each operation SHALL resolve through a registered executor such as `device`, `human` or `approval`; the Runtime SHALL reject arbitrary model-supplied commands, scripts or API calls and SHALL record a structured observation or explicit error for each attempt.

#### Scenario: An approved device step starts

- **WHEN** a run contains an approved device operation with a registered executor and valid parameters
- **THEN** the Runtime submits the operation through Lab Device Service, records the idempotency key and stores the structured receipt or failure

#### Scenario: A step contains an arbitrary command

- **WHEN** a run references a command or script that is not provided by an installed registered executor
- **THEN** the Runtime blocks the step, records the reason and leaves the run in a recoverable blocked or failed state

### Requirement: The system SHALL protect device access with capability, lease and stop semantics

Lab Device Service SHALL expose device capabilities, health, reservation, execution, status, stop and release operations. A device SHALL not have two active conflicting leases, repeated idempotency keys SHALL not create duplicate actions, and a communication failure SHALL not be reported as success.

#### Scenario: A device is reserved and executed

- **WHEN** the Runtime requests a compatible healthy device with a valid lease
- **THEN** the provider accepts the operation, returns a receipt and retains enough state to query or stop it

#### Scenario: A device operation is stopped

- **WHEN** the user or failure policy requests a safe stop
- **THEN** the Runtime records the stop request and final device status separately and does not advance dependent steps until the stop outcome is known

### Requirement: The system SHALL support human and approval waits as first-class steps

Human actions and approvals SHALL be represented as resumable step states with required input, actor and evidence fields. A waiting step SHALL not be treated as successful until the required confirmation is received and validated.

#### Scenario: A human step waits for evidence

- **WHEN** execution reaches a human operation requiring an observation or confirmation
- **THEN** the run enters a waiting state with the required evidence schema and does not execute dependent steps

#### Scenario: A human result is confirmed

- **WHEN** an authorized actor submits a result satisfying the step evidence schema
- **THEN** the Runtime records the actor, evidence and observation, validates the step and resumes eligible dependent steps

### Requirement: The system SHALL validate results and produce auditable feedback

The Runtime SHALL apply deterministic result validators to device receipts, human observations and produced artifacts. It SHALL record validation results, evidence references, errors, re-planning requests and final feedback in the run record and Session events; experiment cache entries SHALL be rebuildable projections.

#### Scenario: A result passes validation

- **WHEN** an observation satisfies the step completion conditions and required evidence
- **THEN** the step is marked validated, its evidence is linked to the run report and eligible successors may proceed

#### Scenario: A result fails validation

- **WHEN** an observation violates a completion condition or lacks required evidence
- **THEN** the Runtime records the failure and stops or requests a new approved plan according to the Skill failure policy without silently marking success

### Requirement: The system SHALL keep execution state recoverable and immutable by run revision

The Runtime SHALL record state transitions, attempts, inputs, outputs, Skill revision IDs and plan revision IDs. A run SHALL be resumable only from a persisted non-terminal state and SHALL not be changed by later plan or Skill revisions.

#### Scenario: The process restarts with a waiting run

- **WHEN** the Runtime restarts while a run is waiting for approval or human evidence
- **THEN** it reconstructs the run and pending action from authoritative records without repeating a completed operation

