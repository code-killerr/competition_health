# Luna 开发任务清单

执行者必须先阅读 [proposal.md](proposal.md)、[design.md](design.md)、四份 capability spec 和 [详细实施计划](../../../docs/change_plan/superpowers/2026-08-28-lab-showcase-ready-workspace-implementation-plan.md)。任务按编号顺序执行；每个阶段的验证未通过时不得开始下一阶段。0–3 阶段保留已经完成的 Host 基础；4 阶段冻结前端 records、commands、events 与 adapter 接口；5–7 阶段提供可迁移的 Agent/workbench 能力基础；8 阶段把这些能力重新组合为 LABWEAVE 原生视觉架构；9 阶段补全 Workflow、Experiment、Run、Evidence、判定和报告；10 阶段连接既有 Host、Agent 与 Runtime；11 阶段完成浏览器验收。前端 fixture 必须实现正式 typed contract，不得成为第二套权威状态。不得继续扩展现有 `conversation.view` 整页工作台，不得使用 `sidebar.footer.action`、`window` 事件、哈希路由、浏览器生成的 Project/Experiment ID 或浏览器专属业务数据完成产品流程。

### 完成状态解释

- 5.2、5.4、5.7、7.1 和 7.2 的已完成状态只证明导航、持续挂载、Session context 和单草稿等能力基础存在，不代表其当前视觉组合是最终方案。
- 第 8 阶段必须拆除默认 Conversation 页面、顶部大输入框、独立 context strip、固定上下分屏和相邻 Agent rail 的产品组合；可以复用其底层 Session、input state machine、draft、queue、slash/reference/attachment、access/model、ask-user/approval takeover 和 timeline/node renderer。
- 最终 LABWEAVE 页面只能有一个输入 DOM、一个 draft 和一个 Session。不得通过 CSS 隐藏旧输入框后新增输入框，也不得直接调用低层 send API 绕过 Harness 输入状态机。
- 每个第 8 阶段任务均以 `examples/lab-web` assembled browser 行为为完成证据；组件、fixture 或 jsdom 独立通过不能代替真实组合。

## 0. 固定审计基线

**交付：** 可信任务状态和可重复的当前行为证据。

- [x] 0.1 在 Node 24 下构建并启动 `examples/lab-web`，复现无 Session 时 Projects/Knowledge/Devices footer 按钮不切换页面的问题，并确认根因是 `LabWorkbench` 未挂载时不存在 `lab:navigate` 监听器。
- [x] 0.2 运行 `ui-lab-workbench`、`ui-lab-knowledge-workspace` 和 `pdf-harness-smoke` 聚焦测试，记录 9 个测试文件、20 个测试通过；确认这些测试没有覆盖无 Session 导航或完整浏览器流程。
- [x] 0.3 撤回 1.3、4.2、4.3、4.6、6.6、7.1、8.2 的旧完成结论，并以本清单取代按页面数量判断完成度的任务结构。
- [x] 0.4 核对 `lab-harness-native-workspace` 和 `pdf-knowledge-parser-mvp` 的剩余任务；完成或明确迁移仍属于本变更的任务，禁止两个 change 同时声明同一工作已完成。
- [x] 0.5 在 `.agents/notes/proposed/architecture/` 新建应用视图、实验对象关系和 keyless 演示策略的 Agent Note 英文/中文/sidecar 三件套，并在实现批次中持续保持内容与最终设计一致。

### 0 阶段所有权结论

- `lab-harness-native-workspace` 当前为 31/32，剩余 `6.8` 仅负责其自身的 client module graph、配置、类型、聚焦测试、构建、文档和 OpenSpec 最终门禁；本变更不重复其已完成的 Harness-native Project、Navigation、Conversation 或 Knowledge Consumer 实现。
- `pdf-knowledge-parser-mvp` 当前为 13/14，剩余 `4.3` 仅负责其自身的包测试、类型检查和 OpenSpec 校验；本变更不重复其已完成的导入、引用、检索、SOP 草案和发布协议。
- `pdf-docling-ingestion-mvp` 为 21/21，当前变更只消费其可用的解析 Provider，不修改其已完成的实现。
- `pdf-knowledge-parser` 为 0/49 的独立生产解析器扩展线，不作为本展示变更的前置条件，也不在本变更中提前实现或宣称完成。

## 1. 为 Harness 增加正式的一级页面与导航扩展点

**文件：** `packages/client/ui-layout/src/client/{service,stores,index,AppFrame}.ts*`、`AppFrame.module.css`、`packages/client/ui-layout/tests/*`、`packages/client/ui-sidebar/src/client/{index,SidebarRoot}.tsx`、`contract/slots.ts`、`SidebarRoot.module.css`、`packages/client/ui-sidebar/tests/*`。

**接口：** `ILayout.openAppView(viewId: string): void`、`ILayout.closeAppView(): void`、`ILayout.activeAppView(): string | undefined`；slot `app.view` 为 root-scoped list，slot `sidebar.navigation` 为 root-scoped list。Conversation 默认显示且保持挂载，选择 app view 时只改变中心列可见内容。

