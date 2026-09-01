# Agent Note: Harness-native laboratory application surface and durable showcase

Status: proposed

English | [中文](2026-08-28-harness-native-lab-showcase.zh.md)

## Problem

The laboratory prototype already has project, knowledge, planning, runtime and conversation capabilities, but its current browser composition presents them as a stage-oriented workbench. That composition places a session-scoped view and footer actions where root application pages are required, keeps business records in browser state, and makes a keyless demo appear separate from the actual Harness flow. Continuing from that structure would duplicate the shell, navigation and composer while making Project, Session, Experiment and Run ownership unclear.

Several active OpenSpec changes already own parts of the foundation. `lab-harness-native-workspace` owns the current Harness-native project, navigation, conversation and public Knowledge Consumer integration, with only its final verification gate remaining. `pdf-knowledge-parser-mvp` owns the Knowledge ingestion, citation and SOP contract, with only its final verification gate remaining. `pdf-docling-ingestion-mvp` is complete. The unimplemented `pdf-knowledge-parser` line is a separate production parser expansion and is not a prerequisite for the showcase change.

## Proposal

The showcase change adds only the missing product-level composition and durable experiment relationships. Harness `ui-layout` owns a root-scoped application-view registry and `ui-sidebar` owns an additive primary-navigation seat. LABWEAVE uses those contracts for one shell whose left sidebar contains the global execution monitor, configuration center and native Workspace/Session tree. Existing Projects appear in the monitor's Project-status section, while Project lifecycle destinations belong to the right Project workspace. Laboratory packages do not create a second application shell, primary router or persistent Project-creation tree.

LABWEAVE owns the visible application composition. Global monitoring and configuration are full-page replacement views that do not mount a Conversation, composer or Project workspace. Project mode consumes a reusable `ui-conversation` presentation contract backed by the same Session, input state machine, draft, queue, slash and reference handling, attachments, access and model controls, interaction takeovers, timeline and node renderers. It uses the existing collapsible global sidebar on the left, the full shared Agent conversation with the native Harness header, hero and composer in the center, and a collapsible, freely resizable active Project workspace on the right. It does not retain a duplicate Conversation shell, context strip, duplicate composer or bottom Agent dock. It has one input DOM, one draft and one Session.

The Host remains authoritative for registered directory Workspaces, laboratory Projects, Experiments, Runs, Artifact manifests and Project files. A Project links to exactly one directory Workspace without replacing Workspace identity, and a Workspace maps to at most one Project: selecting an unmapped Workspace automatically creates a Project named from its directory, while later selections reuse the mapping. The browser never asks the user to create or select that internal Project layer. Selecting a Project-status row resolves and switches to its Workspace, opens the matching Session, selects the linked Project and authorized active Experiment, and then opens the requested Project-workspace destination. A Session remains a Harness conversation and records explicit `created`, `continued` or `reviewed` links to an Experiment. Within the current Session-linked Project, the Agent may request Experiment creation through one Host application operation that generates the Experiment ID and registers the same identity with the Runtime. The Agent cannot create a Workspace or Project, approve Plan or Skill revisions, start a Run, confirm a human step or publish a verdict. An Experiment retains multiple immutable Runs, and a retry creates a new Run with provenance. The right Project workspace groups authorized Project files as configuration, conversation output and run artifacts. Host writes append a durable Project-scoped file event containing metadata and revision only; the open file catalog reloads from that event. Browser state stores presentation selection and reloads records through typed Facade commands; it never owns absolute paths or file bodies.

The laboratory profile adds a scoped LABWEAVE system-prompt contribution without replacing the Harness identity, deployment persona, tool protocol or permission instructions. It identifies the Agent as the current Project's planning, coordination and explanation Agent, defines the lifecycle order and separates Agent, human, Runtime and capability responsibilities. The Agent-callable Experiment creation operation accepts no Project or Experiment ID and returns the same Host-created record when one tool call is retried. Every non-terminal laboratory result identifies its state, scoped records, reason, next actor, allowed actions and an optional registered workbench destination. At a human gate the Agent requests the action once and yields; a durable human-action event provides the continuation. No wait requires a policy-denied Agent operation or an action absent from the workbench.

The keyless showcase uses deterministic Knowledge, model and device Providers behind the same Host Facade, Session events, approval gates, Runtime records and browser contributions used by the real-capability profile. The UI labels simulated or unavailable capabilities from Provider metadata. It does not create browser-only records, infer demo mode from a missing API key, or replace the real planning and execution path with static fixtures.

The global monitor is a status and navigation projection rather than a cross-Project scheduler. Its Project-status section lists durable Projects and their active Run, failure and pending-approval state; selecting a row follows the Project-to-Workspace-to-Session transition before opening the workbench. Configuration destinations consume registered capability data and show truthful read-only or unavailable states; People and permissions never fabricate identities or authorization.

## Current verification

The current assembled LABWEAVE Web profile proves portions of the shared Conversation presentation, Host Project/Session identity, Workflow/Skill/Plan records, Runtime execution, replanning, Project files, verdict and report persistence. It does not yet satisfy the final composition: the monitor still uses a Conversation mode, a separate Project-creation surface remains, and the Agent lacks the complete LABWEAVE prompt, current-Project Experiment-creation operation and typed continuation results. The current tools deny Agent use of `lab_experiment_create` while exposing a proposal-only tool that does not create a Project or Runtime record, so a Project with no Experiment has no accepted Agent bootstrap path.

