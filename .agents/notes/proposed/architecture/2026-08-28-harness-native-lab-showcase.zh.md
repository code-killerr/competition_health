# Agent Note: Harness 原生实验应用页面与持久化演示流程

Status: proposed

[English](2026-08-28-harness-native-lab-showcase.md) | 中文

## 问题

实验原型已经具备项目、知识、规划、运行时和对话能力，但当前浏览器组合仍然把这些能力呈现为按阶段组织的工作台。该组合把会话范围的视图和 footer 操作放在了本应属于根应用页面的位置，把业务记录保存在浏览器状态中，并使无模型演示看起来像独立于真实 Harness 流程的另一套系统。如果继续沿用这个结构，Project、Session、Experiment 和 Run 的归属会越来越不清晰，同时会复制应用壳、导航和输入框。

已有多个 OpenSpec 变更分别负责基础能力。`lab-harness-native-workspace` 负责当前 Harness 原生的 Project、导航、Conversation 和公共 Knowledge Consumer 集成，只剩最终验证门禁。`pdf-knowledge-parser-mvp` 负责 Knowledge 导入、引用和 SOP 公共协议，只剩最终验证门禁。`pdf-docling-ingestion-mvp` 已完成。尚未实现的 `pdf-knowledge-parser` 是独立的生产解析器扩展线，不是本展示变更的前置依赖。

## 方案

本变更只补齐产品级组合和持久化实验关系，不重复实现已有基础能力。Harness 的 `ui-layout` 提供根作用域的应用视图注册表，`ui-sidebar` 提供追加式一级导航位置。实验相关包通过这些公开扩展点注册 Projects、Knowledge 和 Devices，不创建第二套应用壳、主路由或 composer。

Host 继续作为注册目录 Workspace、实验 Project、Experiment、Run 和 Artifact manifest 的权威来源。一个 Project 精确关联一个目录 Workspace，但不替换 Workspace 身份。Session 仍然是 Harness Conversation，并通过 `created`、`continued` 或 `reviewed` 关系显式关联 Experiment。一个 Experiment 保留多个不可变 Run，重试通过新 Run 记录来源。浏览器状态只保存页面展示选择，业务记录通过 typed Facade 命令重新加载。

无模型演示使用确定性的 Knowledge、模型和设备 Provider，但仍通过真实能力配置使用的 Host Facade、Session events、审批门禁、Runtime 记录和浏览器贡献。界面根据 Provider 元数据标记模拟或不可用状态，不创建浏览器专属记录，不根据缺少 API key 推断演示模式，也不使用静态 fixture 替代真实规划和执行路径。

只有在新页面完成验证后删除被替代的 `conversation.view` 工作台、`sidebar.footer.action` 导航、`lab:navigate` 事件、浏览器生成的业务 ID、阶段映射和第二套 composer，迁移才算完成。相关基础变更仍保留各自的最终验证任务；本变更不得替它们标记完成，也不得重新实现它们负责的内部能力。

## 曾考虑的替代方案

**保留阶段工作台并在旁边增加更多页面。** 不采用，因为它会保留错误的会话范围归属，并形成第二套导航和交互模型。

**使用带本地记录的独立浏览器演示。** 不采用，因为它无法证明 Host 持久化、Session 来源、审批、Runtime 状态或刷新后的连续性。

**将目录 Workspace 和实验 Project 合并成一个实体。** 不采用，因为目录文件和实验范围具有不同的归属、生命周期和关联规则。

**将每次重试都作为只有一个 Run 的新 Experiment。** 不采用，因为它会丢失同一问题下的对比关系，并隐藏重试来源。

## 验收标准

- 没有 Session 时，Projects、Knowledge 和 Devices 可以从 Harness 根应用视图打开；选择 Session 后返回现有 Conversation，且不卸载 Conversation。
- Project、Experiment、Run 和 Artifact 由 Host 服务生成并持久化；浏览器只提交用户字段和已选择的已有记录。
- 一个 Experiment 可以保留多个终态 Run，包含重试来源，并在启动它的 Session 关闭或归档后继续存在。
- 无模型验收流程从来源和引用开始，经过真实 Facade 与 Session event 路径，完成计划、审批、Run、Artifact 和报告。
- 最终浏览器组合只有一个应用壳、一个一级导航、一个 composer 和一个共享数据源，旧工作台机制已经移除。
- `lab-harness-native-workspace` 和 `pdf-knowledge-parser-mvp` 继续负责各自的最终验证门禁，`pdf-knowledge-parser` 继续不属于本展示变更范围。

## 风险

- 新增通用应用视图和导航扩展会扩大 Harness 客户端 API。通过保持扩展式、归属明确并在实验迁移前独立测试来控制风险。
- 拒绝预发布的旧 Project 和 Runtime 格式需要新的确定性 fixture。接受这一代价是为了避免兼容分支继续保留不清晰的归属和过时的单 Run 状态。
- 确定性 Provider 可能被误认为生产能力。必须通过 Provider 元数据、可见状态和可选真实配置明确区分，同时保持用户流程不变。
- 如果只检查视觉结果，迁移可能遗留无用的阶段代码。浏览器验收和源码检查必须共同确认旧注册、事件、ID 和重复 composer 已移除。
