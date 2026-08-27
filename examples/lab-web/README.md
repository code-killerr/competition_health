# lab-web

English | [中文](README.zh.md)

Opt-in Web composition for the lab showcase prototype. It assembles the existing lab Service bundle, loopback `/api/lab` Consumer, `dsh.client` workbench overlay, public Knowledge workspace and Project shell without changing the default Web roster.

## Run

Build the source and browser bundles first:

```sh
pnpm run build
```

Start the showcase:

```sh
pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open
```

Open the local URL printed by the command. Follow the showcase walkthrough in SHOWCASE.md for the five-to-ten-minute path. The application starts in a Project-oriented shell with Overview, Conversations, Experiments, Runs and Evidence pages; global Knowledge, Devices and Projects actions remain available in the sidebar. A Project is created by name, while its opaque ID stays an internal Host-backed value.

Use Knowledge to select a PDF, import it, wait for the version to reach `READY`, and add or remove the source from the current Project. Search the selected public Knowledge records, confirm a citation, and create, review and publish an SOP. The same citation is returned to the workbench so the Experiments page can generate a deterministic keyless Plan for human review.

Continue through the explicit gates in the Experiments, Runs and Evidence pages: validate the Skill, approve the Plan, start the Run, confirm its steps, stop when required, and inspect the resulting evidence/report. The UI labels deterministic demo behavior, unavailable capabilities and empty states instead of presenting them as production integrations.

Model-backed planning is opt-in and requires `DEEPSEEK_API_KEY`. The keyless path uses the real Facade, Session and Project surfaces with deterministic Knowledge and Runtime providers. The fixture [`fixtures/minimal-plan.template.json`](fixtures/minimal-plan.template.json) remains available for lower-level development tests, but it is not required for the primary browser flow. Diagnostic JSON previews are retained for debugging and are not the main user workflow.

These fixtures are development inputs only. The runtime composition does not load biological specimens, spatial ATAC CSV files, PDFs or fixed experimental protocols automatically.
