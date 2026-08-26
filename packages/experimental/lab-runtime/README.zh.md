# @deepseek-ai/dsh-experimental-lab-runtime

[English](README.md) | 中文

面向批准计划锁定、受控实验运行、人工确认、安全停止和结构化报告的 Service Definition。

Runtime 接收已批准的计划修订、可选执行步骤和 ACTIVE Skill 快照，由 Provider 将它们冻结为 ExecutionGraph。Consumer 通过 executeNextStep 一次推进一个步骤，通过 confirmStep 提交证据，通过 stopRun 请求停止，并从 RunView 或 buildReport 读取观察结果。

Runtime 不调用 LLM、不读取原始 SOP，也不接受任意设备命令。设备副作用必须委托给 Lab Device Service；人工和审批操作在提交证据前保持等待。脚本和 API 操作由本地 Provider 记录为阻断观察结果。

## 模型体验

### 受控实验上下文

#### 模型看到的内容

模型通过类型化服务或 `lab_*` 工具看到已批准计划、受控运行状态和有边界的观察结果。

#### Token 影响

仅返回请求的计划字段、当前步骤状态和有边界的证据；本地存储细节留在宿主侧。

#### KV Cache 影响

实验、计划、Skill 修订和运行 id 保持稳定，使重复步骤结果保持紧凑并利于复用前缀。
## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
- 生产设备、调度、权限策略和远程反馈不属于这个 opt-in 实验包。
