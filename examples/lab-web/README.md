# lab-web

English | [中文](README.zh.md)

Opt-in Web composition for the laboratory showcase prototype. It assembles the existing lab Service bundle, loopback `/api/lab` Facade, Harness application-view extension, hierarchical LABWEAVE navigation, the shared native Session Conversation, and the Project workspace without changing the default Web roster.

## Run

Build the source and browser bundles, then start the showcase:

```sh
pnpm run demo:lab-web
```

Open the local URL printed by the command. The default LABWEAVE view starts at the global execution monitor and does not require an existing Session. Select a Workspace from the Project tree or create the Workspace's Project; the Host creates or reuses the Project Session, and the central native Harness Conversation plus the right Project workspace stay linked to that Project.

The loopback Facade has two explicit command namespaces. General Knowledge, planning, Skill, device and Runtime commands use `namespace: "lab"`; Project, Experiment, Run and Artifact page commands use `namespace: "project"`. Browser code submits records and action parameters, while the Host owns business IDs and persistence.

## Verification boundary

The Host-composed keyless path is covered by service and composition tests for Project/Session identity, scoped Knowledge context, Workflow/Skill/Plan proposal and approval, Runtime execution, replanning, Project files, verdict and report persistence. Desktop, narrow-tablet and keyboard behavior still require the assembled browser acceptance on a device with browser verification available; the showcase guide does not present that evidence as complete.

Model-backed planning is opt-in and requires `DEEPSEEK_API_KEY`. Deterministic providers and fixtures are development aids unless the active composition exposes them through the real Facade and labels their status in the UI. The fixture [`fixtures/minimal-plan.template.json`](fixtures/minimal-plan.template.json) is not required for the Project entry path.

These fixtures are development inputs only. The runtime composition does not load biological specimens, spatial ATAC CSV files, PDFs or fixed experimental protocols automatically.
