# @deepseek-ai/dsh-client-ui-lab-workbench

[English](README.md) | 中文

实验室流程的 opt-in dsh.client 工作台贡献者。它注册 Harness 原生侧栏导航和根级 application view，通过类型化浏览器客户端访问 /api/lab，并将 Provider、数据库、Skill 执行器和 Agent loop 保留在 Host 侧。

Workbench 负责项目壳层和展示选择。Knowledge 是独立的根级 `app.view#lab-knowledge` 贡献者，项目壳层不会复制或包裹 Knowledge 的实现。

工作台覆盖项目和 Session 导航、Agent 生命周期投影、Knowledge 与能力范围、Skill 与计划审查、受控运行、步骤证据、验证和最终报告展示。实验目标只通过现有 Harness composer 提交；缺少输入时由 Agent 补问或现有 ask-user interaction 处理，不再提供第二套需求表单。人工操作仍是明确的工作台操作。

通过 [examples/lab-web](../../../examples/lab-web/) 中的 opt-in 示例启用。默认 Web profile 不加载本包。

## Model Experience

### Harness workspace

#### What the model sees

该包不增加面向模型的工具。它从 `/api/lab` 展示项目范围的 Harness 状态，并在项目壳层旁显示真实 Harness Conversation；面向模型的检索仍由 Host Agent 组合负责。

#### Token effect

浏览器工作区不会发送模型请求，也不会添加提示词内容。

#### KV Cache effect

工作区不会创建模型缓存状态。

## Known Limitations and Deferred Work

- Knowledge 工作区是 opt-in 的配套包，需要 lab Web 组合和已挂载的 `/api/lab` Facade。
