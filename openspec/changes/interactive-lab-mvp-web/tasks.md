## 1. Web Facade and transport

- [x] 1.1 Extend `lab-mvp-web` with typed request/response DTOs, command discriminants, stable error codes and a Facade that only calls Knowledge, Planning, Skill, Device, Runtime, Session and Storage services.
- [x] 1.2 Preserve `snapshot()` while adding commands for import, retrieval, request parsing, plan generation/validation, plan and step confirmation, run control, verification and reporting; reject invalid lifecycle transitions before side effects.
- [x] 1.3 Register the experimental `/api/lab` loopback route through the existing `webServer` service with JSON body validation, response mapping and lifecycle disposal; do not add the commands to the default API RPC map.
- [x] 1.4 Add Host/Facade tests for malformed requests, provider absence, conflicts, inactive Skills, unconfirmed steps, device failures and successful command dispatch.

## 2. Browser workbench

- [x] 2.1 Add a `dsh.client`-compatible browser UI package with `./client` export, module dependencies, Slot integration and the opt-in Web overlay roster entry required by the client module system.
- [x] 2.2 Implement a typed `/api/lab` client and `LabWorkbenchStore` for snapshot state, current experiment, request draft, stage, pending commands, errors and polling lifecycle; keep browser code free of Provider/database imports.
- [x] 2.3 Implement the knowledge stage with source submission, import status/error display, retrieval query, citation/conflict display and explicit empty states.
- [x] 2.4 Implement the request and plan stages with local demonstration mode, explicit Agent planning action, cited plan/step cards, missing-input display and deterministic validation issues.
- [x] 2.5 Implement plan/step confirmation controls, revision fencing, run start/stop, step status polling, device state display, result verification and final feedback/report views.
- [x] 2.6 Apply the demo’s dark sidebar, warm content surface and amber status language as visual reference while deriving all labels, badges and rows from runtime state and existing locale conventions.

## 3. Harness composition and testability

- [x] 3.1 Add an opt-in composition that loads the existing experiment bundle and Web client without changing the default profile; verify the `dsh.client` module graph and asset serving path.
- [x] 3.2 Add explicit keyless development/test fixtures for a minimal document, plan, Skill, Mock Device and run; keep Space ATAC, mouse brain and PDF files out of production runtime logic.
- [x] 3.3 Add browser/client tests for empty state, import/search, Agent-unavailable path, plan confirmation, blocked execution, stop, verification and final feedback.
- [x] 3.4 Add a composed keyless smoke path from browser command → Facade → existing Service → Session/Storage projection → browser refresh, and update package README/Chinese README with the manual test entrypoint.
