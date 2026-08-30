# @deepseek-ai/dsh-client-ui-lab-workbench

English | [中文](README.zh.md)

Opt-in dsh.client workspace contributor for the experimental laboratory workflow. It registers Harness-native sidebar navigation and root application views, reads /api/lab through a typed browser client, and keeps Providers, databases, Skill executors, and Agent loops on the host.

The workbench owns the project shell and presentation selection. Knowledge is a separate root `app.view#lab-knowledge` contributor, so the project shell does not duplicate or wrap its implementation.

The workbench covers project and Session navigation, Agent lifecycle projections, scoped Knowledge and capability context, Skill and plan review, controlled run actions, step evidence, verification, and final report display. The existing Harness composer is the only experiment request entry point; missing inputs remain an Agent clarification or the existing ask-user interaction, not a second request form. Human actions remain explicit workspace operations.

Enable it through the opt-in example in [examples/lab-web](../../../examples/lab-web/). The default Web profile does not load this package.

## Model Experience

### Harness workspace

#### What the model sees

The package adds no model-facing tool. It renders project-scoped Harness state from `/api/lab` and exposes the real Harness Conversation beside the Project shell; model-facing retrieval remains owned by the Host Agent composition.

#### Token effect

The browser workspace does not send model requests or add prompt content.

#### KV Cache effect

The workspace does not create model cache state.

## Known Limitations and Deferred Work

- The Knowledge workspace is an opt-in companion package and requires the lab Web composition with a mounted `/api/lab` Facade.