- [x] 1.1 为 `ui-layout` 添加失败测试：无 Session 时可打开一个注册的 `app.view`；关闭后恢复 Conversation；打开未知 view ID 抛出 `APP_VIEW_NOT_FOUND`，活动 view 卸载时清除选择并恢复 Conversation。
- [x] 1.2 扩展 layout store 和 `ILayout`，保存当前 application view ID；保持 sidebar/details 现有行为和 Session 切换测试不变。
- [x] 1.3 在 `AppFrame` 声明并渲染 `app.view`，使用 slot entry ID 选择唯一页面；隐藏页面不得卸载 Conversation，避免输入草稿和 Session 状态丢失。该任务完成通用挂载基础；5.4 将在实验 composition 中把互斥可见行为扩展为 workbench 与 Conversation 组合显示。
- [x] 1.4 为 `ui-sidebar` 增加 `sidebar.navigation` seat，位置固定在“新建会话”和 Workspace/Session 浏览区之间；wide/rail 两种状态均提供 owner props，不复用 footer action。
- [x] 1.5 增加组合测试：导航条在无 Session、有 Session、侧边栏收起和 application view 卸载四种状态均可用，且不读写 `window` 自定义事件或 URL hash。
- [x] 1.6 更新 `ui-layout`、`ui-sidebar` README/JSDoc、架构文档和 proposed Agent Note；运行两个包的聚焦测试、typecheck、bundle 与相关 client snapshot。

### 1 阶段检查点

- 聚焦测试：两个包共 16 个测试文件、96 个测试通过，包含 `AppFrame + SidebarRoot + SlotCore` 的真实组合装配。
- 类型检查：`ui-layout` 与 `ui-sidebar` 在 Node 24 下通过。
- Bundle：两个包均构建成功。
- 新增公开能力：`ILayout.openAppView()`、`ILayout.closeAppView()`、`ILayout.activeAppView()`、根级 `app.view` 和 `sidebar.navigation`。
- 约束验证：Conversation 在切换应用视图时保持挂载；未知 view ID fail loud；活动 view entry 卸载后恢复 Conversation；未使用 `window` 事件、URL hash 或 footer action 实现一级导航。

**阶段验收：** 创建一个测试 app view 后，从全新 Harness 首页点击一级导航即可显示该页面；不需要先创建 Session。

## 2. 让 Workspace、Project 和 Session 关系由 Host 权威维护

**文件：** `packages/experimental/lab-domain/src/project.ts`、`packages/experimental/lab-project/src/index.ts`、`tests/service.spec.ts`、`packages/experimental/lab-mvp-web/src/project-protocol.ts`、`src/index.ts` 及对应 tests；Session 事件声明和 TypeScript/Python SDK 预期输出。

**接口：** `LabProject.workspaceId: WorkspaceId`；`CreateLabProjectRequest` 不接收 Project ID，由 `LabProjectService.create()` 生成 `LabProjectId`；attach 返回 cwd 匹配结果，任何命令都不得修改既有 Session cwd。

- [x] 2.1 在 lab-domain 定义 `WorkspaceId` 关联字段、Project 归档语义和 attach 失败结果；所有跨包 ID 继续使用 branded 类型。
- [x] 2.2 将 `lab_projects` Domain version 从 1 提升到 2，更新 schema、序列化和测试 fixture；按预发布策略明确拒绝旧 version，不增加兼容分支。
- [x] 2.3 在 `LabProjectService` 注入 ID 生成器或使用仓库现有 Host ID 工具，删除调用方提供 `projectId` 的创建接口。
- [x] 2.4 创建 Project 时必须接收一个已注册 Workspace；从当前 Session 创建时解析其权威 cwd 对应 Workspace，不从浏览器路径字符串推断。
- [x] 2.5 实现显式 attach/detach：cwd 匹配时关联；不匹配时返回 Project Workspace 与 Session Workspace 标识以及“在目标 Workspace 新建 Session”可执行信息；不得隐式改变 cwd。
- [x] 2.6 创建 Project Session 时通过现有 Workspace/Session Host 服务在 Project Workspace 下创建真实 Session；基线实现通过 `ui-layout.closeAppView()` 返回现有 Conversation。5.4 保留 Session 创建与打开语义，并在实验 composition 中用持续工作台取代关闭页面的产品行为。
- [x] 2.7 更新 `project-create`、`project-session-attach`、`project-session-detach`、`project-archive` 协议和 Facade；解析器拒绝浏览器提交的 Project ID。
- [x] 2.8 为创建、Workspace 缺失、cwd 冲突、attach、detach、归档但保留 Session 日志增加领域、协议和组合测试；同步 Session events 和两个 SDK 投影。

### 2 阶段检查点

- Node 24.19 下 lab-domain、lab-project、lab-mvp-web、lab-mvp 和 tool-lab-project 类型检查通过。
- 相关组合测试 11 个文件、37 个测试通过，覆盖 Host Workspace 校验、生成 Project ID、attach 冲突、Project Session 创建、detach、archive 和 PDF smoke。
- `lab_projects` 使用 Domain version 2；旧记录缺少 `workspaceId` 时被 schema 拒绝，不提供兼容分支。
- 浏览器 `project-create` parser 拒绝 `projectId`；Workspace、Project 和 Session 的 ID 均为 branded 类型。

