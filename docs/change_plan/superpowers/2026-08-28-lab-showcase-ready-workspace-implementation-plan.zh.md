# 实验展示工作区落地实施计划

[English](2026-08-28-lab-showcase-ready-workspace-implementation-plan.md) | 中文

> **供 Agent 开发者使用：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 执行本计划。步骤使用 checkbox（`- [ ]`）跟踪。

**目标：** 构建一个 DeepSeek Harness 应用，使 Projects、Knowledge、Devices、Conversation、Experiments、Runs、Evidence 和报告共享 Host 记录，并跑通完整的无模型实验流程。

**架构：** 在现有 Harness 壳上增加通用的根应用视图注册表和追加式侧边栏导航区域。保持已交付的 Conversation 持续挂载并作为唯一聊天实现，通过公开 slot 展示实验上下文和生命周期记录，将 Project、Experiment、Run 和 Artifact 的归属迁移到 Host 服务。

**技术栈：** TypeScript 6、React 18、Cordis 插件、`dsh.client` slot runtime、Typert/JSON Web Facade、Session event logs、storage-domain 持久化、SQLite Runtime Provider、Vitest、keyless snapshots 和浏览器验收测试。

**规格：** [OpenSpec 设计](../../../openspec/changes/lab-showcase-ready-workspace/design.md)、[需求](../../../openspec/changes/lab-showcase-ready-workspace/specs/) 和[跟踪任务](../../../openspec/changes/lab-showcase-ready-workspace/tasks.md)。

## 全局约束

- 所有本地命令使用 Node 24。
- 保持 `examples/lab-web` 为唯一产品原型入口，保持默认 Web profile 不变。
- 保留现有 `conversation`、`sidebar`、`workspace`、`details`、theme、trajectory 和 attachment 的 owner；只增加已记录的子 slot 和服务方法。
- 实验导航不得使用 `sidebar.footer.action`、`window` 自定义事件、URL hash、第二个 composer 或第二套应用壳。
- Project、Experiment、Run 和 Artifact ID 由各自的 Host 服务生成，并在包边界保持 branded 类型。
- 所有对模型可见的内容都必须能从 Session events 重建；新增 Session event 成员时同步更新 TypeScript 和 Python SDK projection。
- UI 文案放在 locale dictionaries 中。keyless UI 要标记 deterministic 和 mock Provider，不得把它们展示为生产能力。
- raw JSON 只能通过明确的诊断入口访问；表格、卡片和详情面板是主要表现形式。
- 每个非简单实现批次都要更新 proposed Agent Note、受影响的 README/JSDoc，并在用户或模型可见行为变化时增加真实可运行的 keyless snapshot。
- 服务和协议使用聚焦行为测试。孤立 CSS 或文案修改不增加 TDD 仪式，但每个新的共享接口都必须先有失败的契约测试。

## 目标文件结构

计划保留现有包，并在包内分离职责。

```text
packages/client/ui-layout/src/client/
  service.ts                 application-view and panel action service
  stores.ts                  presentation-only layout state
  AppFrame.tsx               conversation/app-view center switch

packages/client/ui-sidebar/src/client/
  contract/slots.ts          sidebar.navigation owner contract
  SidebarRoot.tsx            primary navigation render location

packages/client/ui-lab-workbench/src/client/
  index.ts                   plugin registration only
  api/                       typed Facade client and error mapping
  state/LabUiContext.ts      active Project/Experiment presentation selection
  navigation/               global laboratory navigation
  projects/                 list, create, overview and conversations
  experiments/              list and detail
  runs/                     list, detail and comparison
  evidence/                 Artifact and report views
  devices/                  device selection application view
  conversation/             context strip and durable record cards

packages/client/ui-lab-knowledge-workspace/src/client/
  index.ts                   direct app.view registration
  KnowledgeWorkspace.tsx     import, retrieval, source selection and SOP

packages/experimental/
  lab-domain/                branded records and Session event declarations
  lab-project/               Project, Experiment and Session-link authority
  lab-runtime/               Run and Artifact service definition
  lab-runtime-local/         SQLite Runtime Provider
  lab-mvp-web/               typed browser Facade
  lab-mvp/                   keyless/real composition
```

