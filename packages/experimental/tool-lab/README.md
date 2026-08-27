# @deepseek-ai/dsh-experimental-tool-lab
English | [中文](README.zh.md)

Opt-in Agent Consumer for the laboratory workflow. It composes retrieval, planning, Skill validation, and bounded report tools in the existing Agent scope without creating a second tool registry.

The Agent-facing tool set can propose plans and inspect cited context. Human-controlled plan decisions, Skill approval or activation, and run state changes are rejected by the tools/pre-execute policy with a stable instruction to perform the action in the project workspace.

Compose this package after lab-mvp in an Agent scope. It requires the existing Agent, tool registry, Knowledge, Planning, Skill, Runtime, and experiment cache Services.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees cited evidence, planning context, structured proposals, Skill validation results, and bounded reports through typed services or lab_* tools. Human-controlled state changes are submitted through the project workspace.

#### Token effect

Only requested plan fields, current-step status, and bounded evidence are returned; local storage details remain host-side.

#### KV Cache effect

Stable experiment, plan, Skill revision, and run identifiers keep repeated results compact and prefix-friendly.

## Known Limitations and Deferred Work

- This experimental package provides local typed contracts and does not claim production persistence, recovery, or hardware integration.
