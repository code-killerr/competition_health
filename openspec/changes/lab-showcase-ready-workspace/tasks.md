# Luna 开发任务清单

执行者必须先阅读 [proposal.md](proposal.md)、[design.md](design.md)、四份 capability spec 和 [详细实施计划](../../../docs/change_plan/superpowers/2026-08-28-lab-showcase-ready-workspace-implementation-plan.md)。任务按编号顺序执行；每个阶段的验证未通过时不得开始下一阶段。不得继续扩展现有 `conversation.view` 整页工作台，不得使用 `sidebar.footer.action`、`window` 事件、哈希路由、浏览器生成的 Project/Experiment ID 或浏览器专属业务数据完成产品流程。

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
- [x] 1.3 在 `AppFrame` 声明并渲染 `app.view`，使用 slot entry ID 选择唯一页面；隐藏页面不得卸载 Conversation，避免输入草稿和 Session 状态丢失。
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
- [x] 2.6 创建 Project Session 时通过现有 Workspace/Session Host 服务在 Project Workspace 下创建真实 Session；打开 Session 后 `ui-layout.closeAppView()` 返回现有 Conversation。
- [x] 2.7 更新 `project-create`、`project-session-attach`、`project-session-detach`、`project-archive` 协议和 Facade；解析器拒绝浏览器提交的 Project ID。
- [ ] 2.8 为创建、Workspace 缺失、cwd 冲突、attach、detach、归档但保留 Session 日志增加领域、协议和组合测试；同步 Session events 和两个 SDK 投影。

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
- [ ] 3.8 为派生 Experiment、跨 Session 继续、Session 关闭后 Run 存续、失败重试、并发 Run 拒绝、Artifact 完整性增加聚焦测试。

### 3 阶段检查点

- Node 24.19 下 lab-domain、lab-runtime、lab-runtime-local、lab-mvp-web 和 tool-lab 类型检查通过。
- 相关组合测试 13 个文件、52 个测试通过，覆盖 Experiment 派生与跨 Project 拒绝、Session provenance、SQLite 恢复、旧单 Run 载荷拒绝、终态 Run 重试和非终态 Run 冲突；Artifact 目前只有空清单完整性覆盖，不能作为非空 Artifact 产出的完成证据。
- Runtime 权威状态使用 version 2；Run 以有序数组保存，SQLite 主键维持 Experiment 索引，旧 `run` 字段载荷在恢复时 fail loud。
- 浏览器和 Tool 只能提交 Experiment/Plan/Session 等引用；Artifact manifest 由 Host 侧 Runtime 产生，当前 Provider 不开放任意路径登记。

**阶段验收：** Project 可持有多个 Experiment；同一 Experiment 可保留多个终态 Run，Session 关闭后 Runtime 仍可通过 Run ID 查询和恢复。

**阶段验收：** 一个 Project 可创建两个 Experiment；同一 Experiment 可保留两个终态 Run；关闭启动 Session 后仍可从 Project 查询 Run 和 Artifact。

## 4. 将 Web Facade 改为面向页面的 typed commands

**文件：** `packages/experimental/lab-mvp-web/src/{protocol,project-protocol,index,http}.ts`、对应 tests、`packages/client/ui-lab-workbench/src/client/api/*`。

**接口：** 页面按列表、详情和动作命令读取 typed records；删除需要默认 `experiment-1` 的全局 snapshot；保留 JSON 边界验证，浏览器内部不使用 `unknown` 记录驱动主要 UI。

- [ ] 4.1 将 Facade 拆分为 Project、Experiment、Run、Evidence/Artifact、Knowledge scope 命令组，并为每个 result 定义明确的 serializable view type。
- [x] 4.2 增加 Project list/open/archive、Experiment list/open/create/derive/link、Run list/open/start/stop/retry/compare、Artifact list/open metadata 命令。
- [ ] 4.3 将 `snapshot(experimentId)` 替换为页面需要的窄查询；报告按 Run ID 构建，Run 查询不得再通过 Experiment 隐式选择“当前 Run”。
- [ ] 4.4 为 Project source/device 选择返回 ready/unavailable 状态和稳定错误码；Knowledge 页面不得解析错误字符串决定行为。
- [ ] 4.5 将 Agent 工具改为先提出 Experiment/Plan，再由人类确认创建或批准；模型可见 Project scope 必须有对应 Session event。
- [ ] 4.6 为全部命令增加 parser、Facade、HTTP 和 assembled composition 测试，覆盖错误码、跨 Project 隔离和 capability 缺失。

**阶段验收：** 客户端 `api` 层不再包含 `toSnapshot()`、默认 Experiment ID 或 `Record<string, unknown>` 页面模型。

## 5. 将实验前端拆成 Harness 页面贡献和对话贡献

**文件：** 重构 `packages/client/ui-lab-workbench/src/client/`；删除 `LabNavigation.tsx`、整页 `LabWorkbench.tsx` 和旧 `store.ts` 职责；新增 `navigation/`、`projects/`、`experiments/`、`runs/`、`evidence/`、`conversation/`、`state/` 目录及对应 tests。