## 任务 1：增加根应用视图和侧边栏一级导航

**文件：**

- 修改：`packages/client/ui-layout/src/client/service.ts`
- 修改：`packages/client/ui-layout/src/client/stores.ts`
- 修改：`packages/client/ui-layout/src/client/index.ts`
- 修改：`packages/client/ui-layout/src/client/AppFrame.tsx`
- 修改：`packages/client/ui-layout/src/client/AppFrame.module.css`
- 修改：`packages/client/ui-sidebar/src/client/contract/slots.ts`
- 修改：`packages/client/ui-sidebar/src/client/index.ts`
- 修改：`packages/client/ui-sidebar/src/client/SidebarRoot.tsx`
- 测试：`packages/client/ui-layout/tests/app-view.client.spec.tsx`
- 测试：`packages/client/ui-sidebar/tests/primary-navigation.client.spec.tsx`

**接口：**

- 消费：现有根级 `conversation`、`sidebar`、`details` 和 `shell.overlay` slots。
- 产出：

```text
interface ILayout {
  toggleSidebar(): void
  openDetails(): void
  closeDetails(): void
  openAppView(viewId: string): void
  closeAppView(): void
  activeAppView(): string | undefined
}

SlotMap['app.view'] = { kind: 'list'; scope: 'root' }
SlotMap['sidebar.navigation'] = {
  kind: 'list'
  scope: 'root'
  owner: { wide: boolean; expandSidebar: () => void }
}
```

`openAppView()` 检查实时的 `app.view` slot ledger；未知 ID 抛出 `APP_VIEW_NOT_FOUND` 诊断。被选中的 entry 注销后，layout 清除选择并显示 Conversation。

- [ ] 编写 `app-view.client.spec.tsx`：注册 `app.view` ID `test-page`，无当前 Session 时打开它，断言页面可见，关闭后断言 Conversation 可见且 React identity 不变。
- [ ] 运行 layout 测试，确认当前因不存在 `ILayout.openAppView` 和 `app.view` 而失败。
- [ ] 在 layout store 中增加 `activeAppViewId?: string` 和 `setActiveAppView()`；将操作接到 `LayoutController`，不把 Session selection 移入 layout state。
- [ ] 为根注册增加 `app.view` 子声明，在固定中心列容器中渲染 Conversation 和选中的 app view。非活动容器使用 hidden/inert 展示状态，不条件卸载。
- [ ] 编写 sidebar 测试，断言 wide 和 rail 模式下 `sidebar.navigation` 位于 New Session 与 `sidebar.workspaces` 之间。
- [ ] 在 `SidebarRoot` 增加 seat；只传递 `wide` 和 `expandSidebar`，保持 Settings/footer 行为不变。
- [ ] 运行 `ui-layout` 和 `ui-sidebar` 聚焦测试；新测试通过，原有 panel、collapse、settings 和 Workspace browser 测试保持通过。
- [ ] 更新包契约和 proposed architecture Agent Note。
- [ ] 提交：`feat(client): add root application navigation slots`。

## 任务 2：明确 Workspace 到 Project 的归属

**文件：**

- 修改：`packages/experimental/lab-domain/src/project.ts`
- 修改：`packages/experimental/lab-project/src/index.ts`
- 修改：`packages/experimental/lab-project/tests/service.spec.ts`
- 修改：`packages/experimental/lab-mvp-web/src/project-protocol.ts`
- 修改：`packages/experimental/lab-mvp-web/src/index.ts`
- 修改：对应的协议和 Facade 测试

**接口：**

- 消费：权威 Host `WorkspaceView`、Session cwd 和 Session 创建 API。
- 产出：

