# @deepseek-ai/dsh-experimental-lab-planning-local
[English](README.md) | 中文

本地 Planner Provider 复用 Knowledge、Lab Skill 和 Lab Device Service，组装带引用、冲突、缺口和只读设备台账的规划上下文。

Agent 提交的计划和 Skill 草案会先保存为 `DRAFT`，并经过确定性校验；校验会保留请求所需来源、检查步骤引用归属，并验证每个 Skill 声明的参数约束。本 Provider 不审批、不锁定计划，也不执行设备操作。

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
