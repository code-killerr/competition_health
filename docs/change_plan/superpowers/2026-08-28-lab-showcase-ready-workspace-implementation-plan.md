# LABWEAVE Native Workspace Continuation Implementation Plan

English | [中文](2026-08-28-lab-showcase-ready-workspace-implementation-plan.zh.md)

> **Execution requirement:** Use `superpowers:executing-plans` to implement one batch at a time and check [tasks.md](../../../openspec/changes/lab-showcase-ready-workspace/tasks.md) at every checkpoint. This document fixes the implementation order and technical locations; `tasks.md` is the sole authority for completion state.

**Goal:** Complete the 11 remaining items in `lab-showcase-ready-workspace`: LABWEAVE opens on a conversation-free global monitor, a Project click selects the corresponding Workspace/Session and opens the three-pane workbench, and a laboratory-aware Agent can create and plan an Experiment before yielding at human gates.

**Architecture:** Workspace is the user-visible laboratory project entry and maps to at most one internal LabProject; a LabProject owns multiple Sessions, Experiments, and Runs. The browser retains presentation selection only. A Host application operation owns identity resolution, persistence, and cross-service consistency, and both Agent tools and the Web Facade reuse that operation.

**Tech Stack:** TypeScript, Cordis plugins/services, React, Harness client slots/runtime, Session event log, Vitest, assembled Chromium, and OpenSpec.

**Spec:** [proposal](../../../openspec/changes/lab-showcase-ready-workspace/proposal.md), [design](../../../openspec/changes/lab-showcase-ready-workspace/design.md), and the four delta specs under `openspec/changes/lab-showcase-ready-workspace/specs/`.

## Global Constraints

- Preserve unrelated changes in the current worktree. Run `git status --short` before each batch and edit only the files listed for that batch.
- Do not add a standalone Project creation page. Host creates or reuses the Workspace mapping automatically, and the Project name comes from the Host Workspace title or path basename.
- The browser never generates Project, Experiment, Run, or file identities and never stores domain records, file bodies, or absolute paths.
- The Agent may create an Experiment inside the current Session's Project. It may not create a Workspace/LabProject, approve a Plan/Skill, start a Run, confirm a human step, or publish a verdict.
- Every model-visible input and continuation state is recorded as a Session event. Reload and replay reconstruct only from Host records and the event log.
- Default-profile Conversation, sidebar, and details behavior remains unchanged. LABWEAVE reuses the Harness input state machine and always has one Session, one draft, and one input DOM.
- Do not add silent fallbacks. Unresolvable Workspace, Session, Project, or capability state returns a typed unavailable/blocked result with a real executable next action.
- This plan does not authorize new product copy. New visible strings must be added to both locale resources and pinned by tests in the same batch.

## Locked User Flow

```text
首次进入
  -> 全局执行监控（replace view，无 Conversation/composer/details）
  -> Project 状态列表
  -> 点击 Project/Run
  -> Host 返回 Project 的 Workspace + matching Session + active Experiment/Run
  -> ctx.workspaces.connectWorkspace(workspaceId)
  -> ctx.sessions.open(matchingSessionId)
  -> LabUiContext 选择 Project/Experiment/Run/destination
  -> ctx.layout.openAppView('lab-project')
  -> 左侧原生 sidebar + 中间原生 Conversation + 右侧 Project workspace
```

The matching Session order is fixed. A Run click prefers a Session linked to that Experiment that still belongs to the Workspace. A Project click prefers the Project's most recently active associated Session. If neither exists, call `connectWorkspace()` to obtain a reusable or new blank Session and let Host attach it idempotently. The browser must not infer a Session from array order.

## Public Types to Add or Converge

### Workspace/Project Entry Resolution

Use the existing Host-owned services as the application boundary. `LabProjectService.create()` and `projectForSession()` own Workspace-to-Project mapping, `LabProjectService.createExperiment()` owns generated Experiment identity and operation replay, and `LabMvpWebService.createAgentExperiment()` is the sole Agent/Web entry that binds the Project record to the Runtime record. Do not create a parallel application package unless a later change proves that these responsibilities must evolve independently.

