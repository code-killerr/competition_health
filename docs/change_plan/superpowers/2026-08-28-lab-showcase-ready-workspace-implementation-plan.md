# LABWEAVE Native Workspace Continuation Plan

English | [中文](2026-08-28-lab-showcase-ready-workspace-implementation-plan.zh.md)

> **Execution rule:** This document explains how Luna should implement the remaining work in OpenSpec change `lab-showcase-ready-workspace`. [tasks.md](../../../openspec/changes/lab-showcase-ready-workspace/tasks.md) is the authoritative completion tracker. Follow task numbers in order and do not mark a task complete from an isolated component, fixture or screenshot.

## Authority and completion semantics

Read the proposal, design and all four capability specifications before editing code. Preserve unrelated work in the dirty tree and inspect the current diff before each batch.

Phases 0–3 are completed Host foundations. Phase 4 is complete except 4.3. Phases 5–7 established reusable navigation, Session persistence, typed projections and lifecycle components. Their checked state does not approve the current split-page presentation. Phase 8 intentionally replaces that presentation. Tasks 7.3 and 7.4 still complete reusable lifecycle cards; they do not require preserving the default Conversation page.

Do not reopen a checked foundation task merely because its first presentation is removed. Reuse its contract and tests, then replace only the LABWEAVE composition identified by phase 8.

## Target composition

```text
AppFrame
├── LABWEAVE sidebar
│   ├── Global execution monitor
│   ├── Projects
│   │   └── Project
│   │       ├── Overview
│   │       ├── Planning / Workflow
│   │       ├── Plan approval
│   │       ├── Execution monitoring
│   │       ├── Step orchestration
│   │       ├── Results / Evidence
│   │       └── Archive
│   └── Configuration
│       ├── Knowledge
│       ├── Agent
│       ├── Workflow / Lab Skill
│       ├── Devices
│       └── People / permissions
├── LABWEAVE Agent conversation
│   ├── full Session timeline and lifecycle cards
│   └── one shared Harness composer
└── LABWEAVE Project workspace
    ├── Project / Experiment / Run lifecycle destinations
    └── Project files: configuration / conversation output / run artifacts
```

LABWEAVE owns the visible application shell. Its Project desktop composition keeps the existing collapsible sidebar on the left, the full native Harness Agent conversation in the center and a collapsible, freely resizable Project workspace on the right. The global configuration destination uses a full-page replacement view without a conversation input. The LABWEAVE profile must not show a duplicate Conversation shell, second input, standalone context strip, bottom Agent dock or a second application shell.

The final page has exactly one Session, one input DOM and one draft. The input must use the Harness input state machine so queueing, slash commands, references, attachments, access/model controls, ask-user and approval takeovers continue to work. Do not hide the old composer with CSS, mount another textarea or call a lower-level send method.

## Ownership and data flow

- `ui-layout` owns root application-view selection and mounting.
- `ui-sidebar` owns the navigation seat and sidebar behavior, not laboratory records.
- `ui-conversation` owns reusable Session input, timeline and interaction presentation contracts. Its default composition must remain unchanged for non-laboratory profiles.
- `ui-lab-workbench` owns LABWEAVE composition, Project workspace, Project file catalog presentation and lifecycle destinations.
- `ui-lab-knowledge-workspace` continues to own Knowledge import, retrieval and SOP review. LABWEAVE only places its app view under Configuration.
- `LabUiContext` owns presentation selection only. It may store active Project, destination, Experiment, Run, selected Session node and Agent pane state; it must not own domain records.
- `LabWorkbenchAdapter` provides typed records and actions, including the Host-authorized Project file catalog, preview and download actions. Fixture and Host implementations must satisfy the same contract.
- Host Project, Runtime, Knowledge, Session and Workspace services remain authoritative for identities and state.
- The global monitor is a status and navigation projection. It does not schedule or control work across Projects.
- People and permissions must show registered capability data, a read-only state or an unavailable state. Never fabricate users, roles or authorization.

## Work order

### Step 1: Finish narrow adapter queries and reusable lifecycle cards

Complete 4.3, then 7.3 and 7.4.