**阶段验收：** 浏览器只提交名称、描述和 Workspace ID；刷新后 Project 仍能打开；cwd 不匹配时没有任何 Session 被移动。

## 3. 建立持久化 Experiment、Session 关系、多个 Run 和 Artifact

**文件：** `packages/experimental/lab-domain/src/{types,project}.ts`、`lab-project/src/index.ts`、`lab-runtime/src/{types,index}.ts`、`lab-runtime-local/src/{index,sqlite-store}.ts`、对应 tests。

**接口：** `LabExperimentRecord`、`SessionExperimentLink`、`RunView[]`、`ArtifactManifest`；`getRun(runId)` 与 `listRuns(experimentId)` 取代按 Experiment 返回单一 Run 的接口。

- [x] 3.1 定义 Experiment 记录：generated `ExperimentId`、Project、title、objective、status、createdInSessionId、derivedFromExperimentId、createdAt、updatedAt。
- [x] 3.2 定义 `SessionExperimentLink.role` 为 `created | continued | reviewed`，实现同一 Experiment 多 Session 关系以及跨 Project 引用拒绝。
- [x] 3.3 将 Experiment 和 Session link 加入 `lab_projects` Domain version 2 状态、服务方法和审计记录；创建接口不允许调用方提供 Experiment ID。
- [x] 3.4 将 `RuntimeExperimentState.run?` 改为有序 `runs`；每个 Run 保存 Run ID、锁定 Plan revision、launching Session、retryOfRunId、状态、时间和执行图。
- [x] 3.5 将 Runtime Provider 改为 `startRun(input)`、`getRun(runId)`、`listRuns(experimentId)`、`retryRun(runId, actor)`；同一 Experiment 已有非终态 Run 时返回稳定冲突错误。
- [x] 3.6 定义 Artifact manifest 及 Observation 到 Artifact ID 的引用；只保存 Host 授权位置，不允许浏览器传入任意可执行 HTML 或未授权绝对路径。
- [x] 3.7 提升 Runtime SQLite schema，更新 read/write、索引和中断写入恢复测试；旧单 Run 数据按预发布策略拒绝。
- [x] 3.8 为派生 Experiment、跨 Session 继续、Session 关闭后 Run 存续、失败重试、并发 Run 拒绝、Artifact 完整性增加聚焦测试。

### 3 阶段检查点

- Node 24.19 下 lab-domain、lab-runtime、lab-runtime-local、lab-mvp-web 和 tool-lab 类型检查通过。
- 相关组合测试 13 个文件、52 个测试通过，覆盖 Experiment 派生与跨 Project 拒绝、Session provenance、SQLite 恢复、旧单 Run 载荷拒绝、终态 Run 重试和非终态 Run 冲突；Artifact 目前只有空清单完整性覆盖，不能作为非空 Artifact 产出的完成证据。
- Runtime 权威状态使用 version 2；Run 以有序数组保存，SQLite 主键维持 Experiment 索引，旧 `run` 字段载荷在恢复时 fail loud。
- 浏览器和 Tool 只能提交 Experiment/Plan/Session 等引用；Artifact manifest 由 Host 侧 Runtime 产生，当前 Provider 不开放任意路径登记。

**阶段验收：** Project 可持有多个 Experiment；同一 Experiment 可保留多个终态 Run，Session 关闭后 Runtime 仍可通过 Run ID 查询和恢复。

**阶段验收：** 一个 Project 可创建两个 Experiment；同一 Experiment 可保留两个终态 Run；关闭启动 Session 后仍可从 Project 查询 Run 和 Artifact。

## 4. 冻结前端 records、commands、events 与 adapter seam

**文件：** `packages/experimental/lab-mvp-web/src/{protocol,project-protocol,index,http}.ts`、对应 tests、`packages/client/ui-lab-workbench/src/client/{api,state,fixtures}/*`。

**接口：** 页面按列表、详情和动作命令读取 typed records；Agent 生命周期使用 typed event projection；页面跳转使用 scoped presentation intent。deterministic fixture adapter 与 Host adapter 实现同一接口。删除需要默认 `experiment-1` 的全局 snapshot；保留 JSON 边界验证，浏览器内部不使用 `unknown` 记录驱动主要 UI。

