# Agent Note: Host-owned Agent experiment bootstrap

Status: implemented

[English](2026-09-02-lab-agent-host-bootstrap-idempotency.md) | 中文

## 问题

Agent 需要一个产品入口，将当前 Session 上下文转换为 Project Experiment，同时不能自行编造 Project 或 Experiment 身份；发生重试时也不能创建第二条 Project 记录、Runtime 记录或 Session 请求。

## 决定

Agent 只使用当前 Session 和实验元数据调用 `lab_experiment_create`。Host 解析该 Session 所属的 Project，生成 Experiment ID，使用同一个身份写入 Project 和 Runtime 记录，并返回包含目标位置与允许后续动作的类型化进度。Project 审计记录保存工具操作身份，并拒绝使用不同实验元数据重复占用同一个身份。Runtime 对同一 Experiment ID 的相同请求允许重放，对冲突元数据返回错误。

当 Project 或 Session 事件缺失时，Host 会补写 Project 实验创建事件和实验请求事件；重放也会执行这一检查，因此部分写入失败后可以恢复模型可见证据而不会重复事件。Project 或 Workspace 创建，以及计划、Skill 和运行状态等人工控制的变更，仍由 Host 或界面操作完成。

## 曾考虑的替代方案

**让 Agent 提供 Project 和 Experiment ID。** 拒绝，因为 Agent 不拥有 Host 身份的权威来源，可能把记录错误绑定到不同 Project。

**保留只生成提案的 Agent 工具，并要求先切换界面再创建。** 拒绝，因为 Agent 生命周期缺少统一创建操作，普通重试还依赖脆弱的展示步骤。

**第一次写入后将重试一律视为错误。** 拒绝，因为 Project、Runtime 和 Session 写入之间的部分失败会让 Agent 无法恢复目标位置。

## 后果

实验创建可以通过现有工具 Consumer 和 Host Facade 组合使用，同一个操作可以安全重试。当当前 Session 没有 Project 时，类型化阻塞进度仍会把下一步明确交给人工选择 Workspace。操作身份和 Experiment 身份持久化在 Project 审计与 Session 事件中；预期输出仍属于 Runtime 请求数据。组合工具测试验证了创建、同一操作重放以及无 Project 时转交人工。