```text
interface LabProject {
  projectId: LabProjectId
  workspaceId: WorkspaceId
  name: string
  description: string
  status: 'ACTIVE' | 'ARCHIVED'
  createdAt: number
  updatedAt: number
}

interface CreateLabProjectRequest {
  workspaceId: WorkspaceId
  name: string
  description?: string
  createdBy: SessionId
}

type AttachSessionResult =
  | { status: 'attached'; project: LabProjectView }
  | { status: 'cwd-mismatch'; projectWorkspaceId: WorkspaceId; sessionWorkspaceId?: WorkspaceId }
```

- [ ] 编写失败服务测试：Project 创建返回生成的 ID，持久化 `workspaceId`，拒绝不存在的 Workspace，并拒绝调用方提供 Project ID。
- [ ] 编写失败 attach 测试：覆盖 cwd 匹配、不匹配、detach 和 Project archive，同时保留 Session logs。
- [ ] 扩展 Project 记录和存储 schema，将 `lab_projects` Domain version 提升到 2，并增加 unsupported-version fixture 测试。
- [ ] 复用同类 Host-owned 记录使用的仓库 ID generator；ID 生成必须在 `LabProjectService.create()` 内部完成。
- [ ] 从 Host 记录解析 Workspace membership；返回 `cwd-mismatch` 时不得调用任何 Session cwd mutation。
- [ ] 将 `project-create` JSON 改为 `{ command, workspaceId, name, description?, sessionId? }`；将 `projectId` 字段作为不支持输入拒绝。
- [ ] 增加带 typed result 和稳定错误的 `project-session-attach`、`project-session-detach` 和 `project-archive` 命令。
- [ ] 当 Project Session events 或持久化 Session 记录对模型可见时，更新两个 SDK 的 expected outputs。
- [ ] 运行 lab-domain、lab-project、lab-mvp-web 和 SDK projection 检查。
- [ ] 提交：`feat(lab): bind projects to host workspaces`。

## 任务 3：增加持久化 Experiment 和 Session 来源关系

**文件：**

- 修改：`packages/experimental/lab-domain/src/project.ts`
- 修改：`packages/experimental/lab-domain/src/types.ts`
- 修改：`packages/experimental/lab-project/src/index.ts`
- 修改：`packages/experimental/lab-project/tests/service.spec.ts`
- 修改：Session event 声明和 SDK projections

**接口：**

```text
interface LabExperimentRecord {
  experimentId: ExperimentId
  projectId: LabProjectId
  title: string
  objective: string
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  createdInSessionId: SessionId
  derivedFromExperimentId?: ExperimentId
  createdAt: number
  updatedAt: number
}

interface SessionExperimentLink {
  projectId: LabProjectId
  experimentId: ExperimentId
  sessionId: SessionId
  role: 'created' | 'continued' | 'reviewed'
  linkedAt: number
}
```

- [ ] 为生成的 Experiment identity、derived Experiment provenance、第二个 Project Session continuation 和跨 Project link rejection 编写失败测试。
- [ ] 将 Experiment 和 Session-link 数组加入 Project Domain version 2 schema 和内存状态。
- [ ] 增加 `createExperiment`、`deriveExperiment`、`linkSession`、`listExperiments` 和 `openExperiment` 方法；在 `createExperiment` 和 `deriveExperiment` 内生成 ID。
- [ ] 对影响 Conversation context 的创建和关系变更追加 Session events；适合的 projection-only 记录标记为可重建。
- [ ] 验证关闭或归档创建 Experiment 的 Session 不会删除 Experiment。
- [ ] 运行服务、存储和 SDK projection 测试。
- [ ] 提交：`feat(lab): persist project experiments`。

## 任务 4：用 Run 和 Artifact 历史替换单 Run Runtime 状态

**文件：**

- 修改：`packages/experimental/lab-runtime/src/types.ts`
- 修改：`packages/experimental/lab-runtime/src/index.ts`
- 修改：`packages/experimental/lab-runtime-local/src/index.ts`
- 修改：`packages/experimental/lab-runtime-local/src/sqlite-store.ts`
- 修改：Runtime 测试和报告测试

