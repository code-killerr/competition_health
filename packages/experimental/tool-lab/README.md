# @deepseek-ai/dsh-experimental-tool-lab
English | [中文](README.zh.md)

Opt-in Agent Consumer for the laboratory workflow. It composes retrieval, planning, Skill validation, and bounded report tools in the existing Agent scope without creating a second tool registry.

The Agent-facing tool set can create an Experiment from the current Session, propose plans, and inspect cited context. `lab_experiment_create` leaves Project and Experiment identities to the Host: the Host resolves the Session's Project, generates one Experiment ID for the Project and Runtime records, and returns typed next actions. Human-controlled plan decisions, Skill approval or activation, and run state changes are rejected by the tools/pre-execute policy with a stable instruction to perform the action in the project workspace. Repeating one tool-call operation is safe and returns the existing destination.

Compose this package after lab-mvp in an Agent scope. It requires the existing Agent, tool registry, Knowledge, Planning, Skill, Runtime, and experiment cache Services.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees cited evidence, planning context, structured proposals, Skill validation results, typed Experiment progress, and bounded reports through typed services or `lab_experiment_create`, `lab_plan_approve`, and `lab_run_report`. A missing Project returns a human-directed blocked result; Project and Workspace creation remain Host/UI operations.

#### Token effect

Only requested plan fields, current-step status, and bounded evidence are returned; local storage details remain host-side.

#### KV Cache effect

Stable experiment, plan, Skill revision, and run identifiers keep repeated results compact and prefix-friendly.

## Known Limitations and Deferred Work

- This experimental package provides local typed contracts and does not claim production persistence, recovery, or hardware integration.
