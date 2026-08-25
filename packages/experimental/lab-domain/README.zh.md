# @deepseek-ai/dsh-experimental-lab-domain

[English](README.md) | 中文

第一阶段原型共享实验领域 id、生命周期状态、实验需求、计划步骤、确定性校验结果和 Session 事件声明。

## 模型体验

本包不新增模型工具或提示词，只定义 Knowledge、Skill、Device 和 Runtime 共用的持久化词汇。

### Token 影响

本包不直接增加 token。由 Consumer 决定哪些已校验领域值进入模型上下文。

### KV Cache 影响

本包不直接影响 KV Cache。Session 事件类型用于保证模型可见决策可重建。

## 已知限制与暂缓事项

- 本包不负责资料、Skill、设备或运行实例持久化。
- 本包不编码 Space ATAC 或鼠脑专用实验流程。
- 本包只校验计划协议，不负责调用模型生成计划、请求人工审批或执行设备操作。