- [x] 4.1 将 Facade 拆分为 Project、Experiment、Workflow/Plan、Lab Skill、Run、Evidence/Artifact、Result assessment 和 Knowledge scope 命令组，为每个 result 定义明确的 serializable view type，并通过协议类型检查。
- [x] 4.2 增加 Project list/open/archive、Experiment list/open/create/derive/link、Run list/open/start/stop/retry/compare、Artifact list/open metadata 命令。
- [x] 4.3 从生产 `LabWorkbenchAdapter` 移除 `snapshot(experimentId)`，改用页面需要的 Project、Experiment、Workflow/Plan、Lab Skill、Run、Evidence/Artifact 和 Result assessment 窄查询；报告按 Run ID 构建，Run 查询不得通过 Experiment 隐式选择“当前 Run”，并通过 adapter contract tests。通用 Host Facade 可保留旧 `snapshot` 命令，但生产页面 composition 不得调用它；fixture 可保留显式快照构造。
- [x] 4.4 为 Project source/device、Workflow/Skill validation、Run 和 Result assessment 返回 ready/waiting/unavailable 状态和稳定错误码；页面不得解析错误字符串决定行为，并用 fixture 覆盖每种状态。
- [x] 4.5 定义 Agent lifecycle projections 和 scoped presentation intent，覆盖目标补问、检索、能力缺口、Workflow/Skill 提案、审批、执行、重规划、结果判定和报告；验证未知 view、跨 Project record 和任意 URL 被拒绝。
- [x] 4.6 实现 deterministic fixture adapter，使用固定 Host 风格 ID 和事件序列覆盖成功、等待、失败与重规划；增加 adapter、parser 和序列化测试，证明 fixture 不生成业务 ID、不推进 Runtime、不计算 verdict。

**阶段验收：** 客户端拥有一套可由 fixture 与 Host 分别实现的正式 contract；`api` 层不再包含 `toSnapshot()`、默认 Experiment ID 或 `Record<string, unknown>` 页面模型。本阶段不以真实后端接通作为完成条件。

## 5. 先完成 Agent 主控区与可视化工作台组合

**文件：** 重构 `packages/client/ui-lab-workbench/src/client/`；删除 `LabNavigation.tsx`、整页 `LabWorkbench.tsx` 和旧 `store.ts` 职责；新增 `navigation/`、`projects/`、`experiments/`、`runs/`、`evidence/`、`conversation/`、`state/` 目录及对应 tests。

**接口：** `LabUiContext` 只保存 presentation selection（active Project ID、Project lifecycle destination、active Experiment ID、active Run ID 和 Agent pane state），业务记录从 `LabWorkbenchAdapter` 加载；LABWEAVE shell、Knowledge 和其他配置贡献注册 `app.view`，全局入口注册 `sidebar.navigation`。本阶段已完成的 split composition 是第 8 阶段的迁移输入，不是最终布局。

- [x] 5.1 建立 `LabUiContext` observable service，提供 `selectProject`、`selectExperiment`、`openProjectPage`、`snapshot/subscribe`；禁止保存 Project、Run、Evidence 的浏览器权威副本。
- [x] 5.2 实现 `LabGlobalNavigation` 与无 Session 的 `ctx.layout.openAppView()` 导航基础；删除 `lab:navigate` 事件和 footer 注册。第 8 阶段以分组侧栏取代这里的 Projects/Knowledge/Devices 平铺呈现。
- [x] 5.3 实现 Project list/create 页面，复用全局 Workspace records 和 Host create action，不自行实现目录输入；创建成功后使用 Host 返回 ID 选中 Project。
- [x] 5.4 实现 Project shell 和 Overview、Experiments、Runs、Evidence 基础页面；Conversations 只列真实 Session。打开 Session 后 app view 与同一个 Harness Conversation 保持挂载。第 8 阶段将这些记录重排为生命周期导航，Conversations 降为溯源入口。
- [x] 5.5 实现 Workspace unavailable、loading、empty、permission denied、provider unavailable 和 fixture/demo 状态；每个状态只显示当前可执行动作，并清楚标识尚未连接的 Host capability。
- [x] 5.6 删除 Project/Experiment 手输 ID、设备逗号输入、七阶段映射、第二套目标表单、主流程 `JsonPreview`、浏览器状态推进和浏览器构造业务 ID；诊断 JSON 仅保留在明确折叠的开发区域。
- [x] 5.7 完成用于验证持续挂载的初始 split composition 和窄屏 pane switch，并验证唯一 Conversation draft；将可见文案迁入 locale dictionaries。固定上下分屏和默认 Conversation 外壳在第 8 阶段必须删除。
- [x] 5.8 增加无 Session 导航、Project 创建、工作台与 Conversation 同时存在、composer draft 保留、跨页状态、rail/wide、窄视口和键盘测试。

**阶段验收：** 本阶段证明无 Session 导航、Project 创建、Session 持续挂载和单 draft 基础可用；最终视觉与信息架构以第 8 阶段验收为准。

## 6. 完成 Knowledge、Devices 与 Agent 生命周期前端状态

**文件：** `packages/client/ui-lab-knowledge-workspace/src/client/`、`packages/client/ui-lab-workbench/src/client/devices/`、对应 tests 与 package manifests。

