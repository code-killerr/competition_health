# experimental/：私有实验性包

[English](README.md) | 中文

本组包含使用仓库真实运行时、但不进入正式发布的原型与内部专用 Cordis 插件。组内包均为私有包，不承诺稳定性或支持，但仍须满足与发布包相同的工程、安全、文档、生命周期、测试和快照要求。

| 包 | 职责 | ctx key |
|---|---|---|
| `agent-team/` | 隐式 root Agent Teams roster、持久 peer mailbox、共享任务 DAG 与运行时协调 | `ctx.agentTeams` |
| `tool-agent-team/` | 按 Agent 作用域提供的 Agent Teams 模型工具与协作指引 | — |
| `lab-domain/` | 实验领域 id、状态、校验规则和 Session 事件类型 | — |
| `lab-knowledge/` | 实验知识库 Service Definition 与 Provider 接缝 | `ctx.labKnowledge` |
| `lab-knowledge-local/` | 面向本地知识检索的 Provider-owned SQLite/FTS5 实现 | — |
| `tool-lab-knowledge/` | 按 Agent 作用域提供只读 Knowledge 状态、检索和冲突工具 | — |
| `lab-planning/` | 声明式规划上下文与提案 Service Definition | `ctx.labPlanning` |
| `lab-planning-local/` | 带引用规划上下文和确定性提案校验的本地 Provider | — |
| `tool-lab-planning/` | 按 Agent 作用域提供规划上下文、设备能力和提案工具 | — |
| `lab-skill/` | 声明式实验 Skill 生命周期 Service Definition | `ctx.labSkills` |
| `lab-skill-local/` | 实验 Skill 进程内 Provider 与 `ctx.skills` 桥接 | — |
| `lab-device/` | 设备能力、租约、回执和停止 Service Definition | `ctx.labDevices` |
| `lab-device-mock/` | 面向测试的可配置内存设备 Provider | — |
| `lab-runtime/` | 基于批准计划的受控执行 Service Definition | `ctx.labRuntime` |
| `lab-mvp/` | 第一阶段实验能力的 opt-in 组合包 | — |

[子树规则](AGENTS.md)规定依赖隔离、发布排除与 promotion。
