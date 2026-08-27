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
