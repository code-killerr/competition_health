## Why

The laboratory repository already contains Knowledge, Planning, Lab Skill, Device, Runtime, Project, Session and evidence capabilities, but the current browser integration presents them mainly as adjacent management pages. The showcase must integrate those completed foundations around one Harness Agent that drives the experiment lifecycle while a shared workbench visualizes, configures and approves the Agent's work.

## What Changes

- Make the existing Harness Agent the primary interaction and orchestration surface from goal clarification through knowledge retrieval, Plan and declarative Lab Skill proposal, approval, execution monitoring, result assessment and revision feedback.
- Present LABWEAVE as one Harness-native laboratory shell. Its sidebar retains the native Workspace and Session browser together with global monitoring and configuration entries. The full-page global monitor owns the cross-Project status list; selecting a Project there switches to its Workspace and opens the corresponding Project workbench.
- Compose the laboratory Project mode from the complete shared native Harness Conversation in the center and the active Project workspace on the right. The Conversation reuses the active Session, input machine, draft, queue, slash/reference/attachment handling, interaction takeovers and message/node renderers; LABWEAVE does not add a compact bottom dock, second input, duplicate Conversation shell or standalone context strip.
- Organize each expanded Project around the user-facing experiment lifecycle: Overview, Planning and Workflow, Plan approval, Execution monitoring, Step orchestration, Results and Evidence, and Archive. Keep the active Experiment and Run as explicit selections inside that Project rather than making record-type tabs the primary navigation.
- Expose Knowledge, Agent configuration, Workflow/Lab Skill configuration, Devices and People/Permissions as one configuration group. A destination without a complete configured capability must render a truthful read-only or unavailable state; this change does not fabricate team identity or authorization records.
- Let the Agent emit validated presentation intents that navigate the workbench to registered Project, Knowledge, Experiment, Run, Evidence and citation views without granting the model direct DOM or router control.
- Implement and visually verify the complete frontend journey first against typed records, command results and deterministic event fixtures that match the production adapters. Browser components do not create authoritative records, advance Runs or calculate verdicts.
- Connect the completed Host capabilities in a following integration phase by replacing fixture adapters with the existing typed Facade, Session events and service-backed projections without changing the user workflow.
- Treat the product-facing Experiment Workflow as the approved Plan plus locked Lab Skill revisions compiled into an ExecutionGraph. Do not introduce a second durable workflow engine or use Harness Skills as the experiment state database.
- Let the Agent create a Host-identified Experiment only inside the LabProject associated with its current Workspace and Session. Keep Plan approval, Lab Skill activation, Run start, risky execution, QC disposition and final release human-gated; the Agent cannot create a Workspace or LabProject, select a foreign Project or start a Run.
- Give the laboratory Agent an additive LABWEAVE identity and workflow-guidance prompt that preserves the Harness identity and tool protocols. Every non-terminal laboratory result identifies the next actor and available typed actions so the Agent yields at human gates instead of retrying a forbidden action or leaving the workbench without a continuation path.
- Preserve generated opaque identities, Workspace-rooted project files, durable Experiments, multiple immutable Runs, Artifacts and reports as Host-owned records shared by conversation and workbench views.
- Preserve the deterministic keyless demonstration and opt-in real-provider path through the same Agent, command, event, approval and Runtime interfaces.

## Capabilities

### New Capabilities

- `lab-project-entry`: Conversation-first and project-first entry, Workspace-to-LabProject association, generated identities, Session attachment, inherited Agent context and a Host-authorized project file root.
- `lab-project-knowledge-workspace`: Independent Knowledge navigation, Project source selection, Agent retrieval and capability-gap handling, and navigable citations through public laboratory records.
- `lab-experiment-workbench`: Agent-led Experiment Workflow and Lab Skill proposal, approval, execution monitoring, replanning, result assessment, durable Experiments, multiple Runs and evidence-backed reports.
- `lab-showcase-navigation`: One integrated Harness application with hierarchical global, Project and configuration navigation, a LABWEAVE-owned Agent surface, validated Agent-driven navigation, responsive states and a deterministic end-to-end showcase.

### Modified Capabilities

None. The repository has no synchronized main OpenSpec capabilities yet; this change records the integrated user-facing behavior produced from the existing active laboratory foundations.

## Impact

- Affects the laboratory client contributors, `ui-layout` composition, `ui-sidebar` navigation, reusable conversation presentation contracts, typed `/api/lab` commands, Session event projections and `examples/lab-web` acceptance flow.
- Reuses the existing Knowledge, Planning, Lab Skill, Device, Runtime, Project, Session, Approval and Artifact services; it does not replace their ownership or reimplement their Provider logic in the browser.
- Adds typed presentation intent and Agent-lifecycle projections that both the frontend fixture adapter and Host-backed adapter must implement.
- Stores generated Workflow/Skill documents, configuration snapshots, intermediate assets and reports only through Host-authorized locations under the selected Project Workspace; identifiers, audit state and execution truth remain service-owned.
- Keeps the change opt-in and experimental and does not add production authentication, remote device transport, unattended physical execution or arbitrary model-generated code execution.
