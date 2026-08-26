# @deepseek-ai/dsh-experimental-lab-runtime-local

[English](README.md) | 中文

实验受控运行时的进程内 Provider。

该 Provider 只通过 opt-in 组合加载，并在内存中保存实验、已批准计划、ExecutionGraph、运行和观察结果。它只接受完全匹配的已批准计划修订。设备步骤通过注入的 Lab Device Service 完成健康检查、租约、幂等执行和释放；人工及审批步骤等待证据。脚本和 API 步骤会形成 BLOCKED 观察结果，绝不会被执行。

请使用 lab-mvp bundle，或在 Lab Runtime 和 Lab Device Service 加载后挂载该 Provider。该 Provider 适合确定性组合测试和演示，不提供跨进程恢复或生产调度。

## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