**接口：**

```text
interface StartRunRequest {
  experimentId: ExperimentId
  planId: PlanId
  planRevision: number
  launchedBySessionId?: SessionId
}

interface ArtifactManifest {
  artifactId: ArtifactId
  runId: RunId
  kind: 'text' | 'json' | 'image' | 'file' | 'report'
  name: string
  authorizedUri: string
  digest: string
  mediaType: string
  size: number
  createdAt: number
}

interface RuntimeExperimentState {
  request: ExperimentRequest
  approvedPlans: readonly ApprovedPlanRecord[]
  runs: readonly RunView[]
}
```

- [ ] 为同一 Experiment 下的两个终态 Run、retry provenance、active-Run conflict、按 Run ID 查询和执行中 Session 关闭编写失败 Provider 测试。
- [ ] 为 Run ordering、Artifact serialization、digest preservation 和拒绝旧 single-Run schema 编写失败 store 测试。
- [ ] 将服务改为 `startRun(request)`、`getRun(runId)`、`listRuns(experimentId)` 和 `retryRun(runId, actor)`；一次性更新所有 Consumer。
- [ ] 保存不可变 Run launch inputs，并追加 observations，不覆盖之前的历史。
- [ ] 通过 Host-authorized adapter 创建 Artifact；在 Provider/process boundary 校验 media type 和 authorization。
- [ ] 根据一个明确寻址的 Run 及其 Artifact 记录构建报告。
- [ ] 运行 Runtime Service Definition、local Provider、Facade 和报告测试。
- [ ] 提交：`feat(lab): retain run and artifact history`。

## 任务 5：用 typed 页面命令替换面向 snapshot 的浏览器命令

**文件：**

- 修改：`packages/experimental/lab-mvp-web/src/protocol.ts`
- 修改：`packages/experimental/lab-mvp-web/src/project-protocol.ts`
- 修改：`packages/experimental/lab-mvp-web/src/index.ts`
- 修改：`packages/experimental/lab-mvp-web/src/http.ts`
- 拆分：`packages/client/ui-lab-workbench/src/client/api.ts` 为 `api/client.ts`、`api/types.ts` 和 `api/errors.ts`
- 测试：protocol、Facade、HTTP 和 client API 测试

**接口：**

```text
type LabQueryCommand =
  | { command: 'project-list' }
  | { command: 'project-open'; projectId: LabProjectId }
  | { command: 'experiment-list'; projectId: LabProjectId }
  | { command: 'experiment-open'; experimentId: ExperimentId }
  | { command: 'run-list'; experimentId: ExperimentId }
  | { command: 'run-open'; runId: RunId }
  | { command: 'artifact-list'; runId: RunId }

type LabActionCommand =
  | { command: 'project-create'; workspaceId: WorkspaceId; name: string; description?: string }
  | { command: 'experiment-create'; projectId: LabProjectId; title: string; objective: string }
  | { command: 'run-start'; experimentId: ExperimentId; planId: PlanId }
  | { command: 'run-retry'; runId: RunId }
```

- [ ] 为每个命令增加 parser 测试，并拒绝会恢复调用方生成 ID 或任意文件路径的未知字段。
- [ ] 定义明确的 ProjectSummary、ProjectDetail、ExperimentSummary、ExperimentDetail、RunSummary、RunDetail、ArtifactSummary 和 ReportView result 类型。
- [ ] 实现窄范围 Facade query，并从客户端工作流代码中移除 `snapshot(experimentId)`。
- [ ] 将领域错误映射为稳定 Web code：`WORKSPACE_UNAVAILABLE`、`SESSION_CWD_MISMATCH`、`CROSS_PROJECT_REFERENCE`、`ACTIVE_RUN_EXISTS`、`CAPABILITY_UNAVAILABLE` 和 `ARTIFACT_NOT_AUTHORIZED`。
- [ ] 用 wire boundary 的 typed decoding 替换 client API 中的 `asRecord`、`toSnapshot` 和面向页面的 `unknown` conversion。
- [ ] 运行 protocol、HTTP、Facade 和 client API 测试。
- [ ] 提交：`refactor(lab): expose typed project workflow commands`。

