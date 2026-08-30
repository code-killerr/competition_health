# Agent Note: Harness-native laboratory application surface and durable showcase

Status: proposed

English | [中文](2026-08-28-harness-native-lab-showcase.zh.md)

## Problem

The laboratory prototype already has project, knowledge, planning, runtime and conversation capabilities, but its current browser composition presents them as a stage-oriented workbench. That composition places a session-scoped view and footer actions where root application pages are required, keeps business records in browser state, and makes a keyless demo appear separate from the actual Harness flow. Continuing from that structure would duplicate the shell, navigation and composer while making Project, Session, Experiment and Run ownership unclear.

Several active OpenSpec changes already own parts of the foundation. `lab-harness-native-workspace` owns the current Harness-native project, navigation, conversation and public Knowledge Consumer integration, with only its final verification gate remaining. `pdf-knowledge-parser-mvp` owns the Knowledge ingestion, citation and SOP contract, with only its final verification gate remaining. `pdf-docling-ingestion-mvp` is complete. The unimplemented `pdf-knowledge-parser` line is a separate production parser expansion and is not a prerequisite for the showcase change.

## Proposal

The showcase change adds only the missing product-level composition and durable experiment relationships. Harness `ui-layout` owns a root-scoped application-view registry and `ui-sidebar` owns an additive primary-navigation seat. LABWEAVE uses those contracts for one hierarchical shell: a global execution monitor, a dynamic Project tree, Project lifecycle destinations and a configuration center for Knowledge, Agent, Workflow and Lab Skill, Devices, and People and permissions. Laboratory packages do not create a second application shell or primary router.

LABWEAVE owns the visible application composition. It consumes a reusable `ui-conversation` presentation contract backed by the same Session, input state machine, draft, queue, slash and reference handling, attachments, access and model controls, interaction takeovers, timeline and node renderers. The laboratory profile uses the existing collapsible global sidebar on the left, the full shared Agent conversation with the native Harness header, hero and composer in the center, and a collapsible active Project workspace on the right. It does not retain a duplicate Conversation shell, context strip, duplicate composer or bottom Agent dock. It has one input DOM, one draft and one Session.

The Host remains authoritative for registered directory Workspaces, laboratory Projects, Experiments, Runs, Artifact manifests and Project files. A Project links to exactly one directory Workspace without replacing Workspace identity. A Session remains a Harness conversation and records explicit `created`, `continued` or `reviewed` links to an Experiment. An Experiment retains multiple immutable Runs, and a retry creates a new Run with provenance. The right Project workspace groups authorized Project files as configuration, conversation output and run artifacts. Host writes append a durable Project-scoped file event containing metadata and revision only; the open file catalog reloads from that event. Browser state stores presentation selection and reloads records through typed Facade commands; it never owns absolute paths or file bodies.

The keyless showcase uses deterministic Knowledge, model and device Providers behind the same Host Facade, Session events, approval gates, Runtime records and browser contributions used by the real-capability profile. The UI labels simulated or unavailable capabilities from Provider metadata. It does not create browser-only records, infer demo mode from a missing API key, or replace the real planning and execution path with static fixtures.

The global monitor is a status and navigation projection rather than a cross-Project scheduler. Configuration destinations consume registered capability data and show truthful read-only or unavailable states; People and permissions never fabricate identities or authorization.

## Current verification

On 2026-08-30 the assembled LABWEAVE Web profile was exercised in the in-app browser. The root application view preserves `conversationMode` and default-selection metadata, so LABWEAVE can replace the default page composition with one shared Conversation presentation while retaining the native Harness header, hero and composer. The three-pane Project workspace and Project-file event flow require the revised Stage 8 browser evidence before this proposal can move to implemented.

