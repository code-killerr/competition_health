# Lab showcase verification guide

This guide verifies the Stage 8 Harness-native LABWEAVE composition. It uses the assembled Web profile, real Workspace and Project Facade records, the shared Conversation presentation contract, and the LABWEAVE lifecycle shell. It does not claim the Stage 9 Knowledge-to-report business flow.

## Prepare

Run these commands from the repository root:

```sh
pnpm run demo:lab-web
```

Open the local URL printed by the command. The command starts the opt-in composition and leaves the default Web roster unchanged.

## Verified path

1. Open the LABWEAVE application from the root application view. Before a Session exists, the sidebar shows global execution monitoring, a dynamic Projects tree, and the configuration center.
2. Select a registered Workspace. If it already has a Project, the page opens that Host record; otherwise create one using the Workspace directory name and confirm that the selected Project indicator uses the Host-returned record. Repeating creation for the same Workspace must reuse the existing Project.
3. Open Project Overview and confirm that lifecycle state and pending actions are primary content, while summary statistics remain secondary.
4. Expand the Project tree and visit Planning and Workflow, Plan approval, Execution monitoring, Step orchestration, Evidence and reports, and Archive. The selected Project, Agent context, and single input remain synchronized across destinations.
5. Expand the Agent timeline from the compact bottom dock. Confirm that the LABWEAVE page has one input DOM, retains the draft while destinations change, and does not render the default Conversation hero or an adjacent permanent Agent column.
6. Open Configuration. Knowledge and Devices show registered Host capabilities; Agent, Workflow/Lab Skill, and People/permissions show explicit unavailable states when no corresponding capability is registered.
7. Resize the assembled page to desktop, tablet, and narrow desktop widths. Confirm that the workbench remains scrollable, the dock stays reachable, and sidebar rail mode remains operable.

The repeatable assembled browser lane is `apps/web/tests/lab-showcase.e2e.ts`. It records desktop, tablet, and narrow screenshots under `.artifacts/lab-showcase/` when Playwright Chromium is available.

## Expected states

An empty Project list means that the current Host has no Project records. An unavailable Workspace means that the create action cannot proceed until a registered Workspace is available. A failed list or create action remains visible as an error state with a retry or correction path. The Project ID shown by the page is returned by the Host and is not entered in the browser.

## Showcase boundary

The configuration cards are destination and capability-status checks; they are not the Stage 9 Knowledge provider flow. The complete Experiment→Plan→approval→Run→Artifact→report path is not part of this verified Stage 8 walkthrough. Do not use the old JSON fixture or a screenshot as evidence that those actions are wired through the current Host Facade.

Model-backed planning is an optional check and requires `DEEPSEEK_API_KEY`. If a provider is unavailable, report that capability as unavailable or skipped instead of presenting deterministic development data as a production result.