Remove production use of `snapshot(experimentId)`. Add the page-specific Project, Experiment, Workflow/Plan, Lab Skill, Run, Evidence/Artifact and result queries required by the new destinations. A Run detail query must accept a Run ID and must not infer a current Run from an Experiment.

Implement command and durable-node cards as reusable renderers. They must render result-specific fields, invoke typed actions and carry record links. Verify them inside the assembled LABWEAVE timeline as well as the default conversation test composition.

Exit criteria: the same Session event projection rebuilds cards in both presentations, and no card depends on the old page layout.

### Step 2: Re-establish a trustworthy running artifact

Complete tasks 8.2–8.4 before judging or implementing the remaining visual tasks.

Inspect `packages/client/ui-lab-workbench/package.json`, its client export, TypeScript compiler faces, `lib/client.js`, the Web dist and the `examples/lab-web` launch path. Fix the build dependency that prevents the current source from reaching the browser. Add a deterministic freshness check that either builds the required artifacts or fails with an actionable diagnostic.

Evidence must record source revision, client artifact revision, launch command and browser-visible LABWEAVE marker. A new process, HTTP 200 response or root HTML is insufficient. Stop here if the browser still serves an older bundle.

### Step 3: Extract a reusable conversation presentation contract

Implement task 8.5 before creating the new Agent dock.

Expose reusable, capability-backed pieces from `ui-conversation`: Session context, input state, submit path, draft, queue, slash/reference/attachment handling, access/model controls, interaction takeovers, timeline and node renderers. Prefer a small explicit service/component contract over copying private stores into `ui-lab-workbench`.

Add assembled tests for:

- one input DOM in LABWEAVE;
- draft preservation across Project destination changes;
- slash command, reference and attachment submission through the official input path;
- ask-user and approval takeovers;
- timeline expansion without Session remount;
- unchanged default profile composition.

Exit criteria: LABWEAVE can render the complete shared conversation, native composer and expanded timeline without mounting the default Conversation page composition.

### Step 4: Replace the sidebar information architecture

Implement tasks 8.6 and 8.7.

Replace flat Projects/Knowledge/Devices navigation with the three groups in the target composition. Render Projects from adapter records. Each Project expands to lifecycle destinations and displays only truthful status indicators derived from Run, failure and approval summaries.

Extend the destination union in `LabUiContext`. Define one exhaustive mapping from presentation intent and record kind to destination. Unknown destinations fail loud. Conversations remain reachable as Session provenance but are not a primary Project tab.

Default entry behavior:

1. restore the last valid Project and destination when available;
2. otherwise open the first available Project Overview;
3. otherwise show the Project empty/create state;
4. never default to the original Conversation landing page in the LABWEAVE profile.

### Step 5: Build the LABWEAVE three-pane surface

Implement task 8.8 only after step 3 passes.

The shared Agent conversation occupies the center column and uses the native Harness header, hero, composer, complete timeline, lifecycle cards and all interaction takeovers. The right Project workspace renders Project context, lifecycle destinations and a files destination. It uses the root details panel's collapse, restore and drag behavior and remains available without a current Session. The global configuration view replaces the Conversation for a full-page surface without an input.

Move Project/Workspace/Experiment/Run context from the old input-dock strip into the right Project workspace. Group Project files as configuration, conversation output and run artifacts. After each Host write, a Project/file/revision metadata event makes the active catalog reload; manual refresh uses that same authorized query. Keep the native Harness Conversation header, hero and composer in the center, while removing duplicate inputs, the standalone context strip, bottom dock and oversized custom composer from the LABWEAVE visible tree. Keep non-laboratory behavior unchanged.

Add DOM and behavior assertions, not CSS-only screenshots. The page fails acceptance if two editable message inputs exist, either side panel loses selection on collapse, a generated file does not refresh the active catalog, the browser derives a filesystem path, or a takeover cannot complete an approval.

### Step 6: Add global monitoring and configuration

Implement tasks 8.9 and 8.10.

The monitor lists active Runs, current steps, failures and pending approvals across Projects. Every row links to an authorized Project destination and record. No monitor control may start, stop or reschedule several Projects unless a later capability explicitly provides that command.

Configuration destinations resolve registered capabilities:

