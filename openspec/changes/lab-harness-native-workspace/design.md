## Context

The completed `interactive-lab-mvp-web` change exposes a typed `/api/lab` Facade and a custom full-screen `shell.overlay`; this change replaces that presentation with Harness-native workspace and conversation surfaces. The Facade already dispatches to Knowledge, Planning, Skill, Device, Runtime, Session and Storage services, while `tool-lab-knowledge`, `tool-lab-planning` and `tool-lab` already register model-facing `lab_*` tools for an Agent.

The completed `pdf-knowledge-parser-mvp` change owns the current source upload, PDF/CSV/TSV/text ingestion, parser lifecycle, SOP curation, indexing, retrieval and public `/api/lab` contract. This change consumes those stable records and citation identities; its independent Knowledge workspace package does not import Knowledge Provider internals or SQLite code.

The Web profile already composes `credentials`, `llm-deepseek`, Session persistence, Agent presets, `ui-sidebar`, `ui-layout`, `ui-conversation`, `ui-attachment`, Workspace and Approval. `.env` is loaded by the existing CLI launch environment, and the DeepSeek adapter resolves `DEEPSEEK_API_KEY` and optional `DEEPSEEK_BASE_URL` through the credential/settings seams per request.

## Goals / Non-Goals

**Goals:**

- Consume project-scoped source identities, confirmed retrieval results and citations from the Knowledge Facade without owning ingestion or ranking.
- Move experiment interaction into Harness-native workspace, sidebar, Session and conversation surfaces instead of maintaining a second chat implementation.
- Provide global Knowledge, Devices and Projects navigation while mounting the independent Knowledge workspace supplied for the current MVP contract.
- Model one project with many Sessions and bind each Session to project knowledge/device context without changing Harness Session persistence ownership.
- Let the Harness Agent ask clarification questions, retrieve facts, propose structured plans and Skill drafts through existing tools; render plan/Skill/run cards in the conversation and keep approval, activation and execution outside autonomous Agent authority.

**Non-Goals:**

- No change to the default Web profile or existing Harness conversation semantics.
- No PDF parsing, document indexing, embedding adapter, retrieval ranking or Provider implementation; those belong to `pdf-knowledge-parser-mvp`. The client workspace remains a thin public-Facade consumer.
- No automatic Skill installation, automatic plan approval or unattended device execution.
- No production authentication, multi-tenant authorization or remote device transport.
- No forced relationship between CSV columns, PDF blocks and mouse-brain spatial transcriptomics data.

## Decisions

### 1. Keep the existing capability seams and make the Web layer a Consumer

The Web layer continues to send typed commands to `lab-mvp-web`; browser code never imports a Provider, SQLite module or Agent tool implementation. The project layer stores only stable source/version/citation references returned by the Knowledge Facade. Knowledge workspace rendering and writes are isolated in a separate client package that consumes the current MVP public commands; this change mounts that contribution and supplies selected project scope to Agent context and search requests.

Parallel implementation keeps project/session/Agent commands in a dedicated project-conversation protocol module and keeps Knowledge workspace UI in its own contributor/package. The shared Web protocol adds only the public fact-confirmation command needed to complete the MVP SOP review path.

**Alternative considered: browser-to-database access.** Rejected because it bypasses lifecycle checks, Session evidence and provider selection.

**Alternative considered: duplicate Knowledge upload/search panels inside the project client.** Rejected because the independent Knowledge package owns that workflow and exposes no Provider implementation to Harness.

### 2. Reuse the Harness Web profile for credentials and Agent execution

The composition keeps `credentials`, `llm-deepseek`, `agent-presets`, `sessions`, `approval` and `ui-conversation` as the source of truth. The experimental bundle contributes the lab services and the existing model-facing `lab_*` tools to the Agent scope. The browser sends ordinary prompts through the scoped Harness conversation service, while tool calls appear as normal conversation nodes and are persisted in the Session log.

`DEEPSEEK_API_KEY` and optional `DEEPSEEK_BASE_URL` continue to be resolved by the Harness launch/credential layers. Embedding credentials and retrieval configuration remain entirely inside the PDF/knowledge change and are not exposed to this client or Session messages.

**Alternative considered: create a laboratory-specific Agent loop or model client.** Rejected because it would duplicate retries, model selection, Session logging, tool presentation and approval behavior already provided by Harness.

### 3. Use Harness-native project and conversation surfaces

The browser contribution registers project navigation and experiment cards through existing `sidebar`, `workspace`, `conversation.view`, `conversation.input.dock` and attachment slots. A project is a durable laboratory entity; a Session remains the Harness conversation entity. A join record associates a project with many Session IDs and carries a stable display title and ordering. Experiment requests, plans and runs reference the project and the Session that produced the decision.

Knowledge scope and device scope are explicit project associations. The Agent context builder reads only the selected project scope plus current Session messages. A new Session in the same project inherits the project scope but not an implicit copy of another Session's unapproved plan.

**Alternative considered: treat `experimentId` as the project and store multiple chats in the existing cache.** Rejected because `experimentId` currently identifies one request/run lifecycle and the cache is a projection, not a conversation owner.

### 4. Preserve human gates in the conversational flow

The Agent can call retrieval, context, proposal and draft-generation tools. It can ask questions when required inputs are missing. It cannot approve a plan, activate a Skill or start a run merely because the conversation says to do so; existing approval waterfalls and Web/Runtime lifecycle checks remain authoritative. The UI renders proposed plans and pending approvals as conversation-linked cards and keeps explicit operator actions available.

**Alternative considered: have the Agent directly execute once it has enough information.** Rejected because the project requirement requires human confirmation for every generated procedure step before execution.

## Risks / Trade-offs

- [The Knowledge contract changes while both lines are under development] → Pin shared DTOs and capability status first; the workspace uses the public Web contract and current-line tests use a shared fixture.
- [Harness slot integration can couple project UI to internal conversation details] → Depend on public slot contracts and type-only module declarations; keep project state and Facade commands in separate packages.
- [Multiple Sessions may accidentally share unapproved context] → Persist explicit project scope separately from Session messages and require citation/plan references to identify their source Session.
- [Knowledge data may be unavailable while the MVP runtime is incomplete] → Render an explicit capability-unavailable state and allow project/session/Agent UI tests to run against deterministic fixtures.

## Migration Plan

1. Freeze the shared Knowledge Consumer DTOs and capability-unavailable response with `pdf-knowledge-parser-mvp`; neither line imports the Provider implementation.
2. Add project/session association persistence and Facade commands while keeping existing `experimentId` lifecycle commands compatible.
3. Replace the overlay with Harness sidebar/layout/workspace/conversation contributors and mount the separately owned Knowledge workspace slot.
4. Add Agent context, clarification, plan proposal, plan confirmation, Skill review and run evidence cards with fake-model/keyless coverage.
5. Run a joint composed smoke against the current MVP Facade and the mounted independent Knowledge workspace.
6. Roll back by removing the opt-in project/client overlay; Knowledge data, existing `/api/lab` lifecycle commands and Session logs remain readable.

## Open Questions

- Should project records live in a new lab-owned SQLite domain or in the existing Harness Storage domain? The default is a lab-owned domain with Session IDs as opaque references, but the final choice should follow the persistence catalog review.
- The current public workspace slot is `lab.knowledge.workspace`; the browser DTOs remain the `/api/lab` command protocol. No Harness-side minimum version gate is required.
