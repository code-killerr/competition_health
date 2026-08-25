# @deepseek-ai/dsh-experimental-lab-device

[English](README.md) | 中文

面向实验设备能力、健康状态、租约、受控操作、回执、状态和安全停止的 Service Definition。

Agent 可以通过 Consumer 查询设备，但只有 Runtime 可以经由 Device Service 提交操作。

## 模型体验

规划阶段可以让模型看到受限的设备能力摘要，原始设备命令和 Provider 传输细节不属于模型接口。

### Token 影响

规划只接收有边界的能力摘要，操作回执在执行后以结构化证据返回。

### KV Cache 影响

设备状态属于实时运行状态，不应作为稳定提示词前缀。

## 已知限制与暂缓事项

- 当前不包含真实硬件或 Mock Device Provider。
- 租约持久化、幂等和故障注入计划在 I2 实现。
