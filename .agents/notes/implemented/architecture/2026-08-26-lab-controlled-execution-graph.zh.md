# Agent Note: 基于已批准不可变执行图的受控运行

Status: implemented

[English](2026-08-26-lab-controlled-execution-graph.md) | 中文

## Problem

实验受控运行时必须将模型提案与设备副作用分开。只有计划引用不足以说明哪些步骤可执行、哪些 Skill 修订已经审查，以及运行需要什么证据才能推进。Runtime 还需要用稳定的状态语义表达等待、阻断、完成和安全停止，同时不能暴露任意命令通道。

## Decision

Runtime 在计划批准时，将批准的计划修订、执行步骤和 ACTIVE Skill 快照冻结为 ExecutionGraph。每个步骤声明其 Skill 修订、操作类型、资源、参数、审批要求、预期证据和失败策略。运行启动后锁定计划身份，并同时暴露执行图、当前步骤、观察结果和缓存投影。

本地 Provider 支持 device、human 和 approval 操作。设备操作始终经过 Lab Device Service 的健康检查、运行租约、确定性的操作及幂等标识、回执和释放。人工及审批操作在责任主体提交证据前保持等待。脚本和 API 内容先登记为候选资源；Skill 校验要求资源已安装，Runtime 操作仍会按声明的失败策略产生失败观察结果并阻断或停止，不会执行模型提供的内容。

工具 Consumer 将计划批准、拒绝和执行步骤作为 JSON 输入。组合既有审批 Service 时，计划批准会经过 Harness 的 tools/pre-execute 与 ctx.approval 接缝；拒绝会记录原因和可选替代修订。lab_run_step 一次推进一个步骤，并将观察结果、状态转移和缓存投影写入 Agent Session。没有执行步骤的计划保留原有人工确认兼容路径。

## Alternatives considered

**让模型提供设备命令。** 这会产生未经审查的副作用通道，因此 Runtime 只接受有类型的操作种类和已注册的 Device Service 调用。

**在一次 Provider 调用中执行整份计划。** 这会隐藏当前步骤，使人工确认、取消和部分失败难以表达，因此 Runtime 明确要求一次推进一个步骤。

**只持久化可变的运行状态。** 这会丢失重建报告所需的已审查 Skill 输入和证据，因此 RunView 同时保留不可变执行图和结构化观察结果。

## Consequences

受控路径具有明确的安全和审计语义，同一执行图可供工具、测试、报告和后续恢复代码使用。本地实现保持较小：操作分派仍在 Provider 内，状态仍为进程内状态，执行图由批准请求提供，而不是从持久化计划存储加载。

当前实现不提供可复用 Executor Registry、SQLite 恢复、生产权限策略或真实设备适配器。这些缺口被明确保留，调用方不会把 opt-in 本地 Provider 当作生产调度器。

## Testing

Runtime focused tests 覆盖执行图冻结、未批准计划修订的拒绝、精确已批准计划的锁定、Mock Device 执行及释放、人工证据和不支持脚本操作的阻断。Agent 工具组合测试覆盖实验创建、带执行步骤和 Skill 快照的计划批准、运行启动、设备推进和观察输出。仓库 host 构建与 client 类型检查通过。