# @deepseek-ai/dsh-client-ui-lab-workbench
English | [中文](README.zh.md)

Opt-in dsh.client workspace contributor for the experimental laboratory workflow. It registers Harness-native sidebar navigation and a conversation.view contribution, reads /api/lab through a typed browser client, and keeps Providers, databases, Skill executors, and Agent loops on the host.

The Knowledge view is a read-only projection of capability status, source/version status, project scope, citations, and conflicts. Source ingestion, parsing, retrieval, and SOP curation belong to the separately contributed Knowledge workspace.

The workbench covers project and Session navigation, request capture, local demonstration or scoped Agent planning, Skill and plan review, controlled run actions, step evidence, verification, and final report display. Human actions remain explicit workspace operations.

Enable it through the opt-in example in [examples/lab-web](../../../examples/lab-web/). The default Web profile does not load this package.
