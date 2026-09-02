# LABWEAVE 原生工作区后续实施计划

[English](2026-08-28-lab-showcase-ready-workspace-implementation-plan.md) | 中文

> **执行要求：** 使用 `superpowers:executing-plans` 按批实施，并在每个检查点对照 [tasks.md](../../../openspec/changes/lab-showcase-ready-workspace/tasks.md)。本文规定实现顺序和技术落点；`tasks.md` 是唯一权威完成状态。

**目标：** 完成 `lab-showcase-ready-workspace` 剩余 11 项，使 LABWEAVE 默认进入无对话框的全局监控，点击 Project 后切换对应 Workspace/Session 并进入三栏工作台，同时让具备实验身份的 Agent 能在人工门禁之前自主创建和规划 Experiment。

**架构：** Workspace 是用户可见的实验项目入口，一个 Workspace 至多映射一个内部 LabProject；一个 LabProject 可包含多个 Session、Experiment 和 Run。浏览器只保存呈现选择，Host application operation 负责身份解析、持久化和跨服务一致性；Agent 工具和 Web Facade 复用同一操作。

**技术栈：** TypeScript、Cordis plugin/service、React、Harness client slots/runtime、Session event log、Vitest、assembled Chromium、OpenSpec。

**规格：** [proposal](../../../openspec/changes/lab-showcase-ready-workspace/proposal.md)、[design](../../../openspec/changes/lab-showcase-ready-workspace/design.md) 和 `openspec/changes/lab-showcase-ready-workspace/specs/` 下的四份 delta spec。

## 全局约束

- 保留当前工作树中的无关改动；每批开始前运行 `git status --short`，只修改本批列出的文件。
- 不新增独立 Project 创建页。Workspace 映射由 Host 自动创建或复用，Project 名称取 Host Workspace 名称或路径 basename。
- 浏览器不得生成 Project、Experiment、Run 或文件身份，不得保存领域记录、文件正文或绝对路径。
- Agent 可以创建当前 Session 所属 Project 内的 Experiment；Agent 不得创建 Workspace/LabProject、批准 Plan/Skill、启动 Run、确认人工步骤或发布 verdict。
- 每个模型可见输入和继续状态必须写入 Session event；刷新和重放只能从 Host records 与 event log 重建。
- 默认 profile 的 Conversation、sidebar 和 details 行为不得变化。LABWEAVE 只能复用 Harness input state machine，始终只有一个 Session、一个 draft 和一个 input DOM。
- 不添加静默兜底。Workspace、Session、Project 或 capability 无法解析时返回 typed unavailable/blocked result，并给出真实可执行的下一步。
- 本计划不授权新产品文案；新增可见字符串必须补齐中英文 locale，并由同批测试固定。

## 已冻结的用户流程

```text
首次进入
  -> 全局执行监控（replace view，无 Conversation/composer/details）
  -> Project 状态列表
  -> 点击 Project/Run
  -> Host 返回 Project 的 Workspace + matching Session + active Experiment/Run
  -> ctx.workspaces.connectWorkspace(workspaceId)
  -> ctx.sessions.open(matchingSessionId)
  -> LabUiContext 选择 Project/Experiment/Run/destination
  -> ctx.layout.openAppView('lab-project')
  -> 左侧原生 sidebar + 中间原生 Conversation + 右侧 Project workspace
```

matching Session 的顺序固定为：点击 Run 时优先选择与该 Experiment 关联且仍属于 Workspace 的 Session；点击 Project 时优先选择 Project 最近活动的关联 Session；均不存在时调用 `connectWorkspace()` 获得可复用或新建的空 Session，再由 Host 幂等 attach。浏览器不得从数组顺序猜测 Session。

## 要新增或收敛的公共类型

### Workspace/Project 入口解析

使用现有 Host-owned service 作为 application boundary：`LabProjectService.create()` 与 `projectForSession()` 负责 Workspace→Project 映射，`LabProjectService.createExperiment()` 负责生成 Experiment identity 和 operation replay，`LabMvpWebService.createAgentExperiment()` 是 Agent/Web 将 Project record 与 Runtime record 绑定的唯一入口。除非后续变更证明这些职责需要独立演进，否则不新增平行的 application package。