**接口：** `LabUiContext` 只保存 presentation selection（active Project ID、Project subpage、active Experiment ID），业务记录每次从 Facade/Host 加载；Projects/Devices 注册 `app.view`，全局入口注册 `sidebar.navigation`。

- [x] 5.1 建立 `LabUiContext` observable service，提供 `selectProject`、`selectExperiment`、`openProjectPage`、`snapshot/subscribe`；禁止保存 Project、Run、Evidence 的浏览器权威副本。
- [ ] 5.2 实现 `LabGlobalNavigation`，通过 `ctx.layout.openAppView()` 打开 Projects、Knowledge、Devices；删除 `lab:navigate` 事件和 footer 注册。
- [x] 5.3 实现 Project list/create 页面，复用全局 Workspace records 和 Host create action，不自行实现目录输入；创建成功后使用 Host 返回 ID 选中 Project。
- [ ] 5.4 实现 Project shell 和 Overview、Experiments、Runs、Evidence 子页面；Conversations tab 只列真实 Session，点击后调用 `ctx.sessions.open()` 并关闭 app view。
- [ ] 5.5 实现 Workspace unavailable、loading、empty、permission denied、provider unavailable 状态；每个状态只显示当前可执行动作。
- [ ] 5.6 删除 Project/Experiment 手输 ID、设备逗号输入、七阶段映射、主流程 `JsonPreview` 和浏览器构造业务 ID；诊断 JSON 仅保留在明确折叠的开发区域。
- [ ] 5.7 将可见文案全部迁入 locale dictionaries，删除 `Knowledge procedure`、`SOP has no step`、`device-1` 等可见硬编码；补齐中英文。
- [ ] 5.8 增加无 Session 导航、Project 创建、跨页状态、返回 Conversation、刷新恢复、rail/wide、窄视口和键盘测试。

**阶段验收：** 从全新首页无需 Session 可打开 Projects；创建 Project 后可进入 Overview；打开 Conversation 后显示原 Harness 聊天，不出现第二套实验目标表单。

## 6. 将 Knowledge 和 Devices 变成独立 application views

**文件：** `packages/client/ui-lab-knowledge-workspace/src/client/`、`packages/client/ui-lab-workbench/src/client/devices/`、对应 tests 与 package manifests。

- [ ] 6.1 让 Knowledge 插件直接注册 `app.view` ID `lab-knowledge`，删除 `lab.knowledge.workspace` 子 slot 和对 `ui-lab-workbench` 组件类型的依赖。
- [ ] 6.2 通过 `LabUiContext` 的只读 observable 获得 active Project ID；无 Project 时允许导入/检索，但隐藏或禁用“加入 Project”并提供打开 Projects 的动作。
- [ ] 6.3 保留文件导入、READY 状态、失败重试、检索、引用确认、SOP 审阅发布；来源选择只使用 Host records，不显示要求用户复制的 opaque ID。
- [ ] 6.4 实现 Citation link：从 Plan、Conversation、Report 打开 Knowledge view 并定位 source/version/location；Knowledge unavailable 时保留引用信息。
- [ ] 6.5 实现 Devices application view，以可选设备记录替代逗号分隔 ID；明确 deterministic/mock/real/unavailable 状态。
- [ ] 6.6 增加 Knowledge 独立启动、无 Session、无 Project、READY/FAILED、引用跳转和 Devices scope 组合测试。

**阶段验收：** Knowledge 和 Devices 均可从全新首页打开；加入 Project 后在 Conversation context strip 中立即反映数量变化。

## 7. 把实验规划、审批和运行状态嵌入真实 Conversation

**文件：** `packages/client/ui-lab-workbench/src/client/conversation/*`、Session event/node projection、`ui-conversation` 公共 slots 的消费者测试。

- [ ] 7.1 在 `conversation.session.header.actions` 注册 Project/Experiment 标识与“返回 Project”动作，不替换 Session header。
- [ ] 7.2 在 `conversation.input.dock` 注册上下文条，显示 Project、Workspace、Experiment、Knowledge、Devices 和临时附件；未批准和 Session-local 内容必须分组标识。
- [ ] 7.3 为实验命令结果注册 `conversation.chat.commandview` 卡片：创建 Project、创建 Experiment、Plan validate/approve/reject、Run start/stop/retry。
- [ ] 7.4 为 durable Session nodes 注册 Plan、Run、Evidence 卡片；卡片只渲染事件投影，按钮调用 typed Facade 并链接 Project application view。
- [ ] 7.5 删除 `RequestStage` 目标/样本/约束表单；实验目标由现有 composer 提交，Agent 缺少输入时使用现有 ask-user interaction。
- [ ] 7.6 增加 context 不泄漏、跨 Session 继续 Experiment、卡片刷新重建、审批修订锁定、模型不可用和 capability unavailable 测试。
- [ ] 7.7 更新 keyless runnable snapshot，证明模型可见上下文、审批、Run 和报告均可从 Session 日志重建。

