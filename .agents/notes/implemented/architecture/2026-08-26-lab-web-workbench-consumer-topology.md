# Agent Note: Lab Web Workbench Consumer topology

Status: implemented

English | [中文](2026-08-26-lab-web-workbench-consumer-topology.zh.md)

## Problem

The laboratory workflow needs a browser contribution that exercises the same Knowledge, Planning, Skill, Device and Runtime capabilities as the host composition. The browser must not become a provider implementation, and the workflow needs durable Session evidence plus a refreshable experiment cache without making the existing Agent tools depend on the browser.

## Decision

The browser is an opt-in dsh.client workspace contributor exposed by examples/lab-web/cordis.patch.yml. It uses the existing Harness sidebar and conversation slots, sends typed commands through one /api/lab Web Consumer, and keeps Provider selection, persistence, Agent looping, and lifecycle validation on the host. The default profile and default API RPC map remain unchanged.

The Harness integration consumes the public Knowledge Facade from `pdf-knowledge-parser-mvp` without a Harness-side minimum version gate. The independent `@deepseek-ai/dsh-client-ui-lab-knowledge-workspace` package mounts through the `lab.knowledge.workspace` session slot declared by the workbench. Its browser code calls `/api/lab` and imports no Knowledge Provider or SQLite implementation; the host owns routing, persistence, parsing and domain validation.

| Surface | Owner |
| --- | --- |
| Harness project/session, planning context and lifecycle cards | `lab-harness-native-workspace` |
| Knowledge capability, import/retrieval records, source versions and SOP lifecycle | `pdf-knowledge-parser-mvp` public Facade |

The Knowledge workspace consumes capability status, source/version identities, citations and published SOP records through the public command path. A missing Knowledge capability produces an explicit unavailable projection while project, Session and deterministic fake-Consumer tests remain operable.

The keyless integration fixture is shared from `@deepseek-ai/dsh-lab-knowledge-fixtures`. It provides real PDF bytes, a deterministic parser and records for capability status, READY source/version, citation confirmation and published SOP retrieval. `packages/experimental/lab-mvp/tests/pdf-harness-smoke.spec.ts` composes PDF import, READY, project binding, citation retrieval, SOP publication and a human-confirmed plan without a model key.

The experiment cache is owned by packages/experimental/lab-cache as a small shared Consumer. lab-mvp and tool-lab install it only when the service is absent, so either composition can own the capability and a combined composition reuses one service. When Session and Storage are present, the Facade records requested, proposed, review, run and feedback events and projects the current experiment into the lab_experiment_cache domain. Without those services, direct provider tests retain an explicit non-persistent path rather than silently creating a second persistence system.

The Agent composition exposes cited Knowledge retrieval, planning context, plan proposal, Skill validation, and bounded report tools. Human-controlled plan decisions, Skill approval or activation, and run state changes are denied by tools/pre-execute for autonomous Agent calls; the project workspace submits those actions explicitly.

The browser fixture contains only generic Knowledge records, a plan template, a Skill revision and a Mock Device. Space ATAC CSV, mouse-brain spatial transcriptomics data and additional PDF examples remain external test inputs; no production command branches on their names or formats.

## Alternatives considered

**Import Knowledge Provider code into the Harness workspace.** Rejected because it would duplicate persistence and lifecycle validation, couple the browser to a replaceable implementation and bypass the public MVP Facade.

**Wait for a future Knowledge package before composing the workspace.** Rejected because the integration contract is already available from the MVP Facade and can be exercised with deterministic PDF fixtures without a model key.

**Put the Knowledge UI body inside the workbench package.** Rejected because the named session slot keeps the workbench responsible for placement while allowing the Knowledge workspace contributor to evolve independently.

**Add the workbench to the default Web profile.** Rejected because the laboratory bundle is experimental and needs an explicit opt-in composition while its protocol and fixtures evolve.

**Keep cache ownership inside tool-lab and let the Web Facade call it indirectly.** Rejected because the Web Consumer is a separate host surface and would either depend on Agent tool installation or create a parallel projection. A small shared Consumer keeps both surfaces on the same cache vocabulary.

**Encode the Space ATAC or mouse-brain example into the runtime.** Rejected because those files are test data and reference material, not a production workflow discriminator. The fixture proves the generic command sequence instead.

## Consequences

The prototype is manually runnable through a real browser page and can be tested keylessly from Knowledge import through project setup and human-confirmed planning. Browser and Agent paths share service contracts, Session events and cache projection, while the default product profile stays unchanged. The opt-in patch remains the composition entrypoint until the Web protocol, authentication and production deployment policy are reviewed.

The Knowledge workflow remains independently replaceable because Harness stores only opaque source/version and citation references. The browser Consumer can use the current MVP public contract without importing Provider internals, and the shared fixture pins the records that project planning depends on.

The initial cache is a projection, not the authoritative experiment log; Session events remain the recovery source. Direct Facade tests without a Session intentionally do not claim durable evidence. The browser demonstrates the workflow and does not provide production authentication, remote deployment or model-backed planning without an explicitly configured Agent.