```ts
import type { ExperimentId, LabExperimentRecord, LabProjectId, RunId, WorkspaceId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { SessionId } from '@deepseek-ai/dsh-session'

export interface ResolveLabProjectEntryRequest {
  readonly workspaceId?: WorkspaceId
  readonly sessionId: SessionId
  readonly projectId?: LabProjectId
  readonly experimentId?: ExperimentId
  readonly runId?: RunId
}

export interface LabProjectEntryResolution {
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly projectId: LabProjectId
  readonly experimentId?: ExperimentId
  readonly runId?: RunId
  readonly createdProject: boolean
  readonly attachedSession: boolean
}

export interface BootstrapLabExperimentRequest {
  readonly sessionId: SessionId
  readonly requestId: string
  readonly title: string
  readonly objective: string
  readonly expectedOutputs: readonly string[]
}

export interface BootstrapLabExperimentResult {
  readonly resolution: LabProjectEntryResolution
  readonly experiment: LabExperimentRecord
  readonly createdExperiment: boolean
  readonly registeredRuntime: boolean
}
```

Agent 工具的 `operationId` 使用不透明的 tool-call identity。`LabProjectService.createExperiment()` 将该 key 写入 Project audit/state；相同 key 与相同输入返回原 Experiment，相同 key 与不同输入 fail loud。Runtime `createExperiment()` 对相同 ID 和相同 request 幂等，对内容冲突仍报错，因此 Project 已提交但 Runtime 响应丢失时可以安全重试。

### 生命周期进度结果

在 `packages/experimental/lab-domain/src/types.ts` 定义并导出：

```ts
import type { ExperimentId, LabProjectId, PlanId, RunId, WorkspaceId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { SessionId } from '@deepseek-ai/dsh-session'

export type LabProgressActor = 'agent' | 'human' | 'runtime' | 'capability'
export type LabProgressState = 'registered' | 'already-registered' | 'blocked' | 'waiting' | 'unavailable' | 'failed' | 'completed'

export interface LabScopedRecordIds {
  readonly workspaceId?: WorkspaceId
  readonly sessionId?: SessionId
  readonly projectId?: LabProjectId
  readonly experimentId?: ExperimentId
  readonly planId?: PlanId
  readonly runId?: RunId
}

export interface LabProgressResult {
  readonly state: LabProgressState
  readonly sessionId: SessionId
  readonly scopedIds: LabScopedRecordIds
  readonly reason: string
  readonly nextActor: LabProgressActor
  readonly allowedActions: readonly string[]
  readonly workbenchDestination?: { readonly view: 'lab-project' | 'lab-monitor'; readonly page?: 'approval' | 'execution' | 'evidence' | 'overview'; readonly projectId?: LabProjectId; readonly experimentId?: ExperimentId }
}
```

`completed` 是生命周期投影的终态；每个非终态必须有且只有一个 `nextActor`，并至少有一个 `allowedActions`。人工门禁必须包含已注册的 workbench destination；capability unavailable 必须包含对应恢复动作；不得返回会被 policy 拒绝的 Agent tool。Session event 记录同一组 scoped IDs 和 destination，内存工具注册重建后仍可恢复 pending 结果。

## 实施批次

### 批次 1：Workspace 自动映射与 Project 入口协调器

**覆盖任务：** 2.9。

**使用：** 现有 `LabProjectService`、`LabMvpWebService`、Runtime service 和 Workspace registry。在这些 owner 旁补测试和文档，不新增第二套 application package。

**修改：** `lab-domain/src/{index,project}.ts`、`lab-project/src/index.ts` 及测试、`lab-runtime/src/{index,types}.ts`、`lab-runtime-local/src/index.ts` 及测试、`lab-mvp/src/index.ts` 及 composition 测试、相关 package/subsystem 文档。

**步骤：**

