# LABWEAVE 原生工作区后续实施计划

[English](2026-08-28-lab-showcase-ready-workspace-implementation-plan.md) | 中文

> **执行规则：** 本文说明 Luna 应如何完成 OpenSpec change `lab-showcase-ready-workspace` 的剩余工作。[tasks.md](../../../openspec/changes/lab-showcase-ready-workspace/tasks.md) 是唯一权威完成状态。必须按任务编号执行，不能因为独立组件、fixture 或截图存在就勾选任务。

## 权威来源与完成状态解释

修改代码前必须阅读 proposal、design 和四份 capability spec。当前工作树已有大量改动，每个批次开始前先检查现有 diff，保留无关工作。

0–3 阶段是已经完成的 Host 基础。4 阶段只剩 4.3。5–7 阶段建立了可复用导航、Session 持续挂载、typed projection 和生命周期组件；这些勾选状态不代表当前分屏页面是最终方案。第 8 阶段就是要替换这个呈现。7.3 和 7.4 继续完成可复用生命周期卡片，但不要求保留默认 Conversation 页面。

不要因为某个已完成能力的第一版外观被删除就重开基础任务。应保留其 contract 和测试，只替换第 8 阶段明确列出的 LABWEAVE composition。

## 目标组合

```text
AppFrame
├── LABWEAVE sidebar
│   ├── Global execution monitor
│   ├── Projects
│   │   └── Project
│   │       ├── Overview
│   │       ├── Planning / Workflow
│   │       ├── Plan approval
│   │       ├── Execution monitoring
│   │       ├── Step orchestration
│   │       ├── Results / Evidence
│   │       └── Archive
│   └── Configuration
│       ├── Knowledge
│       ├── Agent
│       ├── Workflow / Lab Skill
│       ├── Devices
│       └── People / permissions
└── LABWEAVE application view
    ├── Project / Experiment / Run context
    ├── lifecycle workbench
    ├── compact bottom Agent dock
    └── expandable Agent timeline
```

LABWEAVE 负责可见应用外壳。它复用 Harness conversation 能力，而不是保留默认 Conversation 外观。LABWEAVE profile 不得显示原始 hero、header、context strip、超大 composer 或永久相邻 Agent 列。

最终页面只能有一个 Session、一个 input DOM 和一个 draft。输入必须使用 Harness input state machine，确保 queue、slash command、reference、attachment、access/model control、ask-user 和 approval takeover 继续工作。不得用 CSS 隐藏旧 composer 后再挂另一个 textarea，也不得直接调用低层 send 方法。

## 所有权与数据流

- `ui-layout` 负责根应用视图的选择和挂载。
- `ui-sidebar` 负责导航 seat 和侧栏行为，不负责实验业务记录。
- `ui-conversation` 负责可复用 Session input、timeline 和 interaction presentation contract。非实验 profile 的默认组合必须保持不变。
- `ui-lab-workbench` 负责 LABWEAVE composition、生命周期目的地、monitor projection 和 Agent dock chrome。
- `ui-lab-knowledge-workspace` 继续负责 Knowledge 导入、检索和 SOP 审阅。LABWEAVE 只把它放到 Configuration 下。
- `LabUiContext` 只负责 presentation selection。它可以保存 active Project、destination、Experiment、Run、selected Session node 和 Agent pane state，不能保存领域记录。
- `LabWorkbenchAdapter` 提供 typed records 和 actions。fixture 与 Host 实现必须满足同一 contract。
- Host Project、Runtime、Knowledge、Session 和 Workspace 服务继续对 identity 和 state 负责。
- 全局 monitor 只是状态和导航投影，不负责跨 Project 调度或执行控制。
- People/permissions 只能显示注册能力数据、read-only 或 unavailable，禁止伪造用户、角色或授权。

## 施工顺序

### 步骤 1：完成窄查询和可复用生命周期卡片

依次完成 4.3、7.3 和 7.4。

移除生产环境对 `snapshot(experimentId)` 的使用。增加新目的地所需的 Project、Experiment、Workflow/Plan、Lab Skill、Run、Evidence/Artifact 和 result 窄查询。Run detail 必须接收 Run ID，不能从 Experiment 隐式推断“当前 Run”。

