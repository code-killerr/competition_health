# @deepseek-ai/dsh-experimental-tool-lab
English | [中文](README.zh.md)

Opt-in Agent Consumer for the laboratory workflow. It composes the existing Agent-scoped Knowledge and Planning tools with Runtime tools and does not create a second tool registry.

The Consumer records experiment requests, plan approvals, plan rejections, run state, step observations, cache projections, and reports in the calling Agent Session. When the existing approval service is composed, `lab_plan_approve` passes through the Harness tool approval seam before recording the plan; `lab_plan_reject` records a reason and optional replacement revision. Plan approval can carry an immutable execution graph input; lab_run_step advances one controlled step and never executes model-supplied script or API commands.

Compose this package after lab-mvp in an Agent scope. It requires the existing Agent, tool registry, Knowledge, Planning, and Runtime Services.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees approved plans, controlled run states, and bounded observations through the package typed service or `lab_*` tools.

#### Token effect

Only requested plan fields, current-step status, and bounded evidence are returned; local storage details remain host-side.

#### KV Cache effect

Stable experiment, plan, Skill revision, and run identifiers keep repeated step results compact and prefix-friendly.

## Known Limitations and Deferred Work

- This experimental package provides local typed contracts and does not claim production persistence, recovery, or hardware integration.