1. 先写测试：同一 Workspace 两次映射只产生一个 LabProject；当前 Session 自动映射到该 Project；跨 Workspace 的显式 Project/Session 返回冲突。
2. 保持映射由 `LabProjectService.create()` 与 `projectForSession()` 负责。Project ID 和目录 basename 名称由 Host 生成；浏览器命令只提交 Workspace identity。
3. 保持 Experiment operation replay 在 Project audit/state 中，并让相同内容的 Runtime 登记幂等，冲突内容明确失败。
4. 让 `LabMvpWebService.createAgentExperiment()` 解析调用 Session 的 Project，调用 Project service，使用返回 Experiment 登记 Runtime，并只追加一次创建/request event。
5. 保持 active-project bridge 和 monitor click path 的顺序：选择 Workspace、打开 matching Session、选择 Project/Experiment，再打开 `lab-project`；Agent tool 不创建 Workspace 或 Project。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run packages/experimental/lab-project/tests/service.spec.ts packages/experimental/lab-runtime-local/tests/provider.spec.ts packages/experimental/lab-mvp-web/tests packages/experimental/lab-mvp/tests/composition.spec.ts --reporter=verbose
```

**退出条件：** 自动映射、attach、跨范围拒绝、Project 提交后 Runtime 响应丢失再重试均通过；没有浏览器提供的业务 ID，也没有独立 Project 创建页注册。

### 批次 2：全局导航、监控 replace view 与三栏 composition

**覆盖任务：** 8.6、8.9、8.16、8.17。

**修改：** `ui-lab-workbench/src/client/` 下的 `index`、`LabGlobalNavigation`、`LabProjectsView`、`LabUiContext`、`LabProjectShellView`、adapter/Host adapter/API/locale/CSS 及对应测试；只在通用 layout contract 需要断言时修改 `ui-layout` 测试。

**步骤：**

1. 将 `lab-monitor` 改为 `conversationMode: 'replace'`，测试 monitor/configuration 不渲染 Conversation、composer 或 details。
2. 删除 `LabProjectsView` 的 Workspace selector、创建表单和按钮；Project 状态列表移入 monitor，不再注册独立 Projects 导航入口。
3. `LabGlobalNavigation` 只贡献全局监控、配置和原生 Workspace/Session tree 所需 seat；Knowledge、Agent、Workflow/Lab Skill、Devices、People/permissions 均进入 configuration。
4. Host adapter 增加 `resolveProjectEntry(input)`。统一 `openProjectEntry()`：await Host resolution→`connectWorkspace()`→必要时 Host attach→`sessions.open()`→更新 `LabUiContext`→打开 `lab-project`。Project row、Run row 和 Workspace/Session 同步都调用它。
5. 保持 `lab-project` 为 `conversationMode: 'lab-workspace'`。复用 `AppFrame` 的三列、details drag handle 和 `openDetails/closeDetails`，不重建 composer、resize 或固定右栏最大宽度。
6. monitor/configuration 切换只改变 app view，不清空 `LabUiContext`、Session、draft 或 details 宽度偏好。
7. 删除正常首屏“未选择 Project”。Host 解析失败显示 typed unavailable；无 Experiment 显示 Agent 可创建 Experiment，不要求用户创建 Project。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run packages/client/ui-lab-workbench/tests packages/client/ui-layout/tests/app-frame.client.spec.tsx packages/client/ui-layout/tests/service.client.spec.ts --reporter=verbose
```

**退出条件：** 初始 monitor 无 input；Project 点击打开 Host 指定 Workspace/Session；Project 模式只有一个 input；两栏可收起、右栏可拖拽，整页切换不丢 draft/selection。

### 批次 3：LABWEAVE Agent 身份与可重建 Project context

**覆盖任务：** 10.3。

**修改：** `tool-lab/src/index.ts` 及测试、`examples/lab-web/cordis.patch.yml`；保留 `examples/lab-web/tests/agent-lifecycle.spec.ts` 中现有的 keyless Agent lifecycle 测试和 inline snapshot。

**步骤：**

