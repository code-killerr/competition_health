# @deepseek-ai/dsh-client-ui-lab-workbench
[English](README.md) | 中文

实验室流程的 opt-in dsh.client 工作台贡献者。它注册 Harness 原生侧栏导航和 conversation.view 贡献，通过类型化浏览器客户端访问 /api/lab，并将 Provider、数据库、Skill 执行器和 Agent loop 保留在 Host 侧。

Knowledge 视图只读投影能力状态、来源/版本状态、项目范围、引用和冲突。资料录入、解析、检索和 SOP 管理由独立贡献的 Knowledge 工作台负责。

工作台覆盖项目和 Session 导航、需求录入、本地演示或作用域化 Agent 规划、Skill 与计划审查、受控运行、步骤证据、验证和最终报告展示。人工操作仍是明确的工作台操作。

通过 [examples/lab-web](../../../examples/lab-web/) 中的 opt-in 示例启用。默认 Web profile 不加载本包。
