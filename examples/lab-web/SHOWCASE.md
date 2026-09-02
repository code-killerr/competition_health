# LABWEAVE showcase verification guide

This guide verifies the assembled Harness-native LABWEAVE journey: the Agent remains the orchestration surface, while the workbench exposes the current Project, lifecycle state, evidence, and authorized files. It is a five-to-ten minute acceptance path for the real Host composition; it does not treat a static screenshot or a direct API call as user-facing proof.

## Prepare

Run from the repository root:

    pnpm run demo:lab-web

Open the local URL printed by the command. The command starts the opt-in LABWEAVE composition and leaves the ordinary Web profile unchanged.

## Acceptance path

1. Confirm the initial page is the global Execution monitor. It is a full-page view: no Conversation composer and no Project workspace are mounted. The left sidebar contains the global monitor/configuration entries above the native Workspace/Session tree.
2. In the monitor, select a Project status row. The Host-authorized transition resolves Project -> Workspace -> Session, selects the same records in the client context, and opens Project mode. If no Project is available, verify that the monitor shows an explicit empty or unavailable state instead of a fabricated project.
3. In Project mode, verify the three-column composition: native Harness navigation and Workspace/Session tree on the left, the complete shared Harness Conversation with its one composer in the center, and the active Project workspace on the right. The right workspace contains the lifecycle destinations Overview, Planning/Workflow, Plan approval, Execution monitoring, Step orchestration, Results/Evidence, Files, and Archive.
4. Submit a goal through the single native Agent composer. The Agent reads the current Project context, asks for missing inputs when needed, creates an Experiment through the Host operation without caller-supplied Project or Experiment IDs, and continues toward Knowledge, capability, Workflow/Plan/Skill proposal, approval, execution monitoring, and report.
5. At an approval or human-confirmation gate, verify that the Agent requests the action once and yields. Complete the pending action from the structured Project workspace control; the durable event should let the next Agent turn continue. The Agent must not start a Run, confirm a device step, or compute the final verdict by itself.
6. Use Agent cards or lifecycle nodes to open a permitted Project destination. Then use the right workspace to inspect the same Experiment, Run, step, Evidence, Result, and report records. Project files are grouped as Project configuration, conversation output, and run artifacts; opening or downloading uses Host-authorized actions only.
7. Open the global configuration destination. Knowledge and Devices show their registered capability state. Agent, Workflow/Lab Skill, and People/permissions show read-only or unavailable states when no real provider is registered. Returning to Project mode must preserve the selected Session, Project, and Conversation draft.
8. Repeat the path at desktop, narrow desktop, and tablet widths. Verify the main scroll container remains usable, sidebar and right workspace can collapse and recover, Conversation remains scrollable, keyboard focus has a visible route, and Project selection survives navigation.

The assembled browser lanes are apps/web/tests/lab-showcase.e2e.ts, apps/web/tests/lab-full-lifecycle.e2e.ts, and apps/web/tests/lab-workbench.e2e.ts. They are the acceptance evidence when Chromium is available; the unit and Host checks below only establish code and composition behavior.

## Expected boundaries

Project and Experiment identities come from the Host. The browser does not create IDs, accept arbitrary absolute paths, persist record copies, or provide an independent Project-create page. A missing Workspace, unavailable capability, failed Run, or pending human action must expose a typed state and an allowed next action. Deterministic providers may be used for keyless development checks, but their records must not be presented as production data.
