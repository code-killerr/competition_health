# Agent Note: Harness 原生实验应用页面与持久化演示流程

Status: proposed

[English](2026-08-28-harness-native-lab-showcase.md) | 中文

## 问题

实验原型已经具备项目、知识、规划、运行时和对话能力，但当前浏览器组合仍然把这些能力呈现为按阶段组织的工作台。该组合把会话范围的视图和 footer 操作放在了本应属于根应用页面的位置，把业务记录保存在浏览器状态中，并使无模型演示看起来像独立于真实 Harness 流程的另一套系统。如果继续沿用这个结构，Project、Session、Experiment 和 Run 的归属会越来越不清晰，同时会复制应用壳、导航和输入框。

已有多个 OpenSpec 变更分别负责基础能力。`lab-harness-native-workspace` 负责当前 Harness 原生的 Project、导航、Conversation 和公共 Knowledge Consumer 集成，只剩最终验证门禁。`pdf-knowledge-parser-mvp` 负责 Knowledge 导入、引用和 SOP 公共协议，只剩最终验证门禁。`pdf-docling-ingestion-mvp` 已完成。尚未实现的 `pdf-knowledge-parser` 是独立的生产解析器扩展线，不是本展示变更的前置依赖。

## 方案

本变更只补齐产品级组合和持久化实验关系，不重复实现已有基础能力。Harness 的 `ui-layout` 提供根作用域的应用视图注册表，`ui-sidebar` 提供追加式一级导航位置。LABWEAVE 使用这些 contract 构成一个应用壳：左侧包含全局执行监控、配置中心和原生 Workspace/Session tree；已有 Project 位于监控的 Project 状态区，Project 生命周期目的地属于右侧 Project workspace。实验相关包不创建第二套应用壳、主路由或常驻的 Project 创建树。

LABWEAVE 负责可见应用 composition。全局监控和配置是整页 replace view，不挂载 Conversation、composer 或 Project workspace。Project 模式消费可复用的 `ui-conversation` presentation contract，并共用同一 Session、input state machine、draft、queue、slash/reference handling、attachment、access/model control、interaction takeover、timeline 和 node renderer。它在左侧使用现有可收起的全局 sidebar，中间使用完整共享且保留 Harness 原生 header、hero 与 composer 的 Agent conversation，右侧使用可收起且可自由拖拽的 active Project workspace；不保留重复的 Conversation 外壳、context strip、重复 composer 或底部 Agent dock。整个页面只有一个 input DOM、一个 draft 和一个 Session。

Host 继续作为注册目录 Workspace、实验 Project、Experiment、Run、Artifact manifest 和 Project file 的权威来源。一个 Project 精确关联一个目录 Workspace，但不替换 Workspace 身份；一个 Workspace 至多对应一个 Project：选择未映射 Workspace 时按目录名自动创建 Project，后续选择复用已有映射。浏览器不要求用户创建或选择这一内部 Project 层。点击 Project 状态行时，系统解析并切换对应 Workspace，打开 matching Session，选择关联 Project 和已授权的 active Experiment，再打开目标 Project workspace destination。Session 仍然是 Harness Conversation，并通过 `created`、`continued` 或 `reviewed` 关系显式关联 Experiment。在当前 Session 关联的 Project 内，Agent 可以通过一个 Host application operation 请求创建 Experiment；Host 生成 Experiment ID，并向 Runtime 注册同一个 identity。Agent 不能创建 Workspace 或 Project、批准 Plan 或 Skill revision、启动 Run、确认人工步骤或发布 verdict。一个 Experiment 保留多个不可变 Run，重试通过新 Run 记录来源。右侧 Project workspace 将已授权 Project file 分为项目配置、对话输出和运行产物；Host 写入后只记录 metadata 与 revision 的 Project-scoped file event，打开的 file catalog 据此刷新。浏览器状态只保存展示选择并通过 typed Facade 命令重新加载记录，绝不拥有绝对路径或文件正文。