- Knowledge opens the independently owned Knowledge app view and preserves active Project scope.
- Agent shows active Agent/preset/model capability and allowed configuration actions.
- Workflow/Lab Skill shows registered revisions, validation and activation state.
- Devices shows selectable capability records and availability.
- People/permissions shows real data, read-only or unavailable.

Each unavailable state must explain which capability is absent and leave the rest of LABWEAVE usable.

### Step 7: Recompose the lifecycle workbench

Implement tasks 8.11–8.14.

Make Overview lifecycle-first: current goal, evidence readiness, Workflow, approval, execution, QC, report, critical path, failures and pending human actions. Counts are secondary.

Move existing Experiment, Workflow, Skill, Run, comparison, Evidence, Artifact and report components into their lifecycle destinations. Delete obsolete split-page wrappers, permanent Agent rail, flat navigation, old KPI-first Overview and generic cards superseded by command-specific cards.

Freeze bidirectional navigation through typed presentation intents. Agent cards open authorized records; workbench records locate their originating Session node. User navigation always overrides Agent selection.

Use the central conversation scroll container and bounded right Project workspace scroll container. The center composer remains visible without covering its last timeline entry. Test desktop, narrow desktop and tablet dimensions, including collapse and restoration of both side panels.

### Step 8: Complete detail content without changing architecture

Implement phase 9.

Planning/Workflow and approval own Experiment, Plan and Lab Skill detail. Execution monitoring and step orchestration own Run status, parameters, graph, logs and recovery. Results/Evidence and Archive own comparison, Artifacts, result assessment, report and provenance.

Do not introduce new top-level tabs, a second shell or another input to fit detail content. If a detail does not fit, use list-detail navigation or a bounded details pane within the frozen destination.

Complete assembled browser tests for every state listed in 9.7.

### Step 9: Connect Host, Agent and Runtime

Implement phase 10.

Replace the production fixture adapter with the Host adapter while preserving the same component contract. Add narrow summary queries for the sidebar and global monitor. Bind the Agent surface to the real Harness Session/input path; no laboratory message transport is permitted.

All Project, Experiment, Run, Artifact and verdict identities come from Host services. Runtime events update the workbench and Agent timeline through durable projections. Agent navigation is Host-validated and scoped. Workspace file writes use authorized Host file operations under the selected Project Workspace.

The deterministic keyless profile and real-provider profile must use the same UI, records, actions and Session event path.

### Step 10: Run assembled acceptance and close the change

Implement phase 11.

The browser journey starts with the central LABWEAVE Agent conversation and right Project workspace, moves through Knowledge, Skill/Workflow, approval, execution, replanning, Evidence, Project files and report, and proves shared Host identities after reload and Session changes.

Acceptance must assert:

- no independent default Conversation landing page, duplicate input or bottom Agent dock; Project uses the native Harness composer;
- exactly one editable Agent input;
- selected Workspace, Project, Experiment and Run stay synchronized;
- global monitor and Project badges reflect Host state;
- Agent presentation intents and manual navigation resolve the same records;
- Knowledge scope updates through typed actions;
- center conversation and right Project workspace remain fully scrollable and unobscured, and both side panels restore selection after collapse;
- Host-created Project files refresh the authorized catalog without polling, while previews and downloads remain adapter actions;
- unavailable capabilities remain truthful;
- fixture and Host modes do not mix.

Run only the focused checks required by the changed surfaces during development. Before completion, run the exact OpenSpec, translation-pairing, typecheck, build, snapshot, browser, documentation and diff checks listed in task 11.7, then use `openspec-verify-change`.

## Luna handoff checklist

Before each implementation batch:

1. identify the exact OpenSpec task numbers;
2. inspect existing changes in every target file;
3. state which completed foundation is reused and which provisional presentation is removed;
4. add a failing focused or assembled test for the acceptance path;
5. implement the smallest coherent change;
6. run the focused checks;
7. inspect the real `examples/lab-web` browser when the task changes visible behavior;
8. update checkboxes only after all task-specific evidence exists.

Do not mark phase 8 complete until the old bottom-dock composition is absent from the real browser and an Agent/Host file event refreshes the active Project catalog. Do not mark phase 10 complete while any production destination reads fixture state. Do not mark phase 11 complete from screenshots without behavioral assertions.