**阶段验收：** 用户只在一个 composer 中描述实验；Agent 提案、审批和 Run 状态出现在同一聊天时间线；详情从卡片打开 Project 页面。

## 8. 完成 Experiment、Run、Evidence 和报告页面

**文件：** `packages/client/ui-lab-workbench/src/client/{experiments,runs,evidence}/*`、`ui-primitives`/`ui-attachment` 复用点和 tests。

- [ ] 8.1 实现 Experiment list/detail，展示目标、状态、创建/关联 Sessions、派生来源、Plan revisions、Runs 和 Evidence。
- [ ] 8.2 实现 Run list/detail，分为 Overview、Parameters、Steps、Evidence、Logs、Timeline；动作按 Run 状态和审批状态启用。
- [ ] 8.3 实现失败 Run retry，新 Run 显示 `retryOfRunId`；实现同一 Experiment 两个终态 Run 的参数、状态、耗时、观察和 Artifact metadata 比较。
- [ ] 8.4 实现 Evidence/Artifact 分组和安全文本、JSON、图片预览；打开/下载只通过 Host 授权动作。
- [ ] 8.5 实现结构化报告，保留 Plan revision、Run、Observation、Artifact、actor 和 timestamp 链接；禁止把 raw JSON 作为报告主视图。
- [ ] 8.6 增加空态、失败态、并发冲突、Artifact 不支持预览、Run 比较和报告引用跳转浏览器测试。

**阶段验收：** 一个 Experiment 的两个 Run 可分别打开和比较；报告中的每条关键结果可返回 Run/Artifact 来源。

## 9. 构建真实链路上的 keyless 演示模式

**文件：** `packages/experimental/lab-mvp/`、deterministic Provider packages、`examples/lab-web/cordis.patch.yml`、fixtures 和 snapshots。

- [ ] 9.1 将浏览器 `createLocalPlan()` 移到 Host 侧 deterministic planning Provider；Provider 输入是 Project-approved citations 和 Experiment request，输出走正常 Plan proposal/Session event 路径。
- [ ] 9.2 deterministic Knowledge fixture、mock device 和 Runtime 使用固定 Provider 配置；UI 只根据 Provider metadata 标记 Demo/Mock，不根据缺少 API key 猜测。
- [ ] 9.3 keyless profile 不自动写入浏览器假记录；启动后通过真实命令创建 Project、Experiment、Plan、Run、Artifact 和报告。
- [ ] 9.4 real profile 在配置 DeepSeek 和 Docling 时替换 Provider，不改变任何页面、按钮或数据模型；缺失条件明确 skipped/unavailable，不回退到 demo 结果。
- [ ] 9.5 增加 Host composed test 和 keyless snapshot，覆盖 source→citation→Experiment→Plan→approval→Run→Artifact→report。

**阶段验收：** 清空本地 lab 数据后，无模型密钥仍可完成实验流程；所有记录可从 Host 重载，页面刷新不丢失。

## 10. 完成单应用浏览器验收和展示交付

**文件：** `examples/lab-web/`、浏览器 e2e、用户文档、截图/GIF 资产；不把独立 HTML 加入产品导航。

- [ ] 10.1 增加仓库级 `demo:lab-web` 启动脚本，处理构建前置和 profile patch；文档命令必须从仓库根目录在 Node 24 下成功。
- [ ] 10.2 增加真实浏览器 e2e：无 Session 打开 Projects、选择 Workspace、创建 Project/Session、在 composer 提交目标、导入 Knowledge、创建/批准 Plan、运行、确认 Evidence、打开报告。
- [ ] 10.3 e2e 在 Projects、Knowledge、Conversation、Experiment、Run、Evidence 页面断言同一组 Host ID，并在刷新和 Session 切换后再次断言。
- [ ] 10.4 增加模型不可用、Knowledge 失败、Workspace unavailable、Run 失败和 capability unload 恢复场景；不得以静态截图代替行为断言。
- [ ] 10.5 在桌面、窄桌面/平板和纯键盘路径运行可访问性验证；修复焦点、语义名称、返回路径和主操作裁剪问题。
- [ ] 10.6 重写 `SHOWCASE.md`/`SHOWCASE.zh.md`，仅描述已经由 e2e 证明的五至十分钟流程；保存稳定截图或 GIF。
- [ ] 10.7 运行聚焦测试、keyless snapshot、TS/Python SDK projections、typecheck、build、hygiene、doc-sync、website build、OpenSpec strict validation 和 `git diff --check`，记录实际命令。
- [ ] 10.8 使用 `openspec-verify-change` 逐项映射 19 个 requirements 和全部 scenarios；无 CRITICAL/WARNING 后才归档。

**最终 DoD：** 一个命令启动一个 Harness 应用；无 Session 可进入实验产品；一个 composer 完成规划；Project/Experiment/Run/Evidence 由 Host 持久化；无模型密钥可完成有引用、有审批、有执行、有 Artifact、有报告的实验；真实 Provider 使用同一界面。