## 任务 6：将单体 LabWorkbench 替换为 Harness 页面贡献

**文件：**

- 替换完成后删除：旧的全局导航注册；当前替代实现为 `packages/client/ui-lab-workbench/src/client/LabGlobalNavigation.tsx`
- 替换完成后删除：`packages/client/ui-lab-workbench/src/client/LabWorkbench.tsx`
- 替换：`packages/client/ui-lab-workbench/src/client/store.ts`
- 新建：`state/LabUiContext.ts`、`navigation/LabGlobalNavigation.tsx`、`projects/ProjectAppView.tsx`、`projects/ProjectListPage.tsx`、`projects/ProjectOverviewPage.tsx`、`projects/ProjectConversationsPage.tsx`
- 修改：`packages/client/ui-lab-workbench/src/client/index.ts`
- 测试：无 Session 导航和 Project 页面测试

**接口：**

```text
interface LabUiSelection {
  projectId?: LabProjectId
  experimentId?: ExperimentId
  projectPage: 'overview' | 'conversations' | 'experiments' | 'runs' | 'evidence'
}

interface ILabUiContext {
  get(): LabUiSelection
  subscribe(listener: () => void): () => void
  selectProject(projectId?: LabProjectId): void
  selectExperiment(experimentId?: ExperimentId): void
  openProjectPage(page: LabUiSelection['projectPage']): void
}
```

- [ ] 编写无 Session 组合测试：点击 `sidebar.navigation` 中的 Projects，断言 `app.view` 出现 `ProjectListPage`。
- [ ] 将 `LabUiContext` 实现为仅保存页面选择；不得在其中放置 ProjectView、ExperimentView、RunView 或 Evidence 数组。
- [ ] 在 `index.ts` 注册全局导航和 `app.view` entries；所有点击都调用 `ctx.layout.openAppView()`。
- [ ] 使用已有 Workspace picker action 和 Host 生成的 ID response 实现 Project list/create。
- [ ] 实现 Project shell 和 Conversations list。打开 Session 时调用 `ctx.sessions.open(sessionId)` 和 `ctx.layout.closeAppView()`。
- [ ] 移除 `lab:navigate`、`sidebar.footer.action`、`project-showcase-${Date.now()}`、`project-1`、`experiment-1`、阶段映射和 Project/Experiment ID 输入字段。
- [ ] 按职责拆分 locale 和 CSS；增加 keyboard 与窄宽度测试，不发明新的工作流文案。
- [ ] 运行 workbench、layout、sidebar、workspace 和 conversation 组合测试。
- [ ] 提交：`feat(lab): integrate project pages with harness navigation`。

## 任务 7：将 Knowledge 和 Devices 变成独立应用页面

**文件：**

- 修改：`packages/client/ui-lab-knowledge-workspace/src/client/index.ts`
- 修改：`packages/client/ui-lab-knowledge-workspace/src/client/KnowledgeWorkspace.tsx`
- 修改：包 manifest 和测试

**接口：**

- 消费：`ILayout`、`ILabUiContext`、typed Knowledge/Project scope commands 和 device records。
- 产出：`app.view` entries `lab-knowledge` 和 `lab-devices`；citation navigation request `{ sourceId, versionId, location }` 保存为展示意图，不复制内容。

- [ ] 将 Knowledge mount 测试替换为无 Session `app.view` 测试；确认当前因包仍指向 `lab.knowledge.workspace` 而失败。
- [ ] 直接在 `app.view` 下注册 Knowledge，移除 workbench child slot 声明和类型依赖。
- [ ] 通过公开的 `LabUiContext` observable 读取 active Project。无 Project 时仍可导入/检索，并让 Project scope 操作显式可见。
- [ ] 用 typed inputs 和 locale keys 替换 fallback Experiment IDs 和可见英文错误。
- [ ] 增加 source retry、READY selection 和 citation-target 行为测试。
- [ ] 用带 Provider status label 的可选记录实现 Devices；移除逗号分隔的 device ID 编辑。
- [ ] 运行 Knowledge、Device、Project scope 和 package bundle 测试。
- [ ] 提交：`feat(lab): expose knowledge and devices as app views`。