- [x] 6.1 让 Knowledge 插件直接注册 `app.view` ID `lab-knowledge`，删除 `lab.knowledge.workspace` 子 slot 和对 `ui-lab-workbench` 组件类型的依赖。
- [x] 6.2 通过 `LabUiContext` 的只读 observable 获得 active Project ID；无 Project 时允许导入/检索，但隐藏或禁用“加入 Project”并提供打开 Projects 的动作。
- [x] 6.3 保留文件导入、READY 状态、失败重试、检索、引用确认、SOP 审阅发布；来源选择只使用 Host records，不显示要求用户复制的 opaque ID。
- [x] 6.4 实现 Citation link：从 Plan、Conversation、Report 打开 Knowledge view 并定位 source/version/location；Knowledge unavailable 时保留引用信息。
- [x] 6.5 实现 Devices application view，以可选设备记录替代逗号分隔 ID；明确 deterministic/mock/real/unavailable 状态。
- [x] 6.6 增加 Knowledge 独立启动、无 Session、无 Project、READY/FAILED、引用跳转和 Devices scope 的 fixture adapter 组合测试。
- [x] 6.7 实现 Agent 目标理解与补问、Knowledge 检索、Citation、Capability 查询和 capability-gap 状态；所有状态通过 typed lifecycle projection 渲染。
- [x] 6.8 实现 Experiment Workflow 图和步骤列表，展示依赖、输入输出、Lab Skill revision、Operation binding、完成条件、失败策略、validator findings 与 unresolved inputs。
- [x] 6.9 实现 Lab Skill reuse/draft/validated/approved/active 状态和 revision diff；前端只发出审核动作，不自行激活 Skill。
- [x] 6.10 实现 Run queued/running/waiting/failed/replanning/completed 和 Result assessment pending/passed/failed/human-QC 状态；前端不自行推进步骤或计算 verdict。

**阶段验收：** Knowledge 和 Devices 均可从全新首页打开；加入 Project 后在 Conversation context strip 中立即反映数量变化；在不接真实后端的情况下，fixture adapter 可以完整展示从目标补问到结果判定的所有视觉状态，且页面没有业务状态机。

## 7. 完成可复用 Agent 时间线的生命周期投影

**文件：** `packages/client/ui-lab-workbench/src/client/conversation/*`、Session event/node projection、`ui-conversation` 公共 slots 的消费者测试。

- [x] 7.1 在 `conversation.session.header.actions` 注册 Project/Experiment 标识与“查看工作台”动作并验证同一 Session。该默认 header 呈现只作为能力验证，第 8 阶段迁移到 LABWEAVE chrome。
- [x] 7.2 在 `conversation.input.dock` 注册 Project scope context 并区分 approved 与 Session-local 内容。该独立 context strip 只作为数据投影基础，第 8 阶段迁入紧凑 Agent dock。
- [x] 7.3 为实验命令结果实现可复用的命令专属卡片：创建 Project/Experiment、Knowledge retrieval、capability gap、Workflow/Plan proposal、Lab Skill validate/approve/activate、Run start/stop/retry 和 Result decision。卡片可在默认 Conversation 和 LABWEAVE Agent timeline 中使用，展示命令类型、结果、来源事件和参数；禁止用只显示命令名、状态文本和统一“打开工作台”按钮的通用卡片替代命令结果字段。
- [x] 7.4 为 durable Session nodes 实现可复用的 Workflow、Plan、Lab Skill、Run、Evidence、Replan、Result assessment 和 Report 卡片；卡片只渲染事件投影，需要审批或 Host 动作的按钮调用 typed adapter，详情和 citation 链接定位到对应工作台记录，并已通过生命周期节点组件与 Session slot 注册测试。LABWEAVE assembled timeline 的最终挂载由第 8 阶段验证。
- [x] 7.5 删除 `RequestStage` 目标/样本/约束表单；实验目标由现有 composer 提交，Agent 缺少输入时使用现有 ask-user interaction。
- [x] 7.6 实现客户端 presentation-intent consumer；fixture 中 Agent 可以把上方工作台定位到授权的 Knowledge、Experiment、Run、Evidence 和 citation，用户手动导航可覆盖，并测试非法目标拒绝。
- [x] 7.7 增加 context 不泄漏、跨 Session 继续 Experiment、卡片刷新重建、审批修订锁定、模型不可用、capability unavailable、replan diff 和 human-QC 测试。
- [x] 7.8 更新前端 event-replay snapshot，证明同一事件序列可以重建 Agent 卡片和工作台选择；真实模型与 Host 行为留到 10 阶段验证。

**阶段验收：** 同一 Session event projection 可在默认 Conversation 和 LABWEAVE Agent timeline 中重建完整生命周期卡片；LABWEAVE 最终只显示自己的紧凑 Agent 输入与可展开时间线，Agent 可以受控驱动工作台，用户始终可以手动覆盖。

## 8. 重构并冻结 LABWEAVE 原生视觉架构

**文件：** `packages/client/ui-layout/src/client/{AppFrame,AppFrame.module}.css*`、`packages/client/ui-lab-workbench/src/client/*`、`packages/client/ui-lab-knowledge-workspace/src/client/*`、对应 client tests、assembled browser fixtures 和视觉验收资产。

**保留基础：** `LabExperimentDetailView`、`LabRunDetailView`、`LabRunComparisonView`、`LabArtifactPreview`、`LabResultReportView`、`LabWorkflowView`、`LabSkillView`、现有 Session/input/timeline 能力和 typed presentation intent 均作为迁移输入。固定上下分屏、默认 Conversation 外壳、顶部大输入框、独立 context strip、相邻 Agent rail、平铺全局导航和通用统计卡片首屏不属于保留项。