The existing browser scenarios remain useful regression baselines for lifecycle destinations, status presentation, configuration capability states, typed Project and Artifact selection, draft retention, timeline expansion, panel behavior, responsive layouts and Project-file refresh, preview and download. They do not complete the revised acceptance. In particular, `apps/web/tests/lab-full-lifecycle.e2e.ts` submits an Agent message and clarification but drives the main laboratory lifecycle through direct `/api/lab` calls. It therefore proves Host API integration, not Agent use of real `lab_*` tools, Host-owned Experiment creation or human-owned Run start. Final browser evidence must begin in the composer-free monitor, select a Project-status row, switch the linked Workspace and matching Session, open the authorized Experiment workbench, then complete the Agent-and-human flow through the assembled application.

The client fixture covers grouped Project-file metadata, authorized preview and download actions, and metadata-only revision events that reload the active catalog. The production composition uses a typed Host adapter for Project, Run, report, Run actions, Project-file commands and events, capability summaries, and Agent/Runtime event projections. Stage 8 navigation and layout, the LAB Agent context and creation operation, assembled identity flow, accessibility and repository-wide verification remain open acceptance work.

Migration is complete only after the new surfaces are exercised and the replaced `conversation.view` workbench, default Conversation composition in the laboratory profile, flat navigation, `sidebar.footer.action`, `lab:navigate`, browser-generated business IDs, stage mapping, fixed split layout and duplicate composer are removed. The related foundation changes retain their own final verification tasks; this change must not mark those tasks complete or reimplement their owned internals.

## Alternatives considered

**Keep the stage workbench and add more pages beside it.** Rejected because it preserves the incorrect session-scoped ownership and produces a second navigation and interaction model.

**Keep the default Conversation page above or beside the laboratory workbench.** Rejected because coexistence leaves two visual products, obscures the lifecycle workbench and prevents LABWEAVE from presenting Agent orchestration as an integrated laboratory control surface.

**Use a standalone browser demo with local records.** Rejected because it cannot prove Host persistence, Session provenance, approval, Runtime state or refresh continuity.

**Merge directory Workspace and laboratory Project into one entity.** Rejected because directory files and experimental scope have different ownership, lifecycle and attachment rules.

**Treat each retry as a new Experiment with one Run.** Rejected because it loses comparison under one question and obscures retry provenance.

## Acceptance criteria

- Before a Session is opened, the application shows a composer-free global monitor; the root sidebar contains the monitor, configuration center and native Workspace/Session tree without a separate Project-creation or selection item.
- Existing Projects remain in the monitor's Project-status section; selecting one switches its Workspace, opens the matching Session, selects the linked Project and authorized active Experiment, and opens the requested workbench destination.
- LABWEAVE exposes one full central Agent conversation backed by the Harness Session and input state machine, plus a collapsible right Project workspace; the laboratory profile does not render the default Conversation composition, a bottom Agent dock or a second input.
- The right Project workspace groups Host-authorized configuration, conversation-output and run-artifact files; a Project-scoped metadata event refreshes the active catalog without polling or browser filesystem access.
- Project, Experiment, Run and Artifact records are generated and persisted by Host services; the Agent can request creation of an Experiment only in the current Project, and browser code submits user fields and selected existing records only.
- The laboratory Agent receives an additive LABWEAVE role and ordered workflow prompt while retaining ordinary Harness identity, tool and permission instructions.
- Only a human can adjust and approve Plan or Skill revisions, start a Run and confirm human steps; Agent tools cannot bypass those gates.
- Every non-terminal result names the next actor and permitted actions; human actions are available from a registered workbench destination, and the Agent yields instead of polling or retrying a denied tool.
- One Experiment can retain multiple terminal Runs, including retry provenance, after the launching Session closes or is archived.
- The keyless acceptance journey uses real Agent `lab_*` tools and the same Facade and Session event path from Project context and Experiment creation through source, citation, plan proposal, human approval and Run start, Artifact and report.
- The final browser composition has one shell, one hierarchical navigation, one Agent input and one shared data source, with the replaced workbench and coexistence mechanisms absent.
- `lab-harness-native-workspace` and `pdf-knowledge-parser-mvp` remain responsible for their own final verification gates, while `pdf-knowledge-parser` remains outside this showcase scope.

## Risks

- Adding generic application-view and navigation contracts expands Harness client APIs. The risk is limited by keeping the contracts additive, owner-scoped and independently tested before laboratory migration.
- Rejecting old pre-release Project and Runtime formats requires fresh deterministic fixtures. This is accepted because compatibility shims would preserve ambiguous ownership and obsolete single-Run state.
- Deterministic Providers can be mistaken for production capability. Provider metadata, visible status and an opt-in real profile must make the distinction explicit without changing the user flow.
- The migration can leave dead stage code behind if implementation checks only visual output. Browser and source-level acceptance must verify removal of the old registrations, events, IDs and duplicate composer.
- A LABWEAVE-specific input can silently lose Harness draft, queue, attachment or takeover behavior. The implementation must reuse the official conversation presentation contract and assembled tests must assert one input DOM and the complete interaction path.
- Separating Agent and human permissions can leave a lifecycle state with no permitted actor. Typed progress results, an idempotent Agent bootstrap operation and a focused transition matrix must prove that every wait has a visible continuation or stop action.
