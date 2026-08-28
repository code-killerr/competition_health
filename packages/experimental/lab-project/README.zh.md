# @deepseek-ai/dsh-experimental-lab-project

[English](README.md) | 中文

面向 opt-in 实验流程的持久化项目和多 Session 会话记录。

本包负责实验项目身份、明确的 Knowledge source/version 和设备关联、Session 标题/顺序、已批准共享事实、审计记录，以及可重建的计划/运行/报告证据投影。它复用现有 Storage Domain 生命周期；消息和工具事件仍以 Harness Session 日志为权威。

每个 Project 都归属于已注册的 Harness Workspace。`LabProjectService.create()` 负责生成 Project ID，并接收可选的 Workspace ID；省略时从创建它的 Session 所属 Workspace 解析。`attachSession()` 使用 Host Workspace 归属进行校验，cwd 不匹配时返回可执行的冲突信息，绝不改变 Session cwd。`detachSession()` 和 `archive()` 只修改 Project 记录，不删除或重写 Session 日志。

项目和 Agent 通过只读 `LabKnowledgeConsumer` 接缝消费知识，不解析文件、不访问 Knowledge Provider 数据库，也不实现检索。

## 模型体验

### 受控实验上下文

#### 模型可见内容

模型通过 `ctx.labProjects.context()` 和 `ctx.labProjects.projectEvidence()` 看到项目范围、Session 关联、已批准共享事实和持久化工作流证据。

#### Token 影响

只返回选定 Project 的有界范围和证据；私有 Session 消息仍保留在所属 Session 日志中。

#### KV Cache 影响

稳定的 Project、Session、Experiment 和证据标识让重复上下文投影更紧凑，并保持前缀友好。

## 已知限制与暂缓事项

- 本实验包记录控制面关联和投影，不解析 Knowledge 文件、不执行设备，也不替代权威 Session 日志。
- Project 需要已明确注册的 Harness Workspace，不会将 Session 迁移到其它 Workspace。
