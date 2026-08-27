# Agent Note: 实验室 Web Workbench Consumer 拓扑

Status: implemented

[English](2026-08-26-lab-web-workbench-consumer-topology.md) | 中文

## 问题

实验室流程需要一个浏览器贡献者，调用与宿主组合相同的 Knowledge、Planning、Skill、Device 和 Runtime 能力。浏览器不能变成 Provider 实现，流程还需要持久化 Session 证据和可刷新读取的实验缓存，同时不能让已有 Agent 工具依赖浏览器。

## 决策

浏览器是由 examples/lab-web/cordis.patch.yml 暴露的 opt-in dsh.client 工作台贡献者。它复用 Harness 现有的侧栏和会话 Slot，通过一个类型化的 /api/lab Web Consumer 发送命令，并将 Provider 选择、持久化、Agent 循环和生命周期校验保留在 Host 侧。默认 profile 和默认 API RPC 映射保持不变。

Knowledge 视图只消费能力状态、来源/版本标识、项目范围、引用和冲突等公开只读记录。

| 范围 | 负责方 |
| --- | --- |
| Harness 项目/Session、规划上下文和生命周期卡片 | `lab-harness-native-workspace` |
| Knowledge 录入、解析、检索、索引、嵌入和 SOP 管理 | `pdf-knowledge-parser` |

Harness 不设置 Knowledge 最低版本门槛，只消费当前类型化只读 Knowledge Consumer contract。无密钥集成测试路径为 `packages/experimental/lab-project/tests`、`packages/experimental/lab-mvp-web/tests`、`packages/experimental/tool-lab*/tests` 和 `packages/client/ui-lab-workbench/tests`。资料录入、解析、检索、索引、嵌入和 SOP 管理由独立贡献的 Knowledge 工作台负责；Harness 不复制这套流程。

实验缓存由 packages/experimental/lab-cache 作为小型共享 Consumer 负责。lab-mvp 与 tool-lab 仅在服务不存在时安装它，因此单独组合可以拥有该能力，合并组合则复用同一个服务。Session 与 Storage 存在时，Facade 记录请求、提案、审核、运行和反馈事件，并把当前实验投影到 lab_experiment_cache domain。缺少这些服务时，直接 Provider 测试保留明确的非持久化路径，不会静默创建第二套持久化系统。

Agent 组合提供带引用的 Knowledge 检索、规划上下文、计划提案、Skill 校验和受限报告工具。计划决策、Skill 批准或激活以及运行状态变更属于人工操作；tools/pre-execute 会拒绝自主 Agent 调用，项目工作台显式提交这些操作。

无密钥浏览器 fixture 只包含最小文档、计划模板、Skill revision 和 Mock Device。空间 ATAC CSV、鼠脑空间转录组数据与 PDF 示例仍是外部测试输入；生产命令不会根据它们的名称或格式分支。

## 曾考虑的替代方案

**把 Workbench 加入默认 Web profile。** 拒绝，因为实验室 bundle 仍处于实验阶段，需要在协议和 fixture 演进期间使用显式 opt-in 组合。

**让浏览器代码直接调用 Provider 或数据库。** 拒绝，因为这会重复生命周期校验、绕过 Session 证据，并让 UI 负责 Provider 选择和持久化细节。

**把缓存继续放在 tool-lab 内部，让 Web Facade 间接调用它。** 拒绝，因为 Web Consumer 是独立的宿主面；这样要么依赖 Agent 工具安装，要么创建平行投影。小型共享 Consumer 让两个宿主面复用同一套缓存词汇。

**把空间 ATAC 或鼠脑示例编码进运行时。** 拒绝，因为这些文件是测试数据和参考资料，不是生产流程判别条件。fixture 验证的是通用命令序列。

## 后果

原型现在可以通过真实浏览器页面手工运行，并在无密钥条件下从项目设置测试到最终报告。浏览器与 Agent 路径共享 Service contract、Session 事件和缓存投影，同时保持默认产品 profile 不变。在 Web 协议、认证和生产部署策略完成评审前，opt-in patch 仍是组合入口。

Knowledge 能力可以独立替换，因为 Harness 只存储不透明的来源/版本和引用标识。Knowledge 能力缺失时显示明确的不可用投影，同时项目、Session 和确定性 fake Consumer 测试仍可运行。

初始缓存是投影而不是实验权威日志；Session 事件仍是恢复来源。不带 Session 的直接 Facade 测试会明确不宣称持久化证据。浏览器当前用于演示流程，不提供生产认证、远程部署，也不会在未显式配置 Agent 时调用模型进行规划。
