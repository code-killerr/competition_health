# @deepseek-ai/dsh-experimental-lab-device-mock

[English](README.md) | 中文

用于第一阶段组合和运行时测试的可配置内存 Lab Device Provider。

本包不提供真实硬件传输。设备通过插件配置提供，每个操作都需要匹配的运行租约和幂等键。

## 模型体验

本 Provider 不新增工具或提示词，Device Consumer 可以暴露结构化能力和回执值。

### Token 影响

本包不直接影响 token；Consumer 应返回有边界的能力和回执数据。

### KV Cache 影响

设备租约和回执属于运行状态，不能隐式进入提示词缓存。

## 已知限制与暂缓事项

- 状态只存在于进程内，不是真实硬件模拟。
- 故障注入和持久化租约留待后续测试。
