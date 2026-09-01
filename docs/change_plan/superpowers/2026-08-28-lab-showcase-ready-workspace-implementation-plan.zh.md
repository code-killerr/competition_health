# LABWEAVE 原生工作区后续实施计划

[English](2026-08-28-lab-showcase-ready-workspace-implementation-plan.md) | 中文

> **执行要求：** 使用 `superpowers:executing-plans` 按批实施，并在每个检查点对照 [tasks.md](../../../openspec/changes/lab-showcase-ready-workspace/tasks.md)。本文规定实现顺序和技术落点；`tasks.md` 是唯一权威完成状态。

**目标：** 完成 `lab-showcase-ready-workspace` 剩余 17 项，使 LABWEAVE 默认进入无对话框的全局监控，点击 Project 后切换对应 Workspace/Session 并进入三栏工作台，同时让具备实验身份的 Agent 能在人工门禁之前自主创建和规划 Experiment。

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

在 `packages/experimental/lab-application/src/index.ts` 定义 Host-owned application service。`resolveProjectEntry()` 和 `bootstrapExperiment()` 是 Web Facade 与 Agent tool 的唯一共享写入口。

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

Agent 工具的 `requestId` 固定为 `${sessionId}:${rootCallId}`。`LabProjectService.createExperimentOnce()` 持久化该 key；相同 key 与相同输入返回原 Experiment，相同 key 与不同输入 fail loud。Runtime `createExperiment()` 对相同 ID 和相同 request 改为幂等，对内容冲突仍报错，因此 Project 已提交但 Runtime 响应丢失时可以安全重试。

### 生命周期进度结果

在 `packages/experimental/lab-domain/src/progress.ts` 定义并由 `index.ts` 导出：

```ts
import type { ExperimentId, LabPresentationView, LabProjectId, PlanId, RunId, WorkspaceId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { JsonValue, SessionId } from '@deepseek-ai/dsh-session'

export type LabNextActor = 'agent' | 'human' | 'runtime' | 'capability'
export type LabProgressState = 'ready' | 'waiting' | 'blocked' | 'unavailable' | 'completed'

export interface LabScopedRecordIds {
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly projectId: LabProjectId
  readonly experimentId?: ExperimentId
  readonly planId?: PlanId
  readonly runId?: RunId
}

export type LabAllowedAction =
  | { readonly kind: 'agent-tool'; readonly name: string }
  | { readonly kind: 'workbench'; readonly destination: LabPresentationView; readonly targetId?: string }
  | { readonly kind: 'wait-event'; readonly event: string }
  | { readonly kind: 'stop' }

export interface LabProgressResult<T = JsonValue> {
  readonly state: LabProgressState
  readonly records: LabScopedRecordIds
  readonly value?: T
  readonly reason?: string
  readonly nextActor?: LabNextActor
  readonly allowedActions: readonly LabAllowedAction[]
}
```

`completed` 不得有 `nextActor`；其他状态必须有且只有一个 `nextActor`，并至少有一个 `allowedActions`。人工门禁必须包含已注册的 workbench destination；capability unavailable 必须包含对应恢复事件；不得返回会被 policy 拒绝的 Agent tool。

## 实施批次

### 批次 1：Workspace 自动映射与 Project 入口协调器

**覆盖任务：** 2.9。

**新增：** `packages/experimental/lab-application/` 的 package、Service、invariant、测试和双语 README。

**修改：** `lab-domain/src/{index,project}.ts`、`lab-project/src/index.ts` 及测试、`lab-runtime/src/{index,types}.ts`、`lab-runtime-local/src/index.ts` 及测试、`lab-mvp/src/index.ts` 及 composition 测试、相关 package/subsystem 文档。

**步骤：**

