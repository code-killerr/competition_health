# lab-web

English | [中文](README.zh.md)

Opt-in Web composition for the first-stage laboratory prototype. It adds the existing laboratory Service bundle, the loopback `/api/lab` Consumer, and the `dsh.client` workbench overlay to the Web profile without changing the default roster.

## Run

Build the source and browser bundles first:

```sh
pnpm run build
```

Start the composition:

```sh
pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open
```

Open the printed local URL. The Knowledge stage is a read-only projection of capability status, source/version identities, citations, and conflicts. When the separately contributed Knowledge workspace is available, use its typed import flow; it does not send a source file as an ordinary Agent message. Submit the request through the Harness conversation composer; the Agent resolves the current Session project association and requires `DEEPSEEK_API_KEY` for model-backed planning. The existing `ask_user_question` Consumer remains available for clarification, with its question and answer recorded in the current Session.

For a keyless planning path, build the planning context, copy a citation ID from the retrieval result, replace `REPLACE_WITH_CITATION_ID` in [`fixtures/minimal-plan.template.json`](fixtures/minimal-plan.template.json), and paste the JSON into the Plan stage's local demo field. The page keeps Skill validation, human approval, activation, plan approval, step confirmation, stop, and report actions explicit.

The fixture is development input only. No biological specimen, Space ATAC CSV, PDF, or fixed protocol is loaded by the runtime composition.
