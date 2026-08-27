# @deepseek-ai/dsh-client-ui-lab-workbench

English | [中文](README.zh.md)

Opt-in dsh.client workspace contributor for the experimental laboratory workflow. It registers Harness-native sidebar navigation and a conversation.view contribution, reads /api/lab through a typed browser client, and keeps Providers, databases, Skill executors, and Agent loops on the host.

The workbench owns Knowledge workspace placement, not the Knowledge implementation. It declares the single session-scoped `lab.knowledge.workspace` slot; the independent Knowledge workspace contributor consumes the current MVP public Facade for PDF import, citation retrieval and SOP curation.

The workbench covers project and Session navigation, request capture, local demonstration or scoped Agent planning, Skill and plan review, controlled run actions, step evidence, verification, and final report display. Human actions remain explicit workspace operations.

Enable it through the opt-in example in [examples/lab-web](../../../examples/lab-web/). The default Web profile does not load this package.

## Model Experience

### Harness workspace

#### What the model sees

The package adds no model-facing tool. It renders project-scoped Harness state and mounts the Knowledge Consumer at `lab.knowledge.workspace`; model-facing retrieval remains owned by the Host Agent composition.

#### Token effect

The browser workspace does not send model requests or add prompt content.

#### KV Cache effect

The workspace does not create model cache state.

## Known Limitations and Deferred Work

- The Knowledge workspace is an opt-in companion package and requires the lab Web composition with a mounted `/api/lab` Facade.