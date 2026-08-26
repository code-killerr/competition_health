# @deepseek-ai/dsh-experimental-lab-mvp

[English](README.md) | 中文

第一阶段实验原型的 opt-in 组合包。它组合 Knowledge、Planning、Lab Skill、Device 和 Runtime Service Definition，并挂载本地 Knowledge、Planning、Skill、Mock Device、Runtime 以及只读 Web Consumer Provider。

加载本组合包时可配置 knowledgePath、planning、skill 和 device。Harness 默认 profile 不变，必须显式组合本包。面向 Agent 的工具仍由 tool-lab 作为独立 opt-in Consumer 提供。

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
- Agent 未显式组合 tool-lab 时不会自动注册实验工具。