实验 profile 增加 scoped LABWEAVE system-prompt contribution，但不替换 Harness identity、deployment persona、工具协议或权限提示。它明确 Agent 是当前 Project 的规划、协调与解释 Agent，定义生命周期顺序，并划分 Agent、人工、Runtime 和 capability 职责。Agent 可调用的 Experiment 创建操作不接收 Project 或 Experiment ID，并在同一 tool call 重试时返回相同的 Host-created record。每个非终态实验结果都标识 state、scoped records、reason、next actor、allowed actions 和可选 registered workbench destination。人工门禁处 Agent 只请求一次后 yield；durable human-action event 提供继续依据。任何等待都不得要求被策略拒绝的 Agent 操作或工作台不存在的操作。

无模型演示使用确定性的 Knowledge、模型和设备 Provider，但仍通过真实能力配置使用的 Host Facade、Session events、审批门禁、Runtime 记录和浏览器贡献。界面根据 Provider 元数据标记模拟或不可用状态，不创建浏览器专属记录，不根据缺少 API key 推断演示模式，也不使用静态 fixture 替代真实规划和执行路径。

全局 monitor 是状态和导航投影，不是跨 Project scheduler。它的 Project 状态区列出持久化 Project 及其 active Run、失败和待审批状态；点击状态行时先完成 Project→Workspace→Session 跳转，再打开工作台。配置目的地消费注册 capability data，并显示真实的 read-only 或 unavailable 状态；People 和 permissions 绝不伪造 identity 或 authorization。

## 当前验证

当前 assembled LABWEAVE Web profile 已证明共享 Conversation presentation、Host Project/Session identity、Workflow/Skill/Plan 记录、Runtime 执行、重规划、Project 文件、verdict 和报告持久化的部分能力，但尚未满足最终 composition：monitor 仍使用 Conversation mode，仍有独立 Project 创建页面，Agent 也缺少完整的 LABWEAVE prompt、当前 Project Experiment 创建操作和 typed continuation result。当前工具拒绝 Agent 调用 `lab_experiment_create`，同时只暴露不会创建 Project 或 Runtime record 的 proposal 工具，因此无 Experiment 的 Project 没有可接受的 Agent bootstrap 路径。

现有浏览器场景仍可作为生命周期目的地、状态展示、配置能力状态、typed Project 与 Artifact 选择、draft 保留、timeline 展开、面板行为、响应式布局，以及 Project 文件刷新、preview 和 download 的回归基线，但不能完成新验收。特别是 `apps/web/tests/lab-full-lifecycle.e2e.ts` 虽然提交了 Agent 消息和补问，主要实验流程却通过直接 `/api/lab` 调用驱动，因此只能证明 Host API 集成，不能证明 Agent 使用真实 `lab_*` 工具、Host-owned Experiment 创建或人类启动 Run。最终浏览器证据必须从无 composer 的 monitor 开始，点击 Project 状态行，切换关联 Workspace 和 matching Session，打开已授权 Experiment 工作台，再通过 assembled 应用完成 Agent 与人工协作流程。

客户端 fixture 覆盖了分组的 Project file metadata、授权 preview 和 download action，以及能够触发当前 catalog 重载的仅含 metadata 的 revision event。生产组合已经通过 typed Host adapter 接入 Project、Run、报告、Run action、Project-file command 与 event、capability summary 以及 Agent/Runtime event projection。第 8 阶段导航与布局、LAB Agent context 和创建操作、assembled identity flow、无障碍以及仓库级验证仍是待完成的验收工作。

只有在新页面完成验证后删除被替代的 `conversation.view` 工作台、实验 profile 中的默认 Conversation composition、平铺导航、`sidebar.footer.action`、`lab:navigate`、浏览器生成的业务 ID、阶段映射、固定 split layout 和重复 composer，迁移才算完成。相关基础变更仍保留各自的最终验证任务；本变更不得替它们标记完成，也不得重新实现它们负责的内部能力。

## 曾考虑的替代方案

**保留阶段工作台并在旁边增加更多页面。** 不采用，因为它会保留错误的会话范围归属，并形成第二套导航和交互模型。

