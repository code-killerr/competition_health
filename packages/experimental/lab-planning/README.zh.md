# @deepseek-ai/dsh-experimental-lab-planning
[English](README.md) | 中文

规划阶段的 Service Definition。它只定义检索上下文、声明式计划提案和 Provider 接缝，不创建新的 Agent、模型配置或执行通道。

`lab-planning-local` 负责调用 Knowledge、Skill 和 Device Service；规划工具负责把 Agent 生成的结构化提案交给该 Service。计划和 Skill 在人工确认前保持非执行状态。

计划提案由确定性校验器检查 DRAFT 状态、检索来源和 Skill 参数约束；该 Service Definition 不负责审批、锁定或执行。

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
