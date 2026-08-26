# @deepseek-ai/dsh-client-ui-lab-workbench
English | [中文](README.zh.md)

Opt-in `dsh.client` workbench for the experimental laboratory workflow. It mounts one `shell.overlay` Slot, reads `/api/lab` through a typed browser client, and keeps Provider, database, Skill executor, and Agent loop code on the host.

The workbench covers knowledge import and retrieval, request capture, local demonstration or explicit Agent planning, Skill and plan review, controlled run actions, step evidence, verification, and final report display. The local demonstration accepts an explicit development JSON fixture and still uses the host validation and human approval gates.

Enable it through the opt-in example in [`examples/lab-web`](../../../examples/lab-web/). The default Web profile does not load this package.