把 command card 和 durable node card 实现为可复用 renderer。它们必须展示命令特定字段、调用 typed action 并携带 record link。既要在默认 conversation 测试组合中验证，也要在 assembled LABWEAVE timeline 中验证。

退出条件：同一 Session event projection 可以在两种呈现中重建卡片，且任何卡片都不依赖旧页面布局。

### 步骤 2：恢复可信的浏览器产物

在判断或实现剩余视觉任务前完成 8.2–8.4。

检查 `packages/client/ui-lab-workbench/package.json`、client export、TypeScript compiler face、`lib/client.js`、Web dist 和 `examples/lab-web` 启动链。修复阻止当前源码进入浏览器的构建依赖。增加确定性 freshness check：要么构建所需产物，要么用可执行诊断明确失败。

证据必须记录 source revision、client artifact revision、launch command 和浏览器可见的 LABWEAVE marker。新进程、HTTP 200 或根 HTML 都不够。如果浏览器仍提供旧 bundle，立即停止后续视觉开发。

### 步骤 3：抽取可复用 conversation presentation contract

创建新 Agent dock 前先完成 8.5。

从 `ui-conversation` 暴露可复用且由正式能力驱动的组成：Session context、input state、submit path、draft、queue、slash/reference/attachment handling、access/model control、interaction takeover、timeline 和 node renderer。优先提供小而明确的 service/component contract，不得把私有 store 复制到 `ui-lab-workbench`。

增加 assembled tests：

- LABWEAVE 只有一个 input DOM；
- 切换 Project destination 时 draft 不丢失；
- slash command、reference 和 attachment 通过正式输入路径提交；
- ask-user 与 approval takeover 可操作；
- 展开 timeline 不会重挂 Session；
- 默认 profile 的组合保持不变。

退出条件：LABWEAVE 可以在不挂载默认 Conversation 页面的情况下显示空 Agent dock 和展开 timeline。

### 步骤 4：替换侧栏信息架构

完成 8.6 和 8.7。

用目标组合中的三个分组替换 Projects/Knowledge/Devices 平铺导航。Projects 从 adapter records 渲染。每个 Project 展开生命周期目的地，只显示由 Run、failure 和 approval summary 推导出的真实状态。

扩展 `LabUiContext` destination union。建立唯一且穷尽的 presentation intent/record kind 到 destination 映射。未知 destination 必须 fail loud。Conversations 仍可作为 Session provenance 访问，但不能继续作为一级 Project tab。

默认进入规则：

1. 有效时恢复上次 Project 和 destination；
2. 否则打开第一个可用 Project 的 Overview；
3. 没有 Project 时显示 Project empty/create 状态；
4. LABWEAVE profile 绝不能默认进入原始 Conversation landing page。

### 步骤 5：构建 LABWEAVE Agent surface

步骤 3 通过后才执行 8.8。

底部紧凑 dock 包含 active context、current activity、唯一输入和明确的 timeline 展开动作。展开模式在 overlay 或有界 pane 中渲染完整共享 timeline 和所有 takeover，不能形成永久第三列。

把 Project/Workspace/Experiment/Run context 从旧 header 和 input-dock strip 迁入 LABWEAVE chrome。从 LABWEAVE 可见树移除默认 hero、默认 Session header、独立 context strip 和超大 composer。非实验组合保持不变。

必须增加 DOM 和行为断言，不能只做 CSS 截图。出现两个可编辑消息输入、工作台被超大 composer 推到下方或 timeline 无法完成审批时，本步骤失败。

### 步骤 6：增加全局监控和配置中心

完成 8.9 和 8.10。

Monitor 展示跨 Project 的 active Run、current step、failure 和 pending approval。每行必须跳转到授权的 Project destination 和 record。除非后续 capability 明确提供命令，否则 monitor 不得启动、停止或重新调度多个 Project。

配置目的地按注册能力解析：

- Knowledge 打开独立所有权的 Knowledge app view，并保留 active Project scope。
- Agent 显示 active Agent/preset/model capability 和允许的配置动作。
- Workflow/Lab Skill 显示注册 revision、validation 和 activation state。
- Devices 显示可选 capability records 与 availability。
- People/permissions 显示真实数据、read-only 或 unavailable。

