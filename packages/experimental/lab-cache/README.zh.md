# @deepseek-ai/dsh-experimental-lab-cache
[English](README.md) | 中文

实验室流程共用的 Session/Storage 投影 Consumer。它为 Web Consumer 与 Agent 工具 Consumer 统一拥有 `lab_experiment_cache` domain，启用两条路径时不会重复打开同一个 domain。

该 Consumer 自身不记录模型可见数据。调用方先追加对应的实验 Session 事件，再调用 `ctx.labExperimentCache.project(...)` 写入 Runtime 投影。未组合 Storage 时，服务保留显式空实现，便于无 key 组合测试。

## 范围

- 拥有带版本的 `lab_experiment_cache` Storage domain；
- 为 Web 与 Agent Consumer 提供最小投影写入器；
- 不读取 Provider 数据库、不执行 Skill，也不创建 Agent loop。

## 模型体验

### 受控实验上下文

#### 模型可见内容

当实验工具或 Web Facade 请求 `ctx.labExperimentCache.get()` 时，模型可以看到当前实验投影。

#### Token 影响

只暴露选定实验的有界状态、引用、Skill 修订和更新者；Storage Domain 细节留在宿主侧。

#### KV Cache 影响

稳定的实验和运行标识让重复投影更紧凑，并保持前缀友好。

## 已知限制与暂缓事项

- 投影不是第二个权威来源；调用方必须先追加对应的 Session 事件，再写入投影。
- 没有 Storage 时，该服务在无 Key 组合测试中保持显式 no-op。
