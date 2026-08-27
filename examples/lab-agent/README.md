# Laboratory Automation Development Agent

English | [中文](README.zh.md)

This is an opt-in development overlay over the existing Headless Agent. It does not modify the default profile or embed test data in runtime code.

Prepare a supported Node version and install dependencies:

```
source ~/.nvm/nvm.sh
nvm use 24.19.0
pnpm install
pnpm run build
```

Start the laboratory development composition:

```
pnpm dsh --profile headless --patch examples/lab-agent/cordis.patch.yml "Retrieve cited laboratory context and propose a draft plan; leave approval and execution to the project workspace"
```

The overlay mounts the laboratory Service Definitions, local Knowledge, Planning, Lab Skill, Mock Device, and Runtime Providers, Agent-scoped read-only Knowledge, Planning, Runtime, and project-context tools, the read-only Web Consumer, and the existing `ask_user_question` clarification Consumer. Its question and answer remain in the current Session evidence. Knowledge source ingestion and SOP curation remain owned by the separately contributed Knowledge workspace; this Agent line does not expose a Knowledge write workflow.

The composition exercises cited retrieval, conflicts, project-scoped planning context, structured plan and Skill proposals, deterministic validation, and bounded reports. Plan approval, Skill activation, execution, and step confirmation remain explicit project-workspace actions. Production devices, durable Runtime recovery, and result validators remain later increments.

Running the Agent requires DEEPSEEK_API_KEY, supplied through the git-ignored project-root .env or the environment.

## Test data matrix

The focused [knowledge data-switching test](../../packages/experimental/lab-knowledge-local/tests/pdf-knowledge.spec.ts) imports local inputs as bytes and keeps retrieval scoped to the imported document. The runtime packages contain no fixed protocol or specimen text.

| Input | Source | Assertion |
| --- | --- | --- |
| Space ATAC protocol CSV | `docs/change_plan/Agent实验Workflow步骤输入输出与边界条件确认表_细化版 副本 - SeekSpace_空间ATAC.csv` | Built-in CSV rows are searchable and carry the protocol/flow-confirmation metadata role. |
| Flow confirmation table | The same Space ATAC CSV, imported with a separate data role | Document filtering keeps the confirmation input isolated from other sources. |
| PDF knowledge corpus | All available `docs/change_plan/pdf_knowledge/*.pdf` files | Real PDF bytes have a `%PDF-` signature and are indexed with page and title-path references through the configured parser seam. |
| Mouse-brain request | Small text input created by the test | A specimen request can switch alongside protocol documents without changing runtime behavior. |

The local checkout currently contains six PDF inputs. The test parser is deterministic and test-only: it checks the PDF signature and supplies representative first-page blocks, while production PDF text extraction remains a configured `DocumentParser` integration.

Known limitations and next backlog: a production PDF parser still needs to publish extracted tables and page blocks; the local PDF corpus is optional in clean checkouts, so only present files are exercised; real devices, durable runtime recovery, result validators, and the full Web/e2e loop remain later increments.