1. 每个 LABWEAVE Agent scope 注册 `systemPrompt.section({ name: 'labweave:agent-role', ... })`；不得用 `complete` 或注册 `deployment:persona`。
2. 固定身份和顺序：当前实验 Project 的规划、协调与解释者；第一步 `lab_project_context`；Experiment→Knowledge/capability→Plan/Skill proposal→等待人工 approval/Run start→monitor/replan→report。
3. 固定权限：Agent 只创建 Experiment、读 context/Knowledge/capability、提出 Plan/Skill、监控/replan/report；human 调整和批准 Plan/Skill、启动 Run、确认人工步骤、发布 verdict；Runtime 执行批准图。
4. `nextActor: human|runtime|capability` 时解释原因，并在 tool boundary 让 Agent loop yield；不得轮询或改用禁用工具。
5. 动态 context 继续由 `lab/agent/context-read` 记录，不拼入静态 prompt；snapshot 从 Session event 重建。
6. 断言 laboratory profile 含 `labweave:agent-role`，default profile 不含，Harness identity/persona/tool protocol 顺序不变。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run packages/experimental/tool-lab/tests/tool-lab.spec.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run examples/lab-web/tests/agent-lifecycle.spec.ts --reporter=verbose
```

**退出条件：** Agent prompt 明确身份、流程、权限和 yield；default profile 无 LABWEAVE 文案；Project context 可由 durable event 重建，Agent lifecycle 测试证明 prompt 被真实 loop 消费。

### 批次 4：Agent 创建 Experiment 与 typed progress/no-dead-end

**覆盖任务：** 10.10、10.11、10.12。

**新增：** `packages/experimental/tool-lab/tests/tool-lab.spec.ts` 中的表驱动 progress matrix；共享 progress type 保持在 `packages/experimental/lab-domain/src/types.ts`。

**修改：** `tool-lab/src/index.ts`、测试和 package；`lab-mvp-web/src/{index,project-protocol}.ts` 及测试；`ui-lab-workbench` adapter/API/Host adapter/workbench projection；相关 README 和 subsystem 对侧。

**步骤：**

1. 删除 `lab_experiment_propose` 注册、描述、测试和配置引用。
2. 从 `HUMAN_ACTION_TOOLS` 删除 `lab_experiment_create`，保留 approval、Run start/step/confirm 的人工限制。只读 report 与 verdict 发布必须分开，不能含糊放权。
3. `lab_experiment_create` 只接收 `title`、`objective`、`expected_outputs`，使用 calling Session 和 `exec.rootCallId` 调用 `bootstrapExperiment()`。
4. Agent bootstrap 与 human-gate projection 统一返回共享 `LabProgressResult`；Facade error 和 capability record 保持 typed state/error code，不解析 message 字符串。
5. 每个 Agent call identity 只持久化一个 pending event；优先从 Session event 恢复，再读取内存 Map，因此工具注册重建后仍返回同一 workbench action。
6. human action 完成后追加 durable approval/start/confirmation event；下一 Agent turn 从 projection 得到 `nextActor: agent`，不使用浏览器内存 continuation。
7. 使用既有 focused tests 加表驱动 Agent matrix 覆盖 Workspace 未映射、Project 无 Experiment、bootstrap 结果丢失重试、缺输入、Knowledge/device/planning/Runtime unavailable、Plan/Skill 待审批、拒绝后修订、待人工 Run start、人工步骤确认、Workspace/Session 切换恢复和 capability 恢复。
8. 每行断言 state、scoped IDs、唯一 nextActor、非空 allowedActions、合法 workbench destination，并断言 Agent 不调用 policy 禁用工具。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run packages/experimental/tool-lab/tests/tool-lab.spec.ts packages/experimental/lab-mvp-web/tests packages/client/ui-lab-workbench/tests/host-adapter.contract.client.spec.ts --reporter=verbose
```

**退出条件：** Agent 可幂等创建 Experiment 但不能启动 Run；每个非终态有一个下一 actor 和至少一个真实动作；人工门禁只产生一次请求并结束 Agent turn。

### 批次 5：真实 Agent 工具链的 composed/keyless 验收

**覆盖任务：** 10.13。

**修改：** `examples/lab-web/tests/host-lifecycle.snapshot.ts` 与 `examples/lab-web/tests/agent-lifecycle.spec.ts`；仅为 assembled replay/bootstrap 扩展 `apps/web/tests/lab-full-lifecycle.e2e.ts`。

**步骤：**

1. 组装真实 `cordis.patch.yml`，用 deterministic model response 驱动 Agent 执行真实 `lab_project_context`、`lab_experiment_create`、Knowledge/planning tools。Agent 场景保持 keyless 和 inline snapshot，不用直接 Facade 调用替代。
2. 断言同一 Host ID 链贯穿 Workspace、Session、Project、Experiment、Plan/Skill proposal、Run、Artifact、verdict 和 report。
3. 在 Plan/Skill approval 与 Run start 前断言 pending action 只出现一次、tool result 为 `nextActor: human`、Agent turn 已结束。
4. 通过 Host/UI human action 继续，再开启下一 Agent turn；不得直接调用 Runtime 私有方法。
5. `/api/lab` 场景只保留为 Host API 集成测试，测试名与 README 明确其不完成 Agent 验收。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run examples/lab-web/tests/agent-lifecycle.spec.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run --config ./vitest.snapshot.config.ts examples/lab-web/tests/host-lifecycle.snapshot.ts --reporter=verbose
```

**退出条件：** keyless Agent lifecycle 测试真实执行 `lab_*` tool，并证明 Agent 在人工门禁处 yield，经 Host human continuation、失败 replan 后生成 report；Host snapshot 独立覆盖持久化投影。

### 批次 6：assembled Chromium、响应式与无障碍验收

**覆盖任务：** 8.19、11.2、11.3、11.5。

**修改：** 三个 `apps/web/tests/lab-*.e2e.ts`、apps web test 双语 README、稳定截图/GIF 资产。

**步骤：**

1. 在 1440px、1024px、768px 启动真实 assembled app；首个断言是 `[data-lab-monitor]` 可见且 composer/input/details 不存在。
2. 点击 Project row，断言 active Workspace、Session、Project/Experiment/Run ID 与 Host resolution 一致，再断言三栏出现。
3. 在唯一原生 input 提交目标；补问、Knowledge、Plan/Skill proposal、人工调整/批准、Run start、异常 replan、Evidence、report 全部通过 UI。
4. 验证手动 destination 覆盖 Agent presentation；只有新的合法 presentation event 才能再次导航。
5. 验证左右栏恢复、右栏拖拽、中间 timeline 滚动、Project file revision 自动刷新、手动刷新/预览/下载、页面刷新和 Workspace/Session 往返。
6. 纯键盘覆盖 sidebar、Project row、composer、pending action、workbench tabs、关闭/恢复；检查 focus ring、accessible name、tab order、主滚动容器和返回 monitor。
7. 行为断言通过后保存 desktop、narrow desktop、tablet 三张稳定证据；截图不替代断言。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run --config ./vitest.web.config.ts apps/web/tests/lab-showcase.e2e.ts apps/web/tests/lab-workbench.e2e.ts apps/web/tests/lab-full-lifecycle.e2e.ts --reporter=verbose
```

