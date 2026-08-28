# Agent Note: Harness-native laboratory application surface and durable showcase

Status: proposed

English | [中文](2026-08-28-harness-native-lab-showcase.zh.md)

## Problem

The laboratory prototype already has project, knowledge, planning, runtime and conversation capabilities, but its current browser composition presents them as a stage-oriented workbench. That composition places a session-scoped view and footer actions where root application pages are required, keeps business records in browser state, and makes a keyless demo appear separate from the actual Harness flow. Continuing from that structure would duplicate the shell, navigation and composer while making Project, Session, Experiment and Run ownership unclear.

Several active OpenSpec changes already own parts of the foundation. `lab-harness-native-workspace` owns the current Harness-native project, navigation, conversation and public Knowledge Consumer integration, with only its final verification gate remaining. `pdf-knowledge-parser-mvp` owns the Knowledge ingestion, citation and SOP contract, with only its final verification gate remaining. `pdf-docling-ingestion-mvp` is complete. The unimplemented `pdf-knowledge-parser` line is a separate production parser expansion and is not a prerequisite for the showcase change.

## Proposal

The showcase change adds only the missing product-level composition and durable experiment relationships. Harness `ui-layout` owns a root-scoped application-view registry and `ui-sidebar` owns an additive primary-navigation seat. Laboratory packages register Projects, Knowledge and Devices into those public surfaces; they do not create a second application shell, primary router or composer.

The Host remains authoritative for registered directory Workspaces, laboratory Projects, Experiments, Runs and Artifact manifests. A Project links to exactly one directory Workspace without replacing Workspace identity. A Session remains a Harness conversation and records explicit `created`, `continued` or `reviewed` links to an Experiment. An Experiment retains multiple immutable Runs, and a retry creates a new Run with provenance. Browser state stores only presentation selection and reloads business records through typed Facade commands.

The keyless showcase uses deterministic Knowledge, model and device Providers behind the same Host Facade, Session events, approval gates, Runtime records and browser contributions used by the real-capability profile. The UI labels simulated or unavailable capabilities from Provider metadata. It does not create browser-only records, infer demo mode from a missing API key, or replace the real planning and execution path with static fixtures.

Migration is complete only after the new surfaces are exercised and the replaced `conversation.view` workbench, `sidebar.footer.action` navigation, `lab:navigate` event, browser-generated business IDs, stage mapping and second composer are removed. The related foundation changes retain their own final verification tasks; this change must not mark those tasks complete or reimplement their owned internals.

## Alternatives considered

**Keep the stage workbench and add more pages beside it.** Rejected because it preserves the incorrect session-scoped ownership and produces a second navigation and interaction model.

**Use a standalone browser demo with local records.** Rejected because it cannot prove Host persistence, Session provenance, approval, Runtime state or refresh continuity.

**Merge directory Workspace and laboratory Project into one entity.** Rejected because directory files and experimental scope have different ownership, lifecycle and attachment rules.

**Treat each retry as a new Experiment with one Run.** Rejected because it loses comparison under one question and obscures retry provenance.

## Acceptance criteria

- Projects, Knowledge and Devices open from a Harness root application view when no Session exists, and selecting a Session returns to the existing Conversation without unmounting it.
- Project, Experiment, Run and Artifact records are generated and persisted by Host services; browser code submits user fields and selected existing records only.
- One Experiment can retain multiple terminal Runs, including retry provenance, after the launching Session closes or is archived.
- The keyless acceptance journey traverses the real Facade and Session event path from source and citation through plan, approval, Run, Artifact and report.
- The final browser composition has one shell, one primary navigation, one composer and one shared data source, with the replaced workbench mechanisms absent.
- `lab-harness-native-workspace` and `pdf-knowledge-parser-mvp` remain responsible for their own final verification gates, while `pdf-knowledge-parser` remains outside this showcase scope.

## Risks

- Adding generic application-view and navigation contracts expands Harness client APIs. The risk is limited by keeping the contracts additive, owner-scoped and independently tested before laboratory migration.
- Rejecting old pre-release Project and Runtime formats requires fresh deterministic fixtures. This is accepted because compatibility shims would preserve ambiguous ownership and obsolete single-Run state.
- Deterministic Providers can be mistaken for production capability. Provider metadata, visible status and an opt-in real profile must make the distinction explicit without changing the user flow.
- The migration can leave dead stage code behind if implementation checks only visual output. Browser and source-level acceptance must verify removal of the old registrations, events, IDs and duplicate composer.