- [x] 8.1 审计现有页面和 tests，将 Experiment、Run、Comparison、Artifact、Result、Workflow 与 Skill 组件分类为“保留并调整”，将固定上下分屏、通用统计卡片首屏、页面级硬编码主题和通用实验命令卡片分类为“替换或删除”；本清单记录唯一任务所有权，不把组件存在视为业务阶段完成。
- [x] 8.2 修复客户端构建阻断并协调 `TypertClientRemote` API、Host compiler face 文件集合和 JSX 设置，使仓库构建重新生成 `ui-lab-workbench/lib/client.js` 与 `apps/web/dist`；运行构建并记录产物 revision，聚焦包 typecheck 不能替代该验证。
- [ ] 8.3 为 laboratory 启动增加客户端产物新鲜度检查；启动前验证 `src/client`、`lib/client.js` 与 Web dist 对应当前来源，过期或缺失时执行所需构建或明确失败，并验证开发 watch/HMR 与一次性 build-and-start 路径。（源码指纹和一次性构建路径已完成；watch/HMR 仍需在浏览器验收环境中完成。）
- [ ] 8.4 在 `examples/lab-web` assembled composition 中验证实际提供的 `ui-lab-workbench/client.js` 包含当前 LABWEAVE shell 和本阶段布局；浏览器必须显示对应内容，新进程、根 HTML 或 HTTP 200 不能单独完成验证。
- [ ] 8.5 为 `ui-conversation` 定义可复用 presentation contract，使默认 Harness composition 与 LABWEAVE composition 共享 Session、input state machine、draft、queue、slash/reference/attachment、access/model、ask-user/approval takeover、timeline 和 node renderers。增加默认 profile 不变、LABWEAVE 只有一个 input DOM、draft 跨页面保留和 takeover 可操作的组合测试；禁止复制输入状态机、CSS 隐藏旧 composer 或绕过正式 submit 路径。
- [ ] 8.6 将侧栏重构为三个 LABWEAVE 分组：顶部全局执行监控；动态 Projects tree；配置中心。Projects tree 必须从 adapter records 渲染并反映 active Project、Run、failure 和 pending approval 状态；无 Project、loading、unavailable 和 rail 模式均可操作。
- [x] 8.7 将每个 Project 展开为生命周期目的地：Overview、Planning/Workflow、Plan approval、Execution monitoring、Step orchestration、Results/Evidence 和 Archive。扩展 `LabUiContext` 的 destination union 并建立 record-to-destination 映射；Conversations 只作为 Session provenance 入口，不得继续作为一级项目标签。
- [ ] 8.8 实现 LABWEAVE-owned `LabAgentSurface`：默认只显示底部紧凑输入 dock、当前 Project/Experiment/Run context、运行状态和展开时间线动作；展开后复用完整 Agent timeline、命令卡片、node 卡片、ask-user 和 approval takeover。移除默认 hero/header/context strip/大输入框的 LABWEAVE 可见组合；宽屏不得让 Agent 占据独立永久列。
- [x] 8.9 实现全局执行监控页和侧栏摘要，聚合各 Project 的 active Run、当前步骤、失败和 pending approval，并可跳转到授权 Project destination。该能力只做状态投影和导航，不实现跨 Project 调度、资源分配或批量执行。聚合复用 Host 已提供的 `project-list` 与 `run-list` 查询，未提供的细节保持明确 unavailable。
- [ ] 8.10 实现配置中心目的地：Knowledge、Agent、Workflow/Lab Skill、Devices、People/permissions。Knowledge 保持独立 Provider 和 app view 所有权；其他目的地只消费真实注册能力。People/permissions 在无对应能力时显示明确 unavailable 或 read-only，不得创建样例用户、角色或授权结论。
- [ ] 8.11 将 Project Overview 改为实验生命周期与待处理动作优先的工作区，展示目标理解、资料确认、Workflow、批准、执行、QC 和报告状态；统计数据降为辅助信息，不得用通用 KPI 卡片网格代替当前阶段、关键路径、异常和人工确认。
- [ ] 8.12 冻结 Agent 与工作台的双向定位：Agent command/node card 可打开 Project、Knowledge、Workflow、approval、Run、step、Evidence、Result 或 citation；用户选择步骤、Artifact 或 verdict 可定位到产生该记录的 Session node。定位使用 typed presentation intent 和 `LabUiContext`，不得增加 DOM、任意 URL 或浏览器事件接口。
- [ ] 8.13 建立统一视觉系统和响应式规则，统一 sidebar、monitor、Project destinations、configuration、Agent dock、timeline、Workflow、Run 和 Evidence 的色彩、排版、间距、状态、焦点和密度。桌面保持工作台完整可滚动且不被 Agent dock 遮挡；窄桌面和平板使用明确 pane/overlay，禁止整页被内部双滚动区域截断。
- [ ] 8.14 将保留组件迁入新的生命周期目的地，删除固定上下分屏、相邻 Agent rail、旧 Overview 卡片网格、平铺 Projects/Knowledge/Devices 导航和完成命令专属卡片后不再使用的通用实验卡片。不得伪造第 9 阶段尚未接通的字段或 Host 动作，并通过组件清单、无死入口和单输入断言。
- [ ] 8.15 在桌面、窄桌面和平板上完成真实 assembled 页面截图与交互审查，验证默认打开 Project Overview、项目选择同步到工作台与 Agent context、侧栏展开、Agent dock/timeline、审批、Run 状态、Evidence、主滚动容器和键盘焦点。保存证据并更新 proposed Agent Note 的最终布局决定。

