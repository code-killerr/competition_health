# AI Native 实验工作台三阶段修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有单 HTML AI native 演示中建立项目隔离、阶段门禁、执行重规划闭环，并补齐参考控制台风格的项目和设备工作台。

**Architecture:** 保留单文件交付，但把状态拆成“全局能力状态 + 项目状态映射”。`showPage` 只负责路由和渲染，`selectProject` 负责项目上下文，`canEnterPage` 负责阶段门禁；Workflow 数据是确认页、执行页和归档页的唯一来源。

**Tech Stack:** HTML、CSS、原生 JavaScript；静态脚本解析与浏览器 DOM 回放验证。

---

### Task 1: 建立项目状态容器与路由门禁

**Files:**
- Modify: `outputs/Agent实验Workflow_AI_Native/index.html:156-216`
- Modify: `work/Agent实验Workflow_AI_Native/index.html:156-216`

- [ ] **Step 1: 增加项目状态工厂与当前项目访问器**

在原有 `state` 之前增加 `createProjectState()`，将规划、知识、Workflow、设备、执行、结果和编排字段归入每个项目；保留 `state.currentProject`、`state.page`、`state.planCollapsed` 等全局导航字段。

- [ ] **Step 2: 将主项目和其他实验映射到独立项目状态**

新增 `projectStates`，主项目初始为规划第 0 步，运行中项目初始为执行阶段，已完成项目初始为归档阶段。所有渲染函数通过 `activeProject()` 获取当前项目，不再直接读取唯一全局执行状态。

- [ ] **Step 3: 增加页面门禁**

实现 `canEnterPage(name)`：规划确认要求 `planComplete`，执行要求 `planLocked`，归档要求 `resultStatus==='passed'`；不满足时回到项目规划并显示原因 Toast。`showPage` 不再强制把项目切回主项目。

- [ ] **Step 4: 统一项目选择和重播重置**

实现 `selectProject(id)` 和 `resetProjectState(id)`，项目列表、项目总览、并行监控和侧栏均调用同一入口。重播必须清理 executionStep、replanned、manualChanged、orchestrationSteps、resultStatus 和计划折叠状态。

- [ ] **Step 5: 静态验证阶段一**

运行 `rtk node` 解析脚本，检查 `showPage` 不再包含强制项目赋值，并检查重播函数包含执行、重规划和编排字段的重置。

### Task 2: 统一 Workflow 执行图与结果状态

**Files:**
- Modify: `outputs/Agent实验Workflow_AI_Native/index.html:172-184,248-283`
- Modify: `work/Agent实验Workflow_AI_Native/index.html:172-184,248-283`

- [ ] **Step 1: 为每个 Workflow 增加稳定 ID 和依赖字段**

把 `workflowData` 扩展为对象数组，保留名称、描述和 Executor，并增加 `id`、`dependsOn`、`resultRule`；WF-01 至 WF-08 必须连续。

- [ ] **Step 2: 从 Workflow 生成执行事件**

新增 `buildExecutionEvents(project)`，按 Workflow 顺序生成 `executionEvents`，保证 WF-03 逆转录在执行时间线中出现，确认页、执行页和归档页都引用同一组数据。

- [ ] **Step 3: 增加显式结果状态**

为项目增加 `resultStatus`、`resultMessage` 和 `resultChecks`。执行到 QC 节点后展示“通过 / 失败”操作；通过才可归档，失败进入重规划。

- [ ] **Step 4: 让 Agent 重规划修改后续队列**

实现 `replanProject(reason)`：复制当前 Workflow 队列，调整纯化准备与 PCR 的依赖/资源，生成 v1.1 差异，并从重规划后的节点继续执行。

- [ ] **Step 5: 将归档改为结果驱动**

`completeArchive()` 只在 `resultStatus==='passed'` 时更新归档；归档内容读取项目当前版本、风险处理、结果判断和资源记录，不再写死“文库 QC 通过”。

### Task 3: 让步骤编排和资源状态真正联动