1. 先写失败测试：同一 Workspace 两次 resolve 只产生一个 LabProject；未映射 Session 自动创建 Project 并 attach；跨 Workspace 的显式 Project/Session 返回冲突。
2. 给 `LabProjectService` 增加按 Workspace 的明确查询和 `createExperimentOnce()`；幂等 key 必须进入持久状态和 schema，不能只放内存 Map。
3. 将 Runtime 相同 Experiment request 的重复注册改为成功返回，冲突 request 仍失败；同步 Service Definition、local Provider、JSDoc 和测试。
4. 实现 `resolveProjectEntry()`：解析 Session Workspace，创建/复用 LabProject，attach Session，校验显式 Project/Experiment/Run 均属于同一链。
5. 实现 `bootstrapExperiment()`：按 requestId 创建/复用 Project Experiment，幂等登记 Runtime，只在首次创建时追加 `lab/project/experiment-created` 与 `lab/experiment/requested`。
6. 在 `lab-mvp` 中于 Project 和 Runtime 就绪后注册 application service，并为缺少依赖增加 load-time invariant。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run packages/experimental/lab-project/tests/service.spec.ts packages/experimental/lab-runtime-local/tests/provider.spec.ts packages/experimental/lab-application/tests/service.spec.ts packages/experimental/lab-mvp/tests/composition.spec.ts --reporter=verbose
```

**退出条件：** 自动映射、attach、跨范围拒绝、Project 提交后 Runtime 响应丢失再重试均通过；没有浏览器提供的业务 ID。

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

**修改：** `tool-lab-project/src/index.ts`、测试和双语 README，`examples/lab-web/cordis.patch.yml`；新增 `examples/lab-web/tests/lab-agent-prompt.snapshot.ts` 及 fixture。

**步骤：**

1. 每个 LABWEAVE Agent scope 注册 `systemPrompt.section({ name: 'labweave:role', order: 90, ... })`；不得用 `complete` 或注册 `deployment:persona`。
2. 固定身份和顺序：当前实验 Project 的规划、协调与解释者；第一步 `lab_project_context`；Experiment→Knowledge/capability→Plan/Skill proposal→等待人工 approval/Run start→monitor/replan→report。
3. 固定权限：Agent 只创建 Experiment、读 context/Knowledge/capability、提出 Plan/Skill、监控/replan/report；human 调整和批准 Plan/Skill、启动 Run、确认人工步骤、发布 verdict；Runtime 执行批准图。
4. `nextActor: human|runtime|capability` 时解释原因并 `exec.concludeTurn()`，不得轮询或改用禁用工具。
5. 动态 context 继续由 `lab/agent/context-read` 记录，不拼入静态 prompt；snapshot 从 Session event 重建。
6. snapshot 断言 laboratory profile 含 `labweave:role`，default profile 不含，Harness identity/persona/tool protocol 顺序不变。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run packages/experimental/tool-lab-project/tests/tool-lab-project.spec.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run --config ./vitest.snapshot.config.ts examples/lab-web/tests/lab-agent-prompt.snapshot.ts --reporter=verbose
```

**退出条件：** Agent prompt 明确身份、流程、权限和 yield；default profile 无 LABWEAVE 文案；Project context 可由 durable event 重建。

### 批次 4：Agent 创建 Experiment 与 typed progress/no-dead-end

**覆盖任务：** 10.10、10.11、10.12。

**新增：** `lab-domain/src/progress.ts`、`lab-application/tests/progress-matrix.spec.ts`。

**修改：** `tool-lab/src/index.ts`、测试和 package；`lab-mvp-web/src/{index,project-protocol}.ts` 及测试；`ui-lab-workbench` adapter/API/Host adapter/workbench projection；相关 README 和 subsystem 对侧。

**步骤：**