```ts
import type { ExperimentId, LabExperimentRecord, LabProjectId, RunId, WorkspaceId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { SessionId } from '@deepseek-ai/dsh-session'

export interface ResolveLabProjectEntryRequest {
  readonly workspaceId?: WorkspaceId
  readonly sessionId: SessionId
  readonly projectId?: LabProjectId
  readonly experimentId?: ExperimentId
  readonly runId?: RunId
}

export interface LabProjectEntryResolution {
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly projectId: LabProjectId
  readonly experimentId?: ExperimentId
  readonly runId?: RunId
  readonly createdProject: boolean
  readonly attachedSession: boolean
}

export interface BootstrapLabExperimentRequest {
  readonly sessionId: SessionId
  readonly requestId: string
  readonly title: string
  readonly objective: string
  readonly expectedOutputs: readonly string[]
}

export interface BootstrapLabExperimentResult {
  readonly resolution: LabProjectEntryResolution
  readonly experiment: LabExperimentRecord
  readonly createdExperiment: boolean
  readonly registeredRuntime: boolean
}
```

For an Agent tool, `operationId` is the opaque tool-call identity. `LabProjectService.createExperiment()` persists that key in the Project audit/state path. The same key and same input return the original Experiment; the same key with different input fails loud. Runtime `createExperiment()` is idempotent for the same ID and equal request while still rejecting conflicting content, so a retry is safe when Project commit succeeded but the Runtime response was lost.

### Lifecycle Progress Result

Define and export the following from `packages/experimental/lab-domain/src/types.ts`:

```ts
import type { ExperimentId, LabProjectId, PlanId, RunId, WorkspaceId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { SessionId } from '@deepseek-ai/dsh-session'

export type LabProgressActor = 'agent' | 'human' | 'runtime' | 'capability'
export type LabProgressState = 'registered' | 'already-registered' | 'blocked' | 'waiting' | 'unavailable' | 'failed' | 'completed'

export interface LabScopedRecordIds {
  readonly workspaceId?: WorkspaceId
  readonly sessionId?: SessionId
  readonly projectId?: LabProjectId
  readonly experimentId?: ExperimentId
  readonly planId?: PlanId
  readonly runId?: RunId
}

export interface LabProgressResult {
  readonly state: LabProgressState
  readonly sessionId: SessionId
  readonly scopedIds: LabScopedRecordIds
  readonly reason: string
  readonly nextActor: LabProgressActor
  readonly allowedActions: readonly string[]
  readonly workbenchDestination?: { readonly view: 'lab-project' | 'lab-monitor'; readonly page?: 'approval' | 'execution' | 'evidence' | 'overview'; readonly projectId?: LabProjectId; readonly experimentId?: ExperimentId }
}
```

`completed` is terminal in a lifecycle projection; every non-terminal result has exactly one `nextActor` and at least one `allowedActions` entry. A human gate includes a registered workbench destination. Capability unavailable includes a matching recovery action. A result never offers an Agent tool that policy denies. Session events carry the same scoped IDs and destination so a pending result can be reconstructed after the in-memory tool registry is recreated.

## Implementation Batches

### Batch 1: Workspace Auto-Mapping and Project Entry Coordinator

**Covers:** 2.9.

**Use:** The existing `LabProjectService`, `LabMvpWebService`, Runtime service, and Workspace registry. Add tests and documentation beside those owners; do not add a second application package.

**Modify:** `lab-domain/src/{index,project}.ts`, `lab-project/src/index.ts` and tests, `lab-runtime/src/{index,types}.ts`, `lab-runtime-local/src/index.ts` and tests, `lab-mvp/src/index.ts` and composition tests, plus affected package/subsystem documentation.

**Steps:**

1. Add tests first: resolving one Workspace twice creates one LabProject; the active Session maps to that Project; an explicit cross-Workspace Project/Session combination returns a conflict.
2. Keep the mapping in `LabProjectService.create()` and `projectForSession()`. The generated Project ID and directory-basename name remain Host-owned; browser commands submit only Workspace identity.
3. Keep Experiment operation replay in the Project audit/state path and make equal Runtime registration idempotent while conflicting content fails loudly.
4. Let `LabMvpWebService.createAgentExperiment()` resolve the calling Session's Project, call the Project service, register the returned Experiment with Runtime, and append creation/request events only once.
5. Keep Workspace auto-mapping in the active-project bridge and monitor click path: select Workspace, open matching Session, select Project/Experiment, then open `lab-project`. Agent tools never create Workspace or Project.

**Verification:**

```sh
node node_modules/vitest/vitest.mjs run packages/experimental/lab-project/tests/service.spec.ts packages/experimental/lab-runtime-local/tests/provider.spec.ts packages/experimental/lab-mvp-web/tests packages/experimental/lab-mvp/tests/composition.spec.ts --reporter=verbose
```

