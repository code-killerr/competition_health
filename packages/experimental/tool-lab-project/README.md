# @deepseek-ai/dsh-experimental-tool-lab-project

English | [中文](README.zh.md)

Opt-in Agent tools for reading the current laboratory Project context and retrieving confirmed Knowledge citations within its explicit source scope. The plugin does not modify projects, bypass human gates, or access Knowledge storage directly.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees the current Project scope through `lab_project_context` and planning citations through `lab_project_plan_context`.

#### Token effect

Only selected sources, devices, confirmed facts, and bounded citations are returned; Project storage and private Session messages remain host-side.

#### KV Cache effect

Stable Project, Experiment, source, and citation identifiers keep repeated planning context compact and prefix-friendly.

## Known Limitations and Deferred Work

- These tools are read-only and require a Project association for the calling Session.
- They do not create Projects, modify scope, approve plans, or execute runs.