## 任务 8：将实验上下文和生命周期卡片接入 Conversation

**文件：**

- 新建：`conversation/LabHeaderContext.tsx`
- 新建：`conversation/LabCommandCard.tsx`
- 新建：`conversation/LabPlanNode.tsx`、`LabRunNode.tsx`、`LabEvidenceNode.tsx`
- 修改：客户端注册和 Session node projection
- 测试：conversation 组合、node reconstruction 和 context isolation

**接口：**

- 消费：`conversation.session.header.actions`、`conversation.input.dock`、`conversation.chat.commandview`、`conversation.chat.node`、当前 Session 和 `ILabUiContext`。
- 产出：不增加新的 composer；卡片必须是 durable nodes 或 typed command results 的纯 projection。

- [ ] 编写失败测试：现有 composer 上方显示 Project/Experiment context，真实 chat view 内出现 Plan proposal。
- [ ] 注册 header action 和 context dock，不替换 Session header 或 composer bar。
- [ ] 增加 Experiment proposal、Plan revisions、approvals、Runs 和 Evidence links 的 Session event projection 类型。
- [ ] 为待处理的人类操作注册 command cards，为持久记录注册 node views；契约匹配时复用现有 approval/interaction 组件。
- [ ] 将卡片详情操作路由到 `LabUiContext` 和 `ctx.layout.openAppView('lab-projects')`。
- [ ] 删除 RequestStage 及其 objective/sample/constraint 表单。Agent 缺少信息时通过现有 conversation 和 ask-user interaction 获取。
- [ ] 增加测试：新的 Project Session 继承已批准 scope，但不继承其它 Session 的私有消息或 draft Plan。
- [ ] 更新 keyless Session snapshot 输出。
- [ ] 提交：`feat(lab): render experiment workflow in conversation`。

## 任务 9：完成 Experiment、Run、Evidence 和报告检查页面

**文件：**

- 新建：`experiments/ExperimentListPage.tsx`、`ExperimentDetailPage.tsx`
- 新建：`runs/RunListPage.tsx`、`RunDetailPage.tsx`、`RunComparisonPage.tsx`
- 新建：`evidence/EvidencePage.tsx`、`ArtifactPreview.tsx`、`ReportPage.tsx`
- 测试：各列表/详情/动作状态和响应式 list-detail 行为

**接口：**

- 消费：任务 5 的 typed query/action client 和 `LabUiContext` selection。
- 产出：链接保留 branded record ID；comparison 只接受同一 Experiment 的两个终态 Run。

- [ ] 使用 typed fixtures 编写 empty、loading、success、unavailable 和 failed 状态的 list/detail 测试。
- [ ] 实现带关联 Sessions、派生关系、Plan revisions、Runs 和 Evidence 的 Experiment list/detail。
- [ ] 实现 Run list/detail sections：Overview、Parameters、Steps、Evidence、Logs 和 Timeline。
- [ ] 实现 retry 和 comparison。Facade 拒绝跨 Experiment 或非终态比较，UI state 中禁用对应操作。
- [ ] 使用现有安全 text/JSON/image primitives 和 Host-authorized open/download actions 实现 Artifact preview。
- [ ] 将 ReportView 实现为结构化 sections，链接到 Plan revision、Run、Observation、Artifact、actor 和 timestamp。
- [ ] 增加窄宽度单栏导航和 keyboard 测试。
- [ ] 运行页面测试和 client bundle。
- [ ] 提交：`feat(lab): add experiment evidence workbench pages`。

## 任务 10：将确定性规划迁移到 Host Provider

**文件：**

