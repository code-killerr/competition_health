# @deepseek-ai/dsh-experimental-lab-cache
[English](README.md) | 中文

实验室流程共用的 Session/Storage 投影 Consumer。它为 Web Consumer 与 Agent 工具 Consumer 统一拥有 `lab_experiment_cache` domain，启用两条路径时不会重复打开同一个 domain。

该 Consumer 自身不记录模型可见数据。调用方先追加对应的实验 Session 事件，再调用 `ctx.labExperimentCache.project(...)` 写入 Runtime 投影。未组合 Storage 时，服务保留显式空实现，便于无 key 组合测试。

## 范围

- 拥有带版本的 `lab_experiment_cache` Storage domain；
- 为 Web 与 Agent Consumer 提供最小投影写入器；
- 不读取 Provider 数据库、不执行 Skill，也不创建 Agent loop。