1. 删除 `lab_experiment_propose` 注册、描述、测试和配置引用。
2. 从 `HUMAN_ACTION_TOOLS` 删除 `lab_experiment_create`，保留 approval、Run start/step/confirm 的人工限制。只读 report 与 verdict 发布必须分开，不能含糊放权。
3. `lab_experiment_create` 只接收 `title`、`objective`、`expected_outputs`，使用 calling Session 和 `exec.rootCallId` 调用 `bootstrapExperiment()`。
4. Agent tool、Facade action 和 lifecycle projection 统一返回 `LabProgressResult`，不再解析 message 字符串。
5. pending request 去重键固定为 `projectId + experimentId + action kind + target revision/step`；同一门禁只写一次 event，已有 pending 时返回原 workbench action 并 `concludeTurn()`。
6. human action 完成后追加 durable approval/start/confirmation event；下一 Agent turn 从 projection 得到 `nextActor: agent`，不使用浏览器内存 continuation。
7. 表驱动矩阵覆盖：Workspace 未映射、Project 无 Experiment、bootstrap 结果丢失重试、缺输入、Knowledge/device/planning/Runtime unavailable、Plan/Skill 待审批、拒绝后修订、待人工 Run start、人工步骤确认、Workspace/Session 切换恢复、capability 恢复。
8. 每行断言 state、records、唯一 nextActor、非空 allowedActions、合法且属于当前 Project 的 workbench destination，并断言 Agent 不调用 policy 禁用工具。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run packages/experimental/tool-lab/tests/tool-lab.spec.ts packages/experimental/lab-application/tests packages/experimental/lab-mvp-web/tests/facade.spec.ts packages/experimental/lab-mvp-web/tests/project-protocol.spec.ts packages/client/ui-lab-workbench/tests/host-adapter.contract.client.spec.ts --reporter=verbose
```

**退出条件：** Agent 可幂等创建 Experiment 但不能启动 Run；每个非终态有一个下一 actor 和至少一个真实动作；人工门禁只产生一次请求并结束 Agent turn。

### 批次 5：真实 Agent 工具链的 composed/keyless 验收

**覆盖任务：** 10.13。

**修改：** `examples/lab-web/tests/host-lifecycle.snapshot.ts`；新增 `agent-lifecycle.snapshot.ts` 及 snapshots；仅为 fixture/bootstrap 扩展 `apps/web/tests/lab-full-lifecycle.e2e.ts`。

**步骤：**

1. 组装真实 `cordis.patch.yml`，用 deterministic model response 驱动 Agent 执行真实 `lab_project_context`、`lab_experiment_create`、Knowledge/planning tools。
2. 断言同一 Host ID 链贯穿 Workspace、Session、Project、Experiment、Plan/Skill proposal、Run、Artifact、verdict 和 report。
3. 在 Plan/Skill approval 与 Run start 前断言 pending action 只出现一次、tool result 为 `nextActor: human`、Agent turn 已结束。
4. 通过 Host/UI human action 继续，再开启下一 Agent turn；不得直接调用 Runtime 私有方法。
5. `/api/lab` 场景只保留为 Host API 集成测试，测试名与 README 明确其不完成 Agent 验收。

**验证：**

```sh
node node_modules/vitest/vitest.mjs run --config ./vitest.snapshot.config.ts examples/lab-web/tests/host-lifecycle.snapshot.ts examples/lab-web/tests/agent-lifecycle.snapshot.ts --reporter=verbose
```

**退出条件：** 至少一条 keyless snapshot 真实执行 `lab_*` tool，并证明 Agent 在人工门禁处 yield 后由下一 turn 继续。

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
node node_modules/vitest/vitest.mjs run packages/client/ui-lab-workbench/tests packages/experimental/lab-application/tests packages/experimental/lab-project/tests packages/experimental/tool-lab/tests packages/experimental/tool-lab-project/tests packages/experimental/lab-mvp-web/tests packages/experimental/lab-mvp/tests --reporter=verbose
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

**退出条件：** OpenSpec verify 无 CRITICAL/WARNING；17 个剩余任务均有源码、自动化测试或人工浏览器证据；此后才允许 `openspec-archive-change`。

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