每个 unavailable 状态必须说明缺少哪个 capability，同时保证 LABWEAVE 其他部分可继续使用。

### 步骤 7：重新组合生命周期工作台

完成 8.11–8.14。

Overview 以生命周期为主：current goal、evidence readiness、Workflow、approval、execution、QC、report、critical path、failure 和 pending human action。统计数字只作辅助。

把现有 Experiment、Workflow、Skill、Run、comparison、Evidence、Artifact 和 report 组件迁入对应生命周期目的地。删除旧 split-page wrapper、永久 Agent rail、平铺导航、KPI-first Overview 和已经被命令专属卡片替代的通用卡片。

通过 typed presentation intent 冻结双向导航。Agent card 打开授权 record；工作台 record 定位其来源 Session node。用户导航始终可以覆盖 Agent selection。

工作台只使用一个主滚动容器，并为底部紧凑 Agent dock 预留空间。展开 timeline 可以有自己的内部滚动，但折叠 dock 不得遮挡最后一段工作台内容。测试 desktop、narrow desktop 和 tablet 尺寸。

### 步骤 8：在不改变架构的前提下补全详情

完成第 9 阶段。

Planning/Workflow 和 approval 负责 Experiment、Plan 与 Lab Skill detail。Execution monitoring 和 step orchestration 负责 Run status、parameters、graph、logs 和 recovery。Results/Evidence 与 Archive 负责 comparison、Artifact、result assessment、report 和 provenance。

不得为容纳详情增加新的 top-level tab、第二个 shell 或另一个输入框。详情放不下时，使用冻结 destination 内的 list-detail navigation 或有界 details pane。

完成 9.7 列出的所有 assembled browser tests。

### 步骤 9：接入 Host、Agent 与 Runtime

完成第 10 阶段。

用 Host adapter 替换生产 fixture adapter，同时保持组件 contract 不变。为侧栏和全局 monitor 增加窄 summary query。Agent surface 必须绑定真实 Harness Session/input path，禁止增加实验专用消息传输。

所有 Project、Experiment、Run、Artifact 和 verdict identity 由 Host 服务生成。Runtime event 通过 durable projection 同时更新工作台和 Agent timeline。Agent navigation 由 Host 校验并限制 scope。Workspace 文件写入通过 Host 授权文件操作限制在选中 Project Workspace 下。

确定性 keyless profile 与 real-provider profile 必须使用相同 UI、records、actions 和 Session event path。

### 步骤 10：完成 assembled 验收并关闭 change

完成第 11 阶段。

浏览器流程从 Project Overview 开始，使用底部 LABWEAVE Agent input，依次经过 Knowledge、Skill/Workflow、approval、execution、replanning、Evidence 和 report，并在 reload 与 Session change 后证明 Host identity 一致。

验收必须断言：

- 不存在默认 Conversation landing page 或顶部超大 composer；
- 只有一个可编辑 Agent input；
- Workspace、Project、Experiment 和 Run selection 保持同步；
- global monitor 与 Project badge 反映 Host state；
- Agent presentation intent 与用户手动导航解析到同一 record；
- Knowledge scope 通过 typed action 更新；
- 工作台可以完整滚动且不被遮挡；
- unavailable capability 保持真实；
- fixture 与 Host mode 不混用。

开发过程中只运行覆盖改动面的聚焦检查。完成前执行 11.7 列出的 OpenSpec、translation pairing、typecheck、build、snapshot、browser、documentation 和 diff 检查，然后运行 `openspec-verify-change`。

## Luna 交接检查清单

每个实现批次开始前：

1. 明确本批次对应的 OpenSpec task number；
2. 检查每个目标文件中的现有改动；
3. 说明复用了哪个已完成基础、删除了哪个临时呈现；
4. 为验收路径增加失败的聚焦测试或 assembled test；
5. 实现最小完整改动；
6. 运行聚焦检查；
7. 可见行为变化时检查真实 `examples/lab-web` 浏览器；
8. 只有任务专属证据齐全后才更新 checkbox。

真实浏览器仍存在旧共存布局时不得完成第 8 阶段。任何生产 destination 仍读取 fixture state 时不得完成第 10 阶段。只有截图、没有行为断言时不得完成第 11 阶段。