**Exit:** Auto-mapping, attach, cross-scope rejection, and retry after a lost Runtime response pass; no browser-supplied business ID remains and no standalone Project creation page is registered.

### Batch 2: Global Navigation, Monitor Replace View, and Three-Pane Composition

**Covers:** 8.6, 8.9, 8.16, and 8.17.

**Modify:** `index`, `LabGlobalNavigation`, `LabProjectsView`, `LabUiContext`, `LabProjectShellView`, adapter/Host adapter/API/locale/CSS, and corresponding tests under `ui-lab-workbench/src/client/`; modify `ui-layout` tests only when the generic layout contract needs an assertion.

**Steps:**

1. Change `lab-monitor` to `conversationMode: 'replace'` and test that monitor/configuration render no Conversation, composer, or details.
2. Remove the Workspace selector, creation form, and button from `LabProjectsView`. Move Project status into monitor and stop registering an independent Projects navigation entry.
3. Let `LabGlobalNavigation` contribute only global monitor, configuration, and seats required by the native Workspace/Session tree. Knowledge, Agent, Workflow/Lab Skill, Devices, and People/permissions belong under configuration.
4. Add `resolveProjectEntry(input)` to the Host adapter. Implement one `openProjectEntry()`: await Host resolution→`connectWorkspace()`→Host attach when needed→`sessions.open()`→update `LabUiContext`→open `lab-project`. Project rows, Run rows, and Workspace/Session synchronization all use it.
5. Keep `lab-project` at `conversationMode: 'lab-workspace'`. Reuse `AppFrame` columns, details drag handle, and `openDetails/closeDetails`; do not rebuild composer, resize, or a fixed right-pane maximum.
6. Monitor/configuration switching changes app view only and does not clear `LabUiContext`, Session, draft, or details-width preference.
7. Remove the normal initial no-Project-selected state. Host resolution failure renders typed unavailable; no Experiment tells the Agent it may create one and does not ask the user to create a Project.

**Verification:**

```sh
node node_modules/vitest/vitest.mjs run packages/client/ui-lab-workbench/tests packages/client/ui-layout/tests/app-frame.client.spec.tsx packages/client/ui-layout/tests/service.client.spec.ts --reporter=verbose
```

**Exit:** Initial monitor has no input; Project click opens the Host-selected Workspace/Session; Project mode has one input; both panes collapse, the right pane resizes, and full-page switching preserves draft/selection.

### Batch 3: LABWEAVE Agent Identity and Reconstructable Project Context

**Covers:** 10.3.

**Modify:** `tool-lab/src/index.ts` and tests; `examples/lab-web/cordis.patch.yml`; keep the existing keyless Agent lifecycle test and inline snapshot in `examples/lab-web/tests/agent-lifecycle.spec.ts`.

**Steps:**

1. Register `systemPrompt.section({ name: 'labweave:agent-role', ... })` in every LABWEAVE Agent scope. Do not use `complete` or register `deployment:persona`.
2. Fix identity and order: planner, coordinator, and explainer for the current laboratory Project; first action `lab_project_context`; Experiment→Knowledge/capability→Plan/Skill proposal→wait for human approval/Run start→monitor/replan→report.
3. Fix authority: Agent only creates Experiment, reads context/Knowledge/capability, proposes Plan/Skill, and monitors/replans/reports; human adjusts and approves Plan/Skill, starts Run, confirms human steps, and publishes verdict; Runtime executes the approved graph.
4. On `nextActor: human|runtime|capability`, explain the reason and let the Agent loop yield at the tool boundary; do not poll or substitute a denied tool.
5. Keep dynamic context in `lab/agent/context-read` rather than static prompt text; snapshots reconstruct it from Session events.
6. Assert laboratory profile contains `labweave:agent-role`, default profile does not, and Harness identity/persona/tool protocol order remains unchanged.

**Verification:**

```sh
node node_modules/vitest/vitest.mjs run packages/experimental/tool-lab/tests/tool-lab.spec.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run examples/lab-web/tests/agent-lifecycle.spec.ts --reporter=verbose
```

**Exit:** Agent prompt states identity, workflow, authority, and yield rules; default profile has no LABWEAVE copy; durable events reconstruct Project context and the Agent lifecycle test proves the prompt is consumed by the real loop.

### Batch 4: Agent Experiment Creation and Typed Progress/No-Dead-End Behavior