**退出条件：** 三种 viewport 与键盘路径通过；页面只有一个 input；相同 Host ID 可在 monitor、tree、timeline 和所有 workbench destination 追踪。

### 批次 7：展示文档、完整验证与 OpenSpec 收口

**覆盖任务：** 11.6、11.7、11.8。

**修改：** `examples/lab-web/SHOWCASE` 双语 pair、proposed Agent Note pair、`tasks.md`（仅在证据满足后勾选）。

**步骤：**

1. SHOWCASE 只写五至十分钟用户流程：monitor→Project→Agent goal→Experiment→Knowledge/Plan/Skill→人工 approval/Run start→replan→Evidence/report；不把 curl 或直接 `/api/lab` 描述为用户操作。
2. 修复本机 Rolldown macOS ARM 可选依赖后，在 Node 24 从仓库根目录运行下列验证；安装使用用户指定代理，除真实 Provider 场景外保持 keyless。
3. 只记录实际结果；既有失败与本变更失败分开，不能把部分通过写成完成。
4. 用 `openspec-verify-change` 映射每条 requirement/scenario。存在 CRITICAL/WARNING 时保持任务未完成且不归档。

**完整验证：**

```sh
node node_modules/vitest/vitest.mjs run packages/client/ui-lab-workbench/tests packages/experimental/lab-project/tests packages/experimental/tool-lab/tests packages/experimental/tool-lab-project/tests packages/experimental/lab-mvp-web/tests packages/experimental/lab-mvp/tests --reporter=verbose
node node_modules/vitest/vitest.mjs run --config ./vitest.snapshot.config.ts examples/lab-web/tests --reporter=verbose
node node_modules/vitest/vitest.mjs run --config ./vitest.web.config.ts apps/web/tests/lab-showcase.e2e.ts apps/web/tests/lab-workbench.e2e.ts apps/web/tests/lab-full-lifecycle.e2e.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run packages/sdk/client/tests packages/sdk/server/tests --reporter=verbose
uv run --project python/sdk pytest python/sdk/tests
npm run typecheck
npm run build
npm run hygiene
npm run doc-sync
npm run website:build
rtk openspec validate lab-showcase-ready-workspace --strict
git diff --check
```

**退出条件：** OpenSpec verify 无 CRITICAL/WARNING；11 个剩余任务均有源码、自动化测试或人工浏览器证据；此后才允许 `openspec-archive-change`。

## 依赖与检查点

```text
批次 1 -> 批次 2
批次 1 -> 批次 4
批次 3 -> 批次 4
批次 1 + 3 + 4 -> 批次 5
批次 2 + 5 -> 批次 6
批次 6 -> 批次 7
```

每批完成后暂停并报告：修改文件、通过命令、未通过项、对应 OpenSpec task。只有依赖满足且聚焦验证通过才能进入下一批；视觉检查不能替代 Host/Agent 链路测试。

## 明确不在本变更内

- 不增加多 Workspace 聚合实验、跨 Workspace Project、Project 手动创建/重命名/删除 UI。
- 不允许 Agent 自动批准或自动启动 Run，也不增加超时后自动放行。
- 不增加浏览器文件上传、创建、重命名、删除或绝对路径访问。
- 不重做默认 Harness Conversation、Workspace tree、input 或通用 layout store。
- 不以 Qwen、DeepSeek 或任何真实模型调用代替 keyless acceptance；真实 Provider 只验证可替换性。
