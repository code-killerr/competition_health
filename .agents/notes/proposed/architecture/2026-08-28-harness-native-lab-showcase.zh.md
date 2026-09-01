# Agent Note: Harness 原生实验应用页面与持久化演示流程

Status: proposed

[English](2026-08-28-harness-native-lab-showcase.md) | 中文

## 问题

实验原型已经具备项目、知识、规划、运行时和对话能力，但当前浏览器组合仍然把这些能力呈现为按阶段组织的工作台。该组合把会话范围的视图和 footer 操作放在了本应属于根应用页面的位置，把业务记录保存在浏览器状态中，并使无模型演示看起来像独立于真实 Harness 流程的另一套系统。如果继续沿用这个结构，Project、Session、Experiment 和 Run 的归属会越来越不清晰，同时会复制应用壳、导航和输入框。

已有多个 OpenSpec 变更分别负责基础能力。`lab-harness-native-workspace` 负责当前 Harness 原生的 Project、导航、Conversation 和公共 Knowledge Consumer 集成，只剩最终验证门禁。`pdf-knowledge-parser-mvp` 负责 Knowledge 导入、引用和 SOP 公共协议，只剩最终验证门禁。`pdf-docling-ingestion-mvp` 已完成。尚未实现的 `pdf-knowledge-parser` 是独立的生产解析器扩展线，不是本展示变更的前置依赖。

## 方案

本变更只补齐产品级组合和持久化实验关系，不重复实现已有基础能力。Harness 的 `ui-layout` 提供根作用域的应用视图注册表，`ui-sidebar` 提供追加式一级导航位置。LABWEAVE 使用这些 contract 构成一个层级应用壳：全局执行监控、动态 Project tree、Project 生命周期目的地，以及包含 Knowledge、Agent、Workflow 和 Lab Skill、Devices、People 和 permissions 的配置中心。实验相关包不创建第二套应用壳或主路由。

LABWEAVE 负责可见应用 composition。它消费可复用的 `ui-conversation` presentation contract，并共用同一 Session、input state machine、draft、queue、slash/reference handling、attachment、access/model control、interaction takeover、timeline 和 node renderer。实验 profile 在左侧使用现有可收起的全局 sidebar，中间使用完整共享且保留 Harness 原生 header、hero 与 composer 的 Agent conversation，右侧使用可收起的 active Project workspace；不保留重复的 Conversation 外壳、context strip、重复 composer 或底部 Agent dock。整个页面只有一个 input DOM、一个 draft 和一个 Session。

Host 继续作为注册目录 Workspace、实验 Project、Experiment、Run、Artifact manifest 和 Project file 的权威来源。一个 Project 精确关联一个目录 Workspace，但不替换 Workspace 身份；一个 Workspace 至多对应一个 Project，重复创建时复用已有映射，未映射 Workspace 则按目录名创建 Project。Project scope 的变更通过 Host adapter action 执行，不由页面直接调用 Facade。Session 仍然是 Harness Conversation，并通过 `created`、`continued` 或 `reviewed` 关系显式关联 Experiment。一个 Experiment 保留多个不可变 Run，重试通过新 Run 记录来源。右侧 Project workspace 将已授权 Project file 分为项目配置、对话输出和运行产物；Host 写入后只记录 metadata 与 revision 的 Project-scoped file event，打开的 file catalog 据此刷新。浏览器状态只保存展示选择并通过 typed Facade 命令重新加载记录，绝不拥有绝对路径或文件正文。

无模型演示使用确定性的 Knowledge、模型和设备 Provider，但仍通过真实能力配置使用的 Host Facade、Session events、审批门禁、Runtime 记录和浏览器贡献。界面根据 Provider 元数据标记模拟或不可用状态，不创建浏览器专属记录，不根据缺少 API key 推断演示模式，也不使用静态 fixture 替代真实规划和执行路径。

全局 monitor 是状态和导航投影，不是跨 Project scheduler。配置目的地消费注册 capability data，并显示真实的 read-only 或 unavailable 状态；People 和 permissions 绝不伪造 identity 或 authorization。

## 当前验证

assembled LABWEAVE Web profile 保留 `conversationMode` 和默认选择元数据，使用共享的 Conversation presentation 保留 Harness 原生 header、hero 与 composer，并将 Project workspace 挂载在右侧 details 列。Host 组合的无模型流程已经通过服务和组合测试覆盖 Project/Session identity、范围限定的 context、Workflow/Skill/Plan 提案与审批、Runtime 执行、重规划、Project 文件、verdict 和报告持久化。

