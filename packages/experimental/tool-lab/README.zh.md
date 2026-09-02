# @deepseek-ai/dsh-experimental-tool-lab
[English](README.md) | 中文

实验流程的 opt-in Agent Consumer。它在既有 Agent 作用域中组合检索、规划、Skill 校验和受限报告工具，不创建第二套工具注册表。

面向 Agent 的工具可以从当前 Session 创建实验、提出计划并读取带引用的上下文。`lab_experiment_create` 不要求 Agent 提供 Project 或 Experiment 身份：Host 根据当前 Session 解析 Project，为 Project 与 Runtime 记录生成同一个 Experiment ID，并返回类型化的后续动作。计划决策、Skill 批准或激活以及运行状态变更属于人工操作；tools/pre-execute 策略会稳定拒绝这些调用，并提示在项目工作台中完成操作。重复同一个工具调用时会安全返回已有目标，不会创建第二个实验。

请在 Agent 作用域中与 lab-mvp 一起显式组合本包。它依赖既有 Agent、工具注册表、Knowledge、Planning、Skill、Runtime 和实验缓存 Service。

## 模型体验

### 受控实验上下文

#### 模型可见内容

模型通过类型化 Service 或 `lab_experiment_create`、`lab_plan_approve` 和 `lab_run_report` 看到带引用的证据、规划上下文、结构化提案、Skill 校验结果、类型化实验进度和受限报告。缺少 Project 时会返回指向人工操作的阻塞结果；Project 与 Workspace 的创建仍由 Host 或界面操作完成。

#### Token 影响

只返回请求的计划字段、当前步骤状态和有界证据；本地存储细节留在宿主侧。

#### KV Cache 影响

稳定的实验、计划、Skill 修订和运行标识让重复结果更紧凑，并保持前缀友好。

## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