- 新建或扩展：`packages/experimental/` 下的 deterministic planning Provider
- 修改：`packages/experimental/lab-mvp/src/index.ts`
- 修改：`examples/lab-web/cordis.patch.yml`
- 替换完成后删除：浏览器 `createLocalPlan()`
- 测试：Host composition 和 keyless snapshot

**接口：**

- 消费：Experiment request 和 Project-approved confirmed citations。
- 产出：与已配置模型 Provider 使用相同 planning service 和 Session event path 的普通 `PlanProposalInput`。

- [ ] 编写 Host composition 测试：创建 Project 和 Experiment，选择一个 confirmed citation，在没有 model key 时请求 deterministic Plan。
- [ ] 使用由 request fields 和 citation IDs 决定的固定行为实现 Provider；不得把浏览器 fixture 复制到 local storage。
- [ ] 只在 keyless lab patch 中注册 deterministic Knowledge、planning、mock device 和 Runtime Providers。
- [ ] 暴露 Provider metadata，使 UI 直接标记 Demo、Mock、Real 和 Unavailable 状态。
- [ ] 配置 real profile 在不改变命令或页面的情况下替换 Providers；缺少 credentials 时保持 skipped/unavailable。
- [ ] 移除 `createLocalPlan()` 和浏览器生成的 Plan/Skill IDs。
- [ ] 记录覆盖 planning、approval、Run、Artifact 和 report 输出的 keyless runnable snapshot。
- [ ] 提交：`feat(lab): add host-backed keyless experiment provider`。

## 任务 11：证明单应用展示流程

**文件：**

- 修改：根目录/example scripts 和 `examples/lab-web/cordis.patch.yml`
- 新建：由 lab example 或 browser test harness 负责的浏览器验收测试
- 修改：`examples/lab-web/README.md`、`README.zh.md`、`SHOWCASE.md`、`SHOWCASE.zh.md`
- 新建：行为验收完成后的稳定截图或 GIF

**接口：**

- 消费：之前所有任务的产出。
- 产出：一个根命令 `pnpm run demo:lab-web` 和一个确定性的端到端验收流程。

- [ ] 增加 `demo:lab-web`：Node 24 且依赖已构建的 checkout 可以启动唯一 profile 并打印一个 URL。
- [ ] 从干净 lab data directory 编写浏览器测试：无 Session 打开 Projects，选择 Workspace，创建 Project 和 Session，通过现有 composer 提交实验目标，导入/选择 Knowledge，批准 Plan，启动/确认 Run，打开 Evidence/report。
- [ ] 每次页面转换都断言 Host 返回的同一组 Project、Experiment 和 Run ID；Project 创建和 Run 完成后刷新并重复断言。
- [ ] 增加 model unavailable、Knowledge failed、Workspace unavailable 和 Run failed recovery 场景。
- [ ] 在桌面、窄平板宽度和纯键盘主要操作路径运行流程。
- [ ] 将展示指南重写为仅描述已测试行为，然后从 deterministic run 记录截图/GIF。
- [ ] 运行聚焦测试、keyless snapshot、TS/Python SDK projections、typecheck、build、hygiene、doc-sync、website build、严格 OpenSpec 校验和 `git diff --check`。
- [ ] 运行 `openspec-verify-change`，将每个 requirement/scenario 映射到实现和测试证据。
- [ ] 提交：`docs(lab): publish verified showcase workflow`。

## 执行检查点

Luna 必须在任务 1、4、8 和 11 后停止等待评审。任务 1 修改共享 Harness UI 契约；任务 4 修改持久化 Runtime 记录；任务 8 修改模型可见的 Session 输出；任务 11 是产品验收点。检查点报告必须包含实际运行的命令、通过结果摘要、变更的公共接口、剩余 OpenSpec 任务以及相对本计划的任何偏差。

只有当浏览器流程从无 Session 开始，使用一个现有 Harness composer，成功重新加载 Host-backed records，并通过 keyless 实验完成可导航报告时，实施才算完成。单元测试或单独可渲染的页面不能替代这个条件。