**阶段验收：** 浏览器提供当前构建的单一 LABWEAVE 应用。宽屏完整显示中央生命周期工作台和底部紧凑 Agent dock，不显示原始大输入框、默认 Conversation 页面或永久 Agent rail；侧栏包含全局执行监控、动态 Project tree 和配置中心；Project 默认打开 Overview，并与 Agent context、Experiment 和 Run selection 同步；全页滚动、展开时间线和键盘操作不遮挡内容。第 9 阶段可以在不改变布局、导航和 Agent presentation contract 的情况下补全详情。

## 9. 完成 Workflow、Experiment、Run、Evidence、判定和报告工作台

**文件：** `packages/client/ui-lab-workbench/src/client/{experiments,runs,evidence}/*`、`ui-primitives`/`ui-attachment` 复用点和 tests。

- [ ] 9.1 在 Project 的 Planning/Workflow 和 Plan approval destinations 中补全 Experiment list/detail，保留现有 `LabExperimentDetailView` 基础并展示目标、状态、创建/关联 Sessions、派生来源、Runs、Result assessment 和 Evidence；嵌入 Workflow、Plan 与 Lab Skill revision 详情，并通过 list/detail component tests 验证摘要不能替代详情。
- [ ] 9.2 在 Execution monitoring 和 Step orchestration destinations 中补全 Run list/detail 的 Overview、resolved Parameters、Steps/ExecutionGraph、Evidence、Logs、Timeline 和 Result，保留现有 `LabRunDetailView` 基础；显示当前步骤、依赖和等待原因，严格按 Run 与审批状态启用 typed actions，并通过状态矩阵测试。
- [ ] 9.3 补全失败 Run retry 和 Run comparison，保留现有 comparison 组件并显示 `retryOfRunId`；只允许同一 Experiment 的两个终态 Run，比较参数、状态、耗时、Observation 和 Artifact metadata，并通过跨 Experiment、非终态和字段差异测试。
- [ ] 9.4 在 Results/Evidence destination 中补全 Evidence/Artifact 分组和安全文本、JSON、图片预览；页面保存并渲染 `artifact-open` 返回的授权预览，打开和下载只通过 adapter 动作，unsupported/unavailable 状态保留 metadata 和可执行动作，并通过预览状态测试。
- [ ] 9.5 在 Results/Evidence 和 Archive destinations 中补全结构化 Result assessment、报告和不可变溯源，在报告内部保留 criteria、method、verdict、Plan/Skill revision、Run、Observation、Artifact、actor、timestamp 和 citation 链接；模糊或高风险结果显示 human-QC 操作，并通过追溯链接和审批状态测试。
- [ ] 9.6 补全配置中心的 Agent、Workflow/Lab Skill 和 Devices 详情，只展示 adapter 提供的注册能力、版本、状态与允许动作；无写能力时保持 read-only，People/permissions 继续遵守第 8 阶段的真实性限制。
- [ ] 9.7 增加 assembled browser tests，覆盖 Project lifecycle destinations、空态、失败态、等待态、重规划差异、并发冲突、Artifact 不支持预览、Run 比较、结果判定、报告引用跳转和配置能力 unavailable；独立 jsdom 组件测试只保留为组件覆盖，不能完成本任务。

**阶段验收：** 前端 fixture journey 可从一句目标连续展示 Workflow/Skill 提案、步骤执行、异常重规划、两个 Run 比较、结果判定和报告；每条关键结果可返回 Run/Artifact 来源，Agent 在第 8 阶段冻结的布局中始终可交互。
## 10. 将完成的前端连接到 Host、Agent 与 Runtime

**文件：** `packages/experimental/lab-mvp-web/`、Agent tool Consumers、Session event/node projections、`packages/experimental/lab-mvp/`、deterministic Provider packages、`examples/lab-web/cordis.patch.yml`、snapshots。

