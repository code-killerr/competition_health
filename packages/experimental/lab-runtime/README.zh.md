# @deepseek-ai/dsh-experimental-lab-runtime

[English](README.md) | 中文

面向批准计划锁定、受控实验运行、人工确认、安全停止、可恢复状态和报告的 Service Definition。

Runtime 不调用 LLM、不读取原始 SOP，也不接受任意设备命令。Provider 会根据已批准的计划和 Skill 快照构建执行图。

## 模型体验

Consumer 可以展示计划批准、等待步骤、观察结果、失败和最终报告。Runtime 状态以结构化证据暴露，不隐藏在提示词中。

### Token 影响

返回给 Agent 的内容只应包含当前步骤状态、待确认事项和有边界的证据。

### KV Cache 影响

运行实例和 Skill 修订 id 在重试或进程恢复后必须保持稳定。

## 已知限制与暂缓事项

- 当前不包含 ExecutionGraph 或本地 Runtime Provider。
- 跨进程恢复和生产调度不属于第一增量。
