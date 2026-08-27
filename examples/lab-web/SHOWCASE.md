# Lab showcase walkthrough

This walkthrough demonstrates one continuous Project flow in five to ten minutes. It uses the public Knowledge commands, the existing Project/Session Facade and deterministic local providers; it does not require a model key.

## Prepare

Build and start the documented composition from the repository root:

    pnpm run build
    pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open

Open the printed local URL. For sample input, choose one PDF from [docs/change_plan/pdf_knowledge](../../docs/change_plan/pdf_knowledge). The files in that directory are test material; they are not loaded automatically.

## Walkthrough

1. Open Projects, enter a project name, and create the Project. The page keeps the generated Project identity read-only.
2. Open Knowledge, select a PDF, import it, and wait until the version badge reads READY. Select Add to Project on that source.
3. Enter a short query matching the document, search, and confirm that a citation contains the source/version and page or block location. Create the SOP from the confirmed citation, enter a reviewer name, review it, and publish it.
4. Open Conversations to describe the experimental target, then open Experiments. The retrieved citation appears in the planning panel; Generate plan creates the deterministic cited Plan. Use the visible validation and human approval controls in order.
5. Open Runs, start the approved Plan, advance the step when the Runtime requests it, provide evidence and confirm the step. Open Evidence to request and inspect the report.
6. Return to Overview. The summary cards show the selected Knowledge count, plan count, Run state and evidence count; Continue flow points to the next outstanding human action.

## Expected states

READY means the imported source is available to the public Knowledge search path. unavailable means the capability is not installed or cannot be reached. An empty state means no record exists in the current Project or Session. Deterministic demo labels identify keyless fixture behavior; they do not imply a production model, device or remote execution.

## Recovery

If the import or search action fails, stay on Knowledge and retry the same action after checking the capability status. If no Project is selected, create or open one before adding a source. If the plan action is disabled, return to Knowledge and confirm a citation, then return to Experiments. If a Run action is disabled, complete the displayed Skill and Plan approval gates first. The JSON previews are diagnostic aids; do not use them as the primary path.

## Optional real-capability check

Set DEEPSEEK_API_KEY only when a model-backed planning check is intended. Keep the deterministic path as the baseline demonstration, and report missing Docling or model credentials as skipped optional capabilities rather than as successful production behavior.