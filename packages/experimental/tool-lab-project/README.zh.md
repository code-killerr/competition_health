# @deepseek-ai/dsh-experimental-tool-lab-project

[English](README.md) | 中文

可选的实验 Agent 工具，用于读取当前实验项目上下文，并在项目明确选择的资料范围内检索已确认的知识引用。插件不修改项目、不绕过人工门禁，也不直接访问 Knowledge 存储。

## 模型体验

### 受控实验上下文

#### 模型可见内容

模型通过 `lab_project_context` 看到当前 Project 范围，通过 `lab_project_plan_context` 看到规划引用。

#### Token 影响

只返回选定的资料、设备、已确认事实和有界引用；Project 存储及私有 Session 消息留在宿主侧。

#### KV Cache 影响

稳定的 Project、Experiment、来源和引用标识让重复规划上下文更紧凑，并保持前缀友好。

## 已知限制与暂缓事项

- 这些工具只读，并要求调用 Session 已关联 Project。
- 它们不会创建 Project、修改范围、批准计划或执行运行。
