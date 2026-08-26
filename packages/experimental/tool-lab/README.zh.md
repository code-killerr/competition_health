# @deepseek-ai/dsh-experimental-tool-lab

[English](README.md) | 中文

实验流程的 opt-in Agent Consumer。它将既有 Agent 作用域的 Knowledge、Planning 工具与 Runtime 工具组合在一起，不创建第二套工具注册表。

该 Consumer 将实验请求、计划批准、计划拒绝、运行状态、步骤观察、缓存投影和报告写入调用方 Agent Session。组合既有审批服务时，`lab_plan_approve` 会先经过 Harness 工具审批接缝再记录计划；`lab_plan_reject` 会记录原因和可选替代修订。计划批准可以携带不可变执行图输入；lab_run_step 一次推进一个受控步骤，绝不执行模型提供的脚本或 API 命令。

请在 Agent 作用域中与 lab-mvp 一起显式组合本包。它依赖既有 Agent、工具注册表、Knowledge、Planning 和 Runtime Service。

## 模型体验

### 受控实验上下文

#### 模型可见内容

模型通过类型化 Service 或 `lab_*` 工具看到已批准计划、受控运行状态和受限观察结果。

#### Token 影响

只返回请求的计划字段、当前步骤状态和有界证据；本地存储细节留在宿主侧。

#### KV Cache 影响

稳定的实验、计划、Skill 修订和运行标识让重复步骤结果更紧凑，并保持前缀友好。

## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