**Covers:** 10.10, 10.11, and 10.12.

**Create:** A table-driven progress matrix in `packages/experimental/tool-lab/tests/tool-lab.spec.ts` and keep the shared progress types in `packages/experimental/lab-domain/src/types.ts`.

**Modify:** `tool-lab/src/index.ts`, tests, and package; `lab-mvp-web/src/{index,project-protocol}.ts` and tests; `ui-lab-workbench` adapter/API/Host adapter/workbench projection; affected README and subsystem counterparts.

**Steps:**

1. Remove `lab_experiment_propose` registration, description, tests, and configuration references.
2. Remove `lab_experiment_create` from `HUMAN_ACTION_TOOLS` while retaining human restrictions on approval and Run start/step/confirm. Keep read-only report separate from verdict publication instead of granting ambiguous authority.
3. Let `lab_experiment_create` accept only `title`, `objective`, and `expected_outputs`; call `bootstrapExperiment()` with calling Session and `exec.rootCallId`.
4. Return the shared `LabProgressResult` from Agent bootstrap and human-gate projections; Facade errors and capability records retain typed state/error codes rather than message-string parsing.
5. Persist one pending event per Agent call identity. An existing pending call is reconstructed from the Session event before any in-memory map is consulted, so Host/Agent reassembly returns the same workbench action.
6. Append durable approval/start/confirmation events after human action. The next Agent turn derives `nextActor: agent` from projection, not browser-memory continuation.
7. Cover unmapped Workspace, Project without Experiment, lost bootstrap-result retry, missing input, unavailable Knowledge/device/planning/Runtime, pending Plan/Skill approval, revision after rejection, pending human Run start, human step confirmation, Workspace/Session switch recovery, and capability recovery through the existing focused tests plus a table-driven Agent matrix.
8. Assert state, scoped IDs, one nextActor, non-empty allowedActions, and a legal workbench destination per matrix row; assert the Agent does not call policy-denied tools.

**Verification:**

```sh
node node_modules/vitest/vitest.mjs run packages/experimental/tool-lab/tests/tool-lab.spec.ts packages/experimental/lab-mvp-web/tests packages/client/ui-lab-workbench/tests/host-adapter.contract.client.spec.ts --reporter=verbose
```

**Exit:** Agent idempotently creates Experiment but cannot start Run; every non-terminal state has one next actor and at least one real action; a human gate emits one request and concludes the Agent turn.

### Batch 5: Composed/Keyless Acceptance Through Real Agent Tools

**Covers:** 10.13.

**Modify:** `examples/lab-web/tests/host-lifecycle.snapshot.ts` and `examples/lab-web/tests/agent-lifecycle.spec.ts`; extend `apps/web/tests/lab-full-lifecycle.e2e.ts` only for assembled replay/bootstrap support.

**Steps:**

1. Assemble the real `cordis.patch.yml` and use deterministic model responses to make the Agent execute real `lab_project_context`, `lab_experiment_create`, Knowledge, and planning tools. Keep the Agent scenario as a keyless test with an inline snapshot; do not replace it with direct Facade calls.
2. Assert one Host ID chain across Workspace, Session, Project, Experiment, Plan/Skill proposal, Run, Artifact, verdict, and report.
3. Before Plan/Skill approval and Run start, assert one pending action, a tool result with `nextActor: human`, and a concluded Agent turn.
4. Continue through a Host/UI human action and a new Agent turn; do not call private Runtime methods.
5. Keep `/api/lab` scenarios as Host API integration tests and state in test names and README that they do not satisfy Agent acceptance.

**Verification:**

```sh
node node_modules/vitest/vitest.mjs run examples/lab-web/tests/agent-lifecycle.spec.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run --config ./vitest.snapshot.config.ts examples/lab-web/tests/host-lifecycle.snapshot.ts --reporter=verbose
```

**Exit:** The keyless Agent lifecycle test executes real `lab_*` tools and proves Agent yield at a human gate, host-side human continuation, failure replan and report; the Host snapshot covers the persistence projection separately.

### Batch 6: Assembled Chromium, Responsive, and Accessibility Acceptance

**Covers:** 8.19, 11.2, 11.3, and 11.5.

**Modify:** The three `apps/web/tests/lab-*.e2e.ts` files, the apps web test bilingual README, and stable screenshot/GIF assets.

**Steps:**

