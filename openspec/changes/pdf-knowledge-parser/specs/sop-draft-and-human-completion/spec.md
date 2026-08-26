## ADDED Requirements

### Requirement: The system SHALL generate a cited SOP draft from parsed PDF evidence

The SOP draft flow SHALL accept selected PDF citations and create a versioned draft containing ordered steps, step intent, inputs, parameters, preconditions, completion criteria, operation/Skill candidates, assumptions and missing fields. Every generated field that is not explicitly missing or an assumption SHALL reference one or more existing citations.

#### Scenario: Generating a draft with a configured Agent

- **WHEN** a user requests SOP generation for readable PDF blocks and the configured Harness Agent/preset is available
- **THEN** the system invokes the existing Agent configuration with cited evidence, validates structured output, stores a non-published draft and records the source citations and generation session

#### Scenario: The Agent returns an unsupported or uncited field

- **WHEN** generated output contains an invalid parameter, an unknown citation or a factual field without citation
- **THEN** the system rejects or marks that field as a completion gap, retains the source PDF and draft failure details, and does not publish the unsupported field

#### Scenario: The Agent is unavailable

- **WHEN** no configured model/preset can generate the draft
- **THEN** the system records a pending generation/unavailable state and allows explicit human draft entry or retry without fabricating SOP content

### Requirement: The system SHALL support human completion as immutable SOP revisions

Human completion SHALL allow an authorized user to fill missing fields, correct extracted values, resolve conflicts and attach citations. Each change SHALL create a new draft revision with its status, author, timestamp, changed fields, notes and source references; the original PDF and previous revisions SHALL remain recoverable.

#### Scenario: Completing required fields

- **WHEN** a user fills every required field and attaches valid citations or explicitly marks an item as an approved assumption
- **THEN** the service creates a new revision in reviewable state and reports no unresolved required completion gaps

#### Scenario: Leaving a required field incomplete

- **WHEN** a user submits a revision with a missing required field, unresolved conflict or invalid citation
- **THEN** the revision remains non-publishable and exposes field-level completion issues

#### Scenario: Resolving a conflict

- **WHEN** two PDF citations disagree about a value and a user records a resolution decision with supporting evidence
- **THEN** the decision is stored in the existing conflict/audit flow and the affected revision remains distinguishable from the conflicting source facts

### Requirement: The system SHALL publish only confirmed SOP revisions into planning knowledge

The service SHALL require deterministic validation and explicit human approval before publishing a SOP revision. Publishing SHALL create a searchable projection in the existing Knowledge Provider, retain links to the source PDF version and citations, and mark the published facts/steps as confirmed. Drafts, rejected revisions and raw PDF blocks SHALL not be returned as confirmed planning knowledge solely because a model generated them.

#### Scenario: Publishing an approved revision

- **WHEN** a revision has complete required fields, valid citations, no unresolved conflict and recorded human approval
- **THEN** the service creates a published SOP projection with source/version links, indexes it for retrieval and records the approval in Session/Storage audit data

#### Scenario: Attempting to publish an incomplete revision

- **WHEN** a user attempts to publish a revision with missing fields, invalid citations, open conflicts or no approval
- **THEN** the service rejects publication, leaves the revision non-confirmed and returns stable blocking reasons

#### Scenario: Querying confirmed knowledge after publication

- **WHEN** the planning flow searches with confirmed knowledge constraints after a SOP revision is published
- **THEN** the results include the published step and its PDF citations, while draft-only or failed-parser content is excluded from the confirmed result set

### Requirement: The system SHALL provide platform-native evidence review for SOP candidates

The review flow SHALL be available through the platform's Knowledge/Web Facade and SHALL present candidate fields alongside their PDF evidence. A reviewer SHALL be able to inspect the cited page or block, use coordinates when available, edit values and units, mark a field as missing or an explicitly approved assumption, resolve a conflict, and submit an immutable revision. CSV or other tabular exports SHALL not be required for review or batch completion.

#### Scenario: Reviewing an extracted parameter

- **WHEN** a reviewer opens a SOP candidate containing an extracted parameter
- **THEN** the platform displays the value, unit, confidence/warnings and linked PDF page/block evidence, and allows the reviewer to confirm or edit it in the same review flow

#### Scenario: Completing multiple candidate fields

- **WHEN** a reviewer completes several missing or uncertain fields in one review session
- **THEN** the service records one new immutable revision with field-level changes, evidence links, reviewer, timestamp and notes, without requiring CSV export or re-import

#### Scenario: Reviewing a citation without a visual region

- **WHEN** a cited block has a page citation but no usable coordinate region
- **THEN** the platform shows the page/text evidence, marks visual highlighting as unavailable and preserves the citation instead of silently dropping the field

### Requirement: The system SHALL make review writes idempotent and auditable

Human completion, conflict resolution, approval and publication requests SHALL carry an operation or revision identity that prevents accidental duplicate application. Each accepted operation SHALL record the actor, timestamp, changed fields, prior revision, resulting revision and decision note in the existing Session/Storage audit flow.

#### Scenario: Retrying a review submission

- **WHEN** the same review operation is submitted again after a network retry
- **THEN** the service returns the existing resulting revision or operation result and does not create a second identical revision

#### Scenario: Auditing a published change

- **WHEN** a corrected SOP value is published
- **THEN** the service can show the source citation, previous value, corrected value, reviewer decision and resulting published revision