现有浏览器场景覆盖动态全局 monitor、Projects tree、Project 生命周期目的地、以生命周期为主的 Overview、待处理动作展示、配置能力状态、typed Project 与 Artifact 选择、单一 textarea、跨目的地切换时的 draft 保留、Agent timeline 展开、侧栏 rail 行为和响应式布局。剩余浏览器验收必须覆盖两侧收起路径、中间 conversation 滚动、Project/file 切换、metadata-event refresh、手动刷新、preview 和 download。可重复的 assembled 浏览器场景位于 `apps/web/tests/lab-showcase.e2e.ts`；第 9 阶段从 Knowledge 到报告的浏览器证据仍不属于这份记录。

客户端 fixture 覆盖了分组的 Project file metadata、授权 preview 和 download action，以及能够触发当前 catalog 重载的仅含 metadata 的 revision event。生产组合已经通过 typed Host adapter 接入 Project、Run、报告、Run action、Project-file command 与 event、capability summary 以及 Agent/Runtime event projection。assembled 浏览器门禁仍需在可进行浏览器验证的设备上补齐响应式交互证据。

只有在新页面完成验证后删除被替代的 `conversation.view` 工作台、实验 profile 中的默认 Conversation composition、平铺导航、`sidebar.footer.action`、`lab:navigate`、浏览器生成的业务 ID、阶段映射、固定 split layout 和重复 composer，迁移才算完成。相关基础变更仍保留各自的最终验证任务；本变更不得替它们标记完成，也不得重新实现它们负责的内部能力。

## 曾考虑的替代方案

**保留阶段工作台并在旁边增加更多页面。** 不采用，因为它会保留错误的会话范围归属，并形成第二套导航和交互模型。

**把默认 Conversation 页面保留在实验工作台上方或旁边。** 不采用，因为这种共存会留下两个视觉产品、遮蔽生命周期工作台，并阻止 LABWEAVE 把 Agent orchestration 呈现为融合的实验控制界面。

**使用带本地记录的独立浏览器演示。** 不采用，因为它无法证明 Host 持久化、Session 来源、审批、Runtime 状态或刷新后的连续性。

**将目录 Workspace 和实验 Project 合并成一个实体。** 不采用，因为目录文件和实验范围具有不同的归属、生命周期和关联规则。

**将每次重试都作为只有一个 Run 的新 Experiment。** 不采用，因为它会丢失同一问题下的对比关系，并隐藏重试来源。

## 验收标准

- 没有 Session 时，根侧栏已经提供全局 monitor、动态 Project tree 和配置中心；选择 Project 后打开其最后一个有效生命周期目的地。
- LABWEAVE 提供一个由 Harness Session 和 input state machine 驱动的完整中间 Agent conversation，以及可收起的右侧 Project workspace；实验 profile 不渲染默认 Conversation composition、底部 Agent dock 或第二个输入。
- 右侧 Project workspace 按项目配置、对话输出和运行产物分组 Host 授权文件；Project-scoped metadata event 无需轮询即可刷新当前 catalog，浏览器不访问文件系统。
- Project、Experiment、Run 和 Artifact 由 Host 服务生成并持久化；浏览器只提交用户字段和已选择的已有记录。
- 一个 Experiment 可以保留多个终态 Run，包含重试来源，并在启动它的 Session 关闭或归档后继续存在。
- 无模型验收流程从来源和引用开始，经过真实 Facade 与 Session event 路径，完成计划、审批、Run、Artifact 和报告。
- 最终浏览器组合只有一个应用壳、一套层级导航、一个 Agent input 和一个共享数据源，旧工作台与共存机制已经移除。
- `lab-harness-native-workspace` 和 `pdf-knowledge-parser-mvp` 继续负责各自的最终验证门禁，`pdf-knowledge-parser` 继续不属于本展示变更范围。

## 风险

- 新增通用应用视图和导航扩展会扩大 Harness 客户端 API。通过保持扩展式、归属明确并在实验迁移前独立测试来控制风险。
- 拒绝预发布的旧 Project 和 Runtime 格式需要新的确定性 fixture。接受这一代价是为了避免兼容分支继续保留不清晰的归属和过时的单 Run 状态。
- 确定性 Provider 可能被误认为生产能力。必须通过 Provider 元数据、可见状态和可选真实配置明确区分，同时保持用户流程不变。
- 如果只检查视觉结果，迁移可能遗留无用的阶段代码。浏览器验收和源码检查必须共同确认旧注册、事件、ID 和重复 composer 已移除。
- LABWEAVE 专用输入可能悄悄丢失 Harness draft、queue、attachment 或 takeover 行为。实现必须复用正式 conversation presentation contract，assembled tests 必须断言单 input DOM 和完整 interaction path。