1. Start the real assembled app at 1440px, 1024px, and 768px. The first assertion is `[data-lab-monitor]` visible with no composer/input/details.
2. Click a Project row, assert active Workspace, Session, and Project/Experiment/Run IDs match Host resolution, then assert three panes appear.
3. Submit a goal through the sole native input. Clarification, Knowledge, Plan/Skill proposal, human adjustment/approval, Run start, exceptional replan, Evidence, and report all use UI actions.
4. Verify manual destination navigation overrides Agent presentation and only a new valid presentation event may navigate again.
5. Verify left/right restore, right resize, center timeline scrolling, automatic Project file revision refresh, manual refresh/preview/download, page reload, and Workspace/Session round trips.
6. Cover sidebar, Project row, composer, pending action, workbench tabs, and close/restore with keyboard only. Check focus ring, accessible name, tab order, main scroll container, and return to monitor.
7. Save stable desktop, narrow-desktop, and tablet evidence after behavioral assertions pass; screenshots do not replace assertions.

**Verification:**

```sh
node node_modules/vitest/vitest.mjs run --config ./vitest.web.config.ts apps/web/tests/lab-showcase.e2e.ts apps/web/tests/lab-workbench.e2e.ts apps/web/tests/lab-full-lifecycle.e2e.ts --reporter=verbose
```

**Exit:** Three viewports and keyboard path pass; the page has one input; the same Host IDs are traceable across monitor, tree, timeline, and every workbench destination.

### Batch 7: Showcase Documentation, Full Verification, and OpenSpec Closure

**Covers:** 11.6, 11.7, and 11.8.

**Modify:** The `examples/lab-web/SHOWCASE` bilingual pair, proposed Agent Note pair, and `tasks.md` only after evidence exists.

**Steps:**

1. SHOWCASE describes only a five-to-ten-minute user flow: monitor→Project→Agent goal→Experiment→Knowledge/Plan/Skill→human approval/Run start→replan→Evidence/report. Do not describe curl or direct `/api/lab` as user action.
2. After repairing the local Rolldown macOS ARM optional dependency, run the following from repository root on Node 24. Use the user-specified proxy for installation and keep tests keyless except explicit real-provider scenarios.
3. Record actual outcomes only. Separate existing failures from regressions and never mark completion from partial success.
4. Use `openspec-verify-change` to map every requirement/scenario. Keep tasks open and do not archive when any CRITICAL/WARNING remains.

**Full verification:**

```sh
node node_modules/vitest/vitest.mjs run packages/client/ui-lab-workbench/tests packages/experimental/lab-project/tests packages/experimental/tool-lab/tests packages/experimental/tool-lab-project/tests packages/experimental/lab-mvp-web/tests packages/experimental/lab-mvp/tests --reporter=verbose
node node_modules/vitest/vitest.mjs run --config ./vitest.snapshot.config.ts examples/lab-web/tests --reporter=verbose
node node_modules/vitest/vitest.mjs run --config ./vitest.web.config.ts apps/web/tests/lab-showcase.e2e.ts apps/web/tests/lab-workbench.e2e.ts apps/web/tests/lab-full-lifecycle.e2e.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run packages/sdk/client/tests packages/sdk/server/tests --reporter=verbose
uv run --project python/sdk pytest python/sdk/tests
npm run typecheck
npm run build
npm run hygiene
npm run doc-sync
npm run website:build
rtk openspec validate lab-showcase-ready-workspace --strict
git diff --check
```

**Exit:** OpenSpec verify has no CRITICAL/WARNING; all 11 remaining tasks have source plus automated or manual browser evidence; only then may `openspec-archive-change` run.

## Dependencies and Checkpoints

```text
批次 1 -> 批次 2
批次 1 -> 批次 4
批次 3 -> 批次 4
批次 1 + 3 + 4 -> 批次 5
批次 2 + 5 -> 批次 6
批次 6 -> 批次 7
```

After each batch, stop and report changed files, passing commands, failures, and corresponding OpenSpec tasks. Enter the next batch only after dependencies and focused verification pass. Visual inspection cannot replace Host/Agent path tests.

## Explicitly Out of Scope

- No multi-Workspace aggregate laboratory, cross-Workspace Project, or manual Project create/rename/delete UI.
- No Agent auto-approval or auto-started Run, and no timeout-based automatic release.
- No browser file upload, create, rename, delete, or absolute-path access.
- No rewrite of default Harness Conversation, Workspace tree, input, or generic layout store.
- No Qwen, DeepSeek, or other real-model call substitutes for keyless acceptance; real Providers only prove replaceability.
