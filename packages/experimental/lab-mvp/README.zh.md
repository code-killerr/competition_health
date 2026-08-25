# @deepseek-ai/dsh-experimental-lab-mvp

[English](README.md) | 中文

第一阶段 opt-in 组合包，挂载实验 Knowledge、Planning、Lab Skill、Device 和 Runtime Service Definition。

本组合包不挂载本地 Provider，也不修改 Harness 默认 profile，是 I0 及后续增量的组合接缝。

## 模型体验

本组合包不新增工具或提示词，模型可见行为由 Consumer 和 Provider 负责。

### Token 影响

只有显式组合工具 Consumer 后才会产生影响。

### KV Cache 影响

只有显式组合 Provider 和实验 Session 后才会产生影响。

## 已知限制与暂缓事项

- 本包自身不执行实验、不录入资料、不连接设备。
- 本地 Provider 组合和工具 Consumer 计划在后续增量实现。
