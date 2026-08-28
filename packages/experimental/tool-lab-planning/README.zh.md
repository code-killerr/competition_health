# @deepseek-ai/dsh-experimental-tool-lab-planning
[English](README.md) | 中文

按既有 Harness Agent scope 提供规划阶段工具：检索规划上下文、读取设备能力、提交结构化计划和 Skill 草案。

工具复用 `ctx.tools` 的 schema、scope、取消和审计语义；提案只会产生 `DRAFT` 记录和 `lab/plan/proposed` Session 事件，不会审批、锁定、启动或执行设备。

## 模型体验

### 受控实验上下文

#### 模型看到的内容

模型通过规划工具看到有边界的引用、设备能力、结构化计划和 Skill 草案。

#### Token 影响

只返回规划所需的当前步骤、引用和能力字段；Provider 与工具注册表细节留在宿主侧。

#### KV Cache 影响

稳定的实验、计划、Skill 修订和引用标识让重复规划上下文更紧凑，并保持前缀友好。

## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
