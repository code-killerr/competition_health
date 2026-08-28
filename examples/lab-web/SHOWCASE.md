# Lab showcase verification guide

This guide verifies the currently runnable Harness-native entry path. It uses the real Project Facade and Workspace records and does not claim an end-to-end Knowledge, planning, Run or Evidence browser flow that has not passed browser acceptance.

## Prepare

Run these commands from the repository root:

```sh
pnpm run build
pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open
```

Open the local URL printed by the command. The command starts the opt-in composition and leaves the default Web roster unchanged.

## Verified path

1. Open Projects from the Harness sidebar before creating a Session.
2. Select a registered Workspace, enter a Project name, and create the Project.
3. Confirm that the new Project appears in the list and that the selected Project indicator uses the Host-returned record.
4. Refresh the Project list and confirm that the selected Project remains a presentation selection while the list is loaded again from the Facade.
5. Open the existing Conversation view and confirm that it remains the Harness conversation surface rather than a second experiment chat page.

## Expected states

An empty Project list means that the current Host has no Project records. An unavailable Workspace means that the create action cannot proceed until a registered Workspace is available. A failed list or create action remains visible as an error state with a retry or correction path. The Project ID shown by the page is returned by the Host and is not entered in the browser.

## Showcase boundary

Knowledge, Devices, Project shell subpages, Conversation command cards and the complete Experiment→Plan→approval→Run→Artifact→report path are not part of this verified walkthrough. Do not use the old JSON fixture or a screenshot as evidence that those actions are wired through the current Host Facade.

Model-backed planning is an optional check and requires `DEEPSEEK_API_KEY`. If a provider is unavailable, report that capability as unavailable or skipped instead of presenting deterministic development data as a production result.
