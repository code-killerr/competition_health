# @deepseek-ai/dsh-client-ui-lab-workbench

[English](README.md) | 中文

实验室流程的 opt-in dsh.client 工作台贡献者。它注册 Harness 原生侧栏导航和 conversation.view 贡献，通过类型化浏览器客户端访问 /api/lab，并将 Provider、数据库、Skill 执行器和 Agent loop 保留在 Host 侧。

Workbench 负责 Knowledge 工作区的放置，不负责 Knowledge 实现。它声明单一 session 作用域的 `lab.knowledge.workspace` slot；独立的 Knowledge 工作区贡献者通过当前 MVP 公开 Facade 完成 PDF 录入、引用检索和 SOP 管理。

工作台覆盖项目和 Session 导航、需求录入、本地演示或作用域化 Agent 规划、Skill 与计划审查、受控运行、步骤证据、验证和最终报告展示。人工操作仍是明确的工作台操作。

通过 [examples/lab-web](../../../examples/lab-web/) 中的 opt-in 示例启用。默认 Web profile 不加载本包。

## Model Experience

### Harness workspace

#### What the model sees

该包不增加面向模型的工具。它展示项目范围的 Harness 状态，并在 `lab.knowledge.workspace` 挂载 Knowledge Consumer；面向模型的检索仍由 Host Agent 组合负责。

#### Token effect

浏览器工作区不会发送模型请求，也不会添加提示词内容。

#### KV Cache effect

工作区不会创建模型缓存状态。

## Known Limitations and Deferred Work

- Knowledge 工作区是 opt-in 的配套包，需要 lab Web 组合和已挂载的 `/api/lab` Facade。