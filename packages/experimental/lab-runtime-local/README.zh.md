# @deepseek-ai/dsh-experimental-lab-runtime-local

[English](README.md) | 中文

实验受控运行时的进程内 Provider。

该 Provider 只通过 opt-in 组合加载，默认使用 SQLite 保存实验、已批准计划、ExecutionGraph、不可变 Run 和观察结果；隔离测试可传入 `statePath: ':memory:'`。同一个 Experiment 可以保留多个已结束 Run，但同一时刻最多只有一个非终态 Run；重试会创建带有 `retryOfRunId` 来源关系的新 Run，并保留原始证据。它只接受完全匹配的已批准计划修订。设备步骤通过注入的 Lab Device Service 完成健康检查、租约、幂等执行和释放；人工及审批步骤等待证据。脚本和 API 步骤会形成 BLOCKED 观察结果，绝不会被执行。

请使用 lab-mvp bundle，或在 Lab Runtime 和 Lab Device Service 加载后挂载该 Provider。SQLite 状态仓储可以在进程重建后恢复控制面状态，但不会自动重发中断的设备命令，也不承担生产调度。

## 持久化与产物

SQLite 载荷版本为 `2`；恢复时会拒绝旧的单 Run 载荷，不会静默迁移。Run 和观察结果提供产物清单及产物 id，但 Provider 不接受浏览器任意提交的产物路径，产物登记仍由宿主侧集成点负责。

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
