# @deepseek-ai/dsh-client-ui-lab-workbench
[English](README.md) | 中文

实验室流程的 opt-in `dsh.client` 工作台。它挂载一个 `shell.overlay` Slot，通过类型化浏览器客户端访问 `/api/lab`，并将 Provider、数据库、Skill 执行器和 Agent loop 保留在 Host 侧。

工作台覆盖知识导入与检索、需求录入、本地演示或显式 Agent 规划、Skill 与计划审查、受控运行、步骤证据、验证和最终报告展示。本地演示只接受显式开发 JSON 夹具，仍然经过 Host 校验和人工确认门禁。

通过 [`examples/lab-web`](../../../examples/lab-web/) 中的 opt-in 示例启用。默认 Web profile 不加载本包。