The verification covered the dynamic global monitor, Projects tree, Project lifecycle destinations, lifecycle-first Overview, pending-action presentation, configuration capability statuses, typed Project and Artifact selection, one textarea, draft retention while changing destinations, Agent timeline expansion, sidebar rail behavior, and desktop, tablet, and narrow layouts. The revised evidence must additionally cover both panel collapse paths, central conversation scrolling, Project/file switching, metadata-event refresh, manual refresh, preview and download. The repeatable assembled browser scenario is `apps/web/tests/lab-showcase.e2e.ts`; the Stage 9 Knowledge-to-report business flow remains outside this evidence.

The client fixture now covers grouped Project-file metadata, authorized preview and download actions, and metadata-only revision events that reload the active catalog. Host command and event wiring remains a Phase 10 dependency, so this does not close the assembled browser gate.

Migration is complete only after the new surfaces are exercised and the replaced `conversation.view` workbench, default Conversation composition in the laboratory profile, flat navigation, `sidebar.footer.action`, `lab:navigate`, browser-generated business IDs, stage mapping, fixed split layout and duplicate composer are removed. The related foundation changes retain their own final verification tasks; this change must not mark those tasks complete or reimplement their owned internals.

## Alternatives considered

**Keep the stage workbench and add more pages beside it.** Rejected because it preserves the incorrect session-scoped ownership and produces a second navigation and interaction model.

**Keep the default Conversation page above or beside the laboratory workbench.** Rejected because coexistence leaves two visual products, obscures the lifecycle workbench and prevents LABWEAVE from presenting Agent orchestration as an integrated laboratory control surface.

**Use a standalone browser demo with local records.** Rejected because it cannot prove Host persistence, Session provenance, approval, Runtime state or refresh continuity.

**Merge directory Workspace and laboratory Project into one entity.** Rejected because directory files and experimental scope have different ownership, lifecycle and attachment rules.

**Treat each retry as a new Experiment with one Run.** Rejected because it loses comparison under one question and obscures retry provenance.

## Acceptance criteria

- The root sidebar exposes the global monitor, dynamic Project tree and configuration center before a Session exists; selecting a Project opens its last valid lifecycle destination.
- LABWEAVE exposes one full central Agent conversation backed by the Harness Session and input state machine, plus a collapsible right Project workspace; the laboratory profile does not render the default Conversation composition, a bottom Agent dock or a second input.
- The right Project workspace groups Host-authorized configuration, conversation-output and run-artifact files; a Project-scoped metadata event refreshes the active catalog without polling or browser filesystem access.
- Project, Experiment, Run and Artifact records are generated and persisted by Host services; browser code submits user fields and selected existing records only.
- One Experiment can retain multiple terminal Runs, including retry provenance, after the launching Session closes or is archived.
- The keyless acceptance journey traverses the real Facade and Session event path from source and citation through plan, approval, Run, Artifact and report.
- The final browser composition has one shell, one hierarchical navigation, one Agent input and one shared data source, with the replaced workbench and coexistence mechanisms absent.
- `lab-harness-native-workspace` and `pdf-knowledge-parser-mvp` remain responsible for their own final verification gates, while `pdf-knowledge-parser` remains outside this showcase scope.

## Risks

- Adding generic application-view and navigation contracts expands Harness client APIs. The risk is limited by keeping the contracts additive, owner-scoped and independently tested before laboratory migration.
- Rejecting old pre-release Project and Runtime formats requires fresh deterministic fixtures. This is accepted because compatibility shims would preserve ambiguous ownership and obsolete single-Run state.
- Deterministic Providers can be mistaken for production capability. Provider metadata, visible status and an opt-in real profile must make the distinction explicit without changing the user flow.
- The migration can leave dead stage code behind if implementation checks only visual output. Browser and source-level acceptance must verify removal of the old registrations, events, IDs and duplicate composer.
- A LABWEAVE-specific input can silently lose Harness draft, queue, attachment or takeover behavior. The implementation must reuse the official conversation presentation contract and assembled tests must assert one input DOM and the complete interaction path.
