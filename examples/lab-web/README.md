# lab-web

English | [中文](README.zh.md)

Opt-in Web composition for the laboratory showcase prototype. It assembles the existing lab Service bundle, loopback `/api/lab` Facade, Harness application-view extension, Project list/create view and the existing Session-scoped workbench without changing the default Web roster.

## Run

Build the source and browser bundles first:

```sh
pnpm run build
```

Start the showcase:

```sh
pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open
```

Open the local URL printed by the command. The verified path starts on the Projects application view and does not require an existing Session: select a registered Workspace, create a Project by name, and confirm that the Host-generated Project ID is selected in the page. The current Session workbench remains available from the Harness Conversation view for capability-level checks.

The loopback Facade has two explicit command namespaces. General Knowledge, planning, Skill, device and Runtime commands use `namespace: "lab"`; Project, Experiment, Run and Artifact page commands use `namespace: "project"`. Browser code submits records and action parameters, while the Host owns business IDs and persistence.

## Showcase boundary

The current composition proves the Harness-native entry, Workspace selection, Project creation and Project selection path. A single browser-verified Knowledge→citation→Experiment→Plan→approval→Run→Artifact→report path requires the remaining application-view and browser-e2e work; the showcase guide does not present those capabilities as complete.

Model-backed planning is opt-in and requires `DEEPSEEK_API_KEY`. Deterministic providers and fixtures are development aids unless the active composition exposes them through the real Facade and labels their status in the UI. The fixture [`fixtures/minimal-plan.template.json`](fixtures/minimal-plan.template.json) is not required for the Project entry path.

These fixtures are development inputs only. The runtime composition does not load biological specimens, spatial ATAC CSV files, PDFs or fixed experimental protocols automatically.