**Files:**
- Modify: `outputs/Agent实验Workflow_AI_Native/index.html:228-264`
- Modify: `work/Agent实验Workflow_AI_Native/index.html:228-264`

- [ ] **Step 1: 将设备占用转换为资源可用性数据**

增加 `deviceRegistry`，每台设备包含 `id`、`type`、`status`、`connectionStatus`、`enabled`、`capabilities`、`currentExperiment`；资源编排通过设备 ID 查询，而不是使用静态文案。

- [ ] **Step 2: 增加资源冲突提示**

根据当前项目和其他项目的占用状态生成冲突列表；可用设备、被占用设备和预计释放时间必须在项目规划确认中展示。

- [ ] **Step 3: 增加步骤依赖校验**

实现 `validateOrchestration(steps)`，阻止前置步骤之后的步骤被移动到前面，并在编排页显示具体冲突原因。

- [ ] **Step 4: 将手动调整回写执行计划**

手动排序或更换 Executor 后更新项目版本、执行事件和资源摘要；Agent 重生成也复用同一套更新函数。

### Task 4: 对齐项目总览与实验列表

**Files:**
- Modify: `outputs/Agent实验Workflow_AI_Native/index.html:266-280,354-355`
- Modify: `work/Agent实验Workflow_AI_Native/index.html:266-280,354-355`

- [ ] **Step 1: 增加项目总览页**

渲染当前项目卡片、实验总数、规划中/执行中/已完成数量、设备占用和最近实验列表，提供“新建实验”“进入当前项目”“设备管理”入口。

- [ ] **Step 2: 增加项目列表搜索和状态筛选**

复刻参考实验管理中的搜索框、状态筛选和表格字段：项目 ID、名称、状态、进度、证据链、创建时间、详情/切换。

- [ ] **Step 3: 修正非主项目入口**

非主项目的“查看项目规划”进入对应项目规划上下文；运行中项目进入执行监控；归档项目进入只读归档，按钮文案与行为保持一致。

### Task 5: 对齐设备管理与能力模型

**Files:**
- Modify: `outputs/Agent实验Workflow_AI_Native/index.html:350`
- Modify: `work/Agent实验Workflow_AI_Native/index.html:350`

- [ ] **Step 1: 增加设备统计、搜索和筛选**

设备页显示设备总数、在线、维护中、离线；增加设备名称/ID 搜索、类型筛选和状态筛选。

- [ ] **Step 2: 增加设备列表字段**

列表展示设备 ID、名称、类型、Executor 能力、接口策略、当前状态和当前占用项目，并提供编辑/查看详情入口。

- [ ] **Step 3: 增加能力模型卡片**

展示动作、参数、前置条件和禁止操作，供 Workflow 绑定时读取。

- [ ] **Step 4: 修正设备接入状态**

把通讯测试通过、启用、通讯中断、T7 人工回报拆成独立状态；中断时显示人工兜底，不显示自动设备已启用。

### Task 6: 配置状态回填与验证

**Files:**
- Modify: `outputs/Agent实验Workflow_AI_Native/index.html:289-352,354-355`
- Modify: `work/Agent实验Workflow_AI_Native/index.html:289-352,354-355`

- [ ] **Step 1: 按知识库 ID 保存录入状态**

发布知识后只更新当前知识库和关联项目，不再把空间转录组内容写入其他知识库；详情页条目状态与录入流程同步。

- [ ] **Step 2: 保存 Agent、Workflow 和人员配置**

配置页的表单值写入全局配置状态；项目显示当前引用的 Agent、Workflow 版本、设备和人员。

- [ ] **Step 3: 增加全量静态验证**

执行：JS `new Function` 解析、重复 ID 检查、Workflow/执行事件数量一致性、关键按钮 handler 检查、设备 fallback 文案检查。

- [ ] **Step 4: 浏览器回放验证**

验证项目切换、规划门禁、知识补齐回填、Workflow 生成、设备人工兜底、执行失败重规划、结果通过后归档，以及设备/项目列表搜索筛选。