- [ ] 10.1 实现 `LabWorkbenchAdapter` 的 Host 版本，将第 5–9 阶段组件接到 typed Facade；删除生产 composition 中的 fixture adapter，运行同一套 adapter contract tests。LABWEAVE Agent surface 必须绑定真实 Harness Session 和输入状态机，不得增加专用消息传输。
- [ ] 10.2 完成 Project、Experiment、Workflow/Plan、Lab Skill、Run、Evidence、Result assessment、report、全局 monitor summary 和配置 capability summary 的窄查询与动作命令；刷新后从 Host records 重建侧栏、工作台和 Agent context。
- [ ] 10.3 将 Agent 工具改为先提出 Experiment、Plan 和 Lab Skill draft，再由人类确认创建、批准或激活；模型可见 Project scope、capability results 和 validation findings 全部写入 Session events。
- [ ] 10.4 接入 Runtime step、device receipt、approval、observation、Artifact 和 verdict 事件；事件同时更新 Agent 时间线和工作台，Agent 不能直接推进步骤、提交设备命令或写入 verdict。
- [ ] 10.5 实现 Host-validated presentation intent Consumer，并验证 Agent 只能打开已注册且属于当前 Project 的视图；用户手动导航和拒绝状态进入 Session evidence。
- [ ] 10.6 通过 Host 授权文件操作把 Workflow/Skill 文档、配置快照、中间资产和报告写入 Project Workspace；拒绝浏览器或模型提供的越界绝对路径。
- [ ] 10.7 将浏览器 `createLocalPlan()` 移到 Host 侧 deterministic planning Provider；deterministic Knowledge、mock device、Runtime 和 result assessor 通过固定 Provider 配置走正常 Agent proposal、approval、Session event 和 Runtime 路径。
- [ ] 10.8 real profile 在配置 DeepSeek 和 Docling 时替换 Provider，不改变页面、按钮、adapter 或数据模型；缺失条件明确 skipped/unavailable，不回退到 fixture 或 demo 结果。
- [ ] 10.9 增加 Host composed tests 和 keyless snapshots，覆盖 goal→clarification→source/citation→capability→Workflow/Skill/Plan→approval→Run→replan→Artifact→verdict→report，并断言侧栏 Project 状态、monitor summary、workbench selection 和 Agent timeline 来自同一 Host identities 和 Session events。

**阶段验收：** 停用前端 fixture 后，同一界面可由 Host 数据完整驱动；清空本地 lab 数据后，无模型密钥仍能经过真实命令和事件完成流程，刷新后不丢失，配置真实 Provider 时无需修改前端。

## 11. 完成单应用浏览器验收和展示交付

**文件：** `examples/lab-web/`、浏览器 e2e、用户文档、截图/GIF 资产；不把独立 HTML 加入产品导航。

- [ ] 11.1 增加仓库级 `demo:lab-web` 启动脚本，复用 8.3 的客户端产物新鲜度检查并处理构建前置和 profile patch；文档命令必须从仓库根目录在 Node 24 下成功，且不得在源码更新后继续提供旧 client bundle。
- [ ] 11.2 增加真实浏览器 e2e：首次打开默认进入 Project Overview；无 Session 时选择 Workspace、创建 Project/Session；在底部唯一 LABWEAVE Agent input 提交目标；Agent 补问；从配置中心导入/检索 Knowledge；选择或生成 Skill；创建/批准 Workflow/Plan；运行；触发一次异常重规划；确认 Result/Evidence 并打开报告。断言页面不存在默认 Conversation 大输入框或第二个 text area。
- [ ] 11.3 e2e 在全局 monitor、Project tree、Knowledge、Agent timeline、Workflow、approval、Experiment、Run、Evidence 和 Result destinations 断言同一组 Host ID；验证 Agent presentation intent 驱动工作区，并在用户覆盖导航、刷新和 Session 切换后再次断言。
- [ ] 11.4 增加模型不可用、Knowledge 失败、Workspace unavailable、Run 失败和 capability unload 恢复场景；不得以静态截图代替行为断言。
- [ ] 11.5 在桌面、窄桌面/平板和纯键盘路径运行可访问性验证；修复 sidebar tree、Agent dock/timeline overlay、pane switch、主滚动容器、焦点、语义名称、返回路径和主操作裁剪问题。
- [ ] 11.6 重写 `SHOWCASE.md`/`SHOWCASE.zh.md`，仅描述已经由 e2e 证明的五至十分钟流程；保存稳定截图或 GIF。
- [ ] 11.7 运行聚焦测试、keyless snapshot、TS/Python SDK projections、typecheck、build、hygiene、doc-sync、website build、OpenSpec strict validation 和 `git diff --check`，记录实际命令。
- [ ] 11.8 使用 `openspec-verify-change` 逐项映射当前全部 requirements 和 scenarios；重点核对 Agent 全生命周期、typed navigation、Workspace 文件根、前端 fixture 隔离和 Host reload，无 CRITICAL/WARNING 后才归档。

**最终 DoD：** 一个命令启动一个 Harness 应用；默认进入 LABWEAVE Project Overview；侧栏提供全局执行监控、动态 Project tree 和配置中心；一个 Harness Agent 通过底部唯一输入和可展开时间线贯穿目标补问、知识与能力检索、Workflow/Skill/Plan 生成、审批、执行监控、异常重规划、结果判定和报告；不显示默认 Conversation 大输入框、第二输入 DOM 或永久 Agent rail；工作台同步展示并允许配置与人工确认，Agent 可以受控驱动其导航；所有响应式模式使用同一 Session、draft 和上下文；Project/Experiment/Run/Evidence/verdict 由 Host 持久化，项目文件只写入授权 Workspace；无模型密钥与真实 Provider 使用同一界面和事件链路。
