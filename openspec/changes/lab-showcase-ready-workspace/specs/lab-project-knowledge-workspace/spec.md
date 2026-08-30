## ADDED Requirements

### Requirement: Knowledge remains an independently owned Harness contribution
The system SHALL expose Knowledge as a real Harness application view reached from the LABWEAVE configuration center. That contribution owns source import, parsing status, retrieval and SOP review. The laboratory Project client SHALL consume only public capability, source, version, citation and publication records and SHALL not import the Knowledge Provider or its storage implementation.

#### Scenario: Open Knowledge from the configuration center
- **WHEN** a user selects Knowledge under the LABWEAVE configuration center
- **THEN** the Harness layout opens the Knowledge application view while the same LABWEAVE shell and capability-backed Agent surface remain available, without routing through a laboratory hash fragment

#### Scenario: Knowledge contribution is unavailable
- **WHEN** the configured Knowledge workspace contribution is missing or incompatible
- **THEN** navigation shows an explicit unavailable state and Project, Session and Device views remain usable

### Requirement: Users can select ready source versions for a Project
The Knowledge and Project pages SHALL let users add or remove READY source/version identities from the active Project through typed commands. The UI SHALL use selectable records and SHALL not require users to type document or version IDs.

#### Scenario: Add a ready source
- **WHEN** a user selects a READY source version and adds it to the active Project
- **THEN** the Project scope stores the opaque source/version identities and the active context display reflects the selection

#### Scenario: Select an unready source
- **WHEN** a source is parsing, failed or unavailable
- **THEN** the selection action is disabled or rejected with its current status and actionable recovery information

### Requirement: Imported sources provide navigable citations
Confirmed retrieval results used for planning SHALL retain source, version, page or block location, confirmation state and conflict state. A citation shown in a Plan, Run report or conversation card SHALL navigate to the corresponding Knowledge detail when the contribution is available.

#### Scenario: Open a Plan citation
- **WHEN** a user selects a citation from a structured Plan card
- **THEN** the system opens the cited source/version and location without copying Provider internals into the conversation client

### Requirement: The composed Knowledge-to-Plan flow is verifiable without a model key
The opt-in showcase composition SHALL provide a deterministic keyless route that imports a supported source, selects it for a Project, retrieves confirmed citations and submits a human-reviewable Plan through the real Facade and Session event path.

#### Scenario: Run the keyless showcase
- **WHEN** the deterministic showcase profile executes its documented acceptance journey
- **THEN** the resulting Plan contains valid citations from the selected Project source and no unselected source content becomes confirmed planning context

#### Scenario: Use real Docling and model capabilities
- **WHEN** the local Docling runtime and model credentials are explicitly configured
- **THEN** the same product flow uses those real capabilities and reports their provider failures without falling back to browser presets

### Requirement: Agent planning resolves evidence and capability gaps before proposal
Before proposing an executable Plan, the Agent SHALL retrieve confirmed Project-scoped Knowledge, inspect available Lab Skill, operation and device capabilities, and preserve citations and unresolved inputs. When evidence or capability is insufficient, it SHALL ask for clarification, propose a declarative Lab Skill draft or report an explicit capability gap instead of inventing an executable step.

#### Scenario: Existing Skill satisfies a step
- **WHEN** confirmed Knowledge and an active compatible Lab Skill cover the requested operation
- **THEN** the Agent proposal references that Skill revision, its citations and the compatible capability

#### Scenario: No approved Skill satisfies a step
- **WHEN** the requested operation has evidence but no active compatible Lab Skill
- **THEN** the Agent may propose a declarative Skill draft for validation and approval but cannot mark the Plan executable

#### Scenario: Evidence is insufficient
- **WHEN** required parameters or provenance are missing from confirmed Project Knowledge
- **THEN** the Agent asks for the missing information or records an unresolved item and the Runtime start action remains unavailable
