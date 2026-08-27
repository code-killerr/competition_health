## 1. Cross-change contract and Harness composition

- [x] 1.1 Consume the currently shared typed Knowledge Facade contract for opaque source, version, citation, conflict and published-SOP identifiers; do not enforce a Harness-side minimum version gate.
- [x] 1.2 Add a deterministic fake Knowledge Consumer and explicit capability-unavailable state so this line can develop and test without importing the parallel Provider or waiting for Docling/embedding availability.
- [x] 1.3 Add the opt-in Web composition rows and package dependencies for Harness-native project, navigation and conversation contributors without changing the default Web profile.
- [x] 1.4 Verify that this change adds no PDF parser, file upload, SQLite knowledge schema, embedding adapter, retrieval ranking or Knowledge workspace implementation.

## 2. Project and Session persistence

- [x] 2.1 Add lab-owned project, project-source, project-device and project-session domain types with opaque Session and Knowledge references plus explicit status/title metadata.
- [x] 2.2 Implement the project persistence domain using the existing Storage/SQLite lifecycle; keep Harness Session logs authoritative for messages and tool events.
- [x] 2.3 Extend the Web Facade with project create/list/open, scope update and Session association commands in a dedicated project-conversation protocol module, including validation for cross-project source/device references; do not edit the parallel Knowledge protocol module.
- [x] 2.4 Ensure planning context includes only explicitly selected project scope and approved/shared facts, never another Session's unapproved plan, draft Skill or private messages.
- [x] 2.5 Add project/session audit events and rebuildable cache projections for plan proposals, approvals, runs and reports.

## 3. Harness-native navigation and workspace

- [x] 3.1 Replace the full-screen `shell.overlay` workbench entry with a dedicated Harness workspace contributor/package using public `ui-sidebar`, `ui-layout`, `ui-workspace` and `ui-conversation` contracts while retaining reusable lifecycle cards.
- [ ] 3.2 Add global Knowledge, Devices and Projects navigation; mount the Knowledge workspace contributor supplied by `pdf-knowledge-parser` without importing its client implementation.
- [x] 3.3 Add a Devices workspace using the existing Device Facade and a Projects workspace with project scope, device scope and multiple Session rows.
- [x] 3.4 Add project Session creation, selection, rename/title projection and refresh behavior using existing Harness Session and conversation services.
- [x] 3.5 Reuse `ui-attachment` only for supported conversation attachments; Knowledge source files remain on the separate Knowledge workspace command path.

## 4. Harness Agent conversation

- [x] 4.1 Add the laboratory Agent preset/overlay so the current Harness Agent receives existing `lab_knowledge_*`, `lab_plan_*`, Skill and Runtime tools without a second Agent loop or model client.
- [x] 4.2 Replace the fixed `agentPlan()` button/prompt with scoped `ui-conversation` submission and a project context builder containing selected source IDs, device IDs, objective and unresolved fields.
- [x] 4.3 Require Agent retrieval and planning output to retain citation IDs, confirmation state, assumptions and missing-input markers from the Knowledge Consumer.
- [x] 4.4 Wire clarification questions through the existing Harness user-question/conversation flow and preserve question/answer evidence in the current Session.
- [x] 4.5 Add model-unavailable, invalid-output, uncited-plan and cross-project-reference errors with stable conversation feedback and Session evidence.

## 5. Plan review, Skill confirmation and execution evidence

- [x] 5.1 Render structured plan proposals as conversation-linked review cards with citations, assumptions, unresolved inputs and exact plan revision identity.
- [x] 5.2 Keep plan approval as an explicit human action; approval records and locks the exact plan revision but does not automatically activate a Skill or start a run.
- [x] 5.3 Render Skill draft validation, approval and activation as separate human-gated actions using the existing Skill lifecycle and Approval checks.
- [x] 5.4 Render run start, current step, per-step confirmation, stop, result verification and final report as conversation-linked cards backed by existing Runtime commands.
- [x] 5.5 Reject Agent attempts to approve plans, activate Skills or execute/advance runs before the corresponding human gate, and expose the stable reason in the conversation.

## 6. Independent and joint verification

- [x] 6.1 Add keyless project tests for creation, source/device scope, multiple Sessions, Session isolation, audit events and refreshable projections using the fake Knowledge Consumer.
- [x] 6.2 Add fake-Agent tests for clarification, cited proposal, invalid citation rejection, plan confirmation, Skill gates and pre-approval execution rejection.
- [x] 6.3 Add browser tests for Knowledge/Devices/Projects navigation, project/session switching, Harness conversation submission, plan review, approval, stop, verification and report.
- [ ] 6.4 Add a contract test fixture shared with `pdf-knowledge-parser` for capability status, source/version IDs, citation-bearing retrieval and published SOP records.
- [ ] 6.5 After the parallel change is available, run a composed smoke that mounts its Knowledge workspace, binds imported sources to a project, retrieves a published SOP and produces a human-confirmed plan in a Harness Session.
- [x] 6.6 Add an opt-in real-model smoke using the existing `.env`/Harness credential layer only when `DEEPSEEK_API_KEY` is explicitly available; default tests remain keyless.
- [x] 6.7 Update English/Chinese package documentation and the implementation Agent Note with the two-line ownership table, capability version and integration test path.
- [ ] 6.8 Run client module graph, Cordis config, typecheck, focused tests, Web build, Markdown/link/pairing gates and OpenSpec verification before handoff.
