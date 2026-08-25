# @deepseek-ai/dsh-experimental-lab-skill

[English](README.md) | 中文

面向声明式实验 Skill 草案、校验、人工批准、激活、退役和运行快照的 Service Definition。

本能力与 Harness `ctx.skills` 分离：`ctx.skills` 继续作为指令注册表，本包定义实验动作及其执行资格。

## 模型体验

Consumer 可以向 Agent 暴露 Skill 草案和校验错误。激活与执行资格由运行时决定，不能由提示词声明替代。

### Token 影响

规划上下文只应包含选中的 Skill 摘要和引用，完整操作细节属于已批准的修订快照。

### KV Cache 影响

运行快照在后续 Skill 修订激活后仍必须保持稳定。

## 已知限制与暂缓事项

- 当前不包含持久化或到 `ctx.skills` 的桥接。
- 模型生成的脚本只能作为候选资产，不能执行。