**把默认 Conversation 页面保留在实验工作台上方或旁边。** 不采用，因为这种共存会留下两个视觉产品、遮蔽生命周期工作台，并阻止 LABWEAVE 把 Agent orchestration 呈现为融合的实验控制界面。

**使用带本地记录的独立浏览器演示。** 不采用，因为它无法证明 Host 持久化、Session 来源、审批、Runtime 状态或刷新后的连续性。

**将目录 Workspace 和实验 Project 合并成一个实体。** 不采用，因为目录文件和实验范围具有不同的归属、生命周期和关联规则。

**将每次重试都作为只有一个 Run 的新 Experiment。** 不采用，因为它会丢失同一问题下的对比关系，并隐藏重试来源。

## 验收标准

- 打开 Session 前，应用显示不含 composer 的全局 monitor；根侧栏包含 monitor、配置中心和原生 Workspace/Session tree，不提供独立 Project 创建或选择项。
- 已有 Project 保留在 monitor 的 Project 状态区；点击后切换其 Workspace，打开 matching Session，选择关联 Project 和已授权 active Experiment，并打开目标工作台目的地。
- LABWEAVE 提供一个由 Harness Session 和 input state machine 驱动的完整中间 Agent conversation，以及可收起的右侧 Project workspace；实验 profile 不渲染默认 Conversation composition、底部 Agent dock 或第二个输入。
- 右侧 Project workspace 按项目配置、对话输出和运行产物分组 Host 授权文件；Project-scoped metadata event 无需轮询即可刷新当前 catalog，浏览器不访问文件系统。
- Project、Experiment、Run 和 Artifact 由 Host 服务生成并持久化；Agent 只能在当前 Project 内请求创建 Experiment，浏览器只提交用户字段和已选择的已有记录。
- 实验 Agent 获得 additive LABWEAVE 角色和有序流程提示，同时保留普通 Harness identity、工具与权限提示。
- 只有人类可以调整和批准 Plan 或 Skill revision、启动 Run 与确认人工步骤；Agent 工具不能绕过这些门禁。
- 每个非终态结果明确 next actor 和允许动作；人工操作可从 registered workbench destination 执行，Agent yield 而不是轮询或重试被拒绝工具。
- 一个 Experiment 可以保留多个终态 Run，包含重试来源，并在启动它的 Session 关闭或归档后继续存在。
- 无模型验收流程使用真实 Agent `lab_*` 工具，并经过同一 Facade 与 Session event 路径，从 Project context 与 Experiment 创建开始，完成来源、引用、Plan proposal、人工审批和 Run start、Artifact 与报告。
- 最终浏览器组合只有一个应用壳、一套层级导航、一个 Agent input 和一个共享数据源，旧工作台与共存机制已经移除。
- `lab-harness-native-workspace` 和 `pdf-knowledge-parser-mvp` 继续负责各自的最终验证门禁，`pdf-knowledge-parser` 继续不属于本展示变更范围。

## 风险

- 新增通用应用视图和导航扩展会扩大 Harness 客户端 API。通过保持扩展式、归属明确并在实验迁移前独立测试来控制风险。
- 拒绝预发布的旧 Project 和 Runtime 格式需要新的确定性 fixture。接受这一代价是为了避免兼容分支继续保留不清晰的归属和过时的单 Run 状态。
- 确定性 Provider 可能被误认为生产能力。必须通过 Provider 元数据、可见状态和可选真实配置明确区分，同时保持用户流程不变。
- 如果只检查视觉结果，迁移可能遗留无用的阶段代码。浏览器验收和源码检查必须共同确认旧注册、事件、ID 和重复 composer 已移除。
- LABWEAVE 专用输入可能悄悄丢失 Harness draft、queue、attachment 或 takeover 行为。实现必须复用正式 conversation presentation contract，assembled tests 必须断言单 input DOM 和完整 interaction path。
- Agent 与人工权限分离可能产生没有允许执行者的生命周期状态。Typed progress result、幂等 Agent bootstrap operation 和聚焦 transition matrix 必须证明每个等待都有可见的继续或停止动作。
