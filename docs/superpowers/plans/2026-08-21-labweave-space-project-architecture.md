# LabWeave 空间、项目与实验流程架构实施计划

> **执行要求：** 按阶段逐项实施，每完成一个阶段先运行对应验证，再进入下一阶段。保持单文件 HTML 交付，代码注释使用中文，不新增未确认的业务文案与后端逻辑。

**目标：** 将当前混合侧栏和共享鼠脑实验数据的 Demo，改造成工作台、配置中心、项目空间三种清晰上下文，并让不同实验项目拥有独立 Workflow、执行记录、步骤结果和归档状态。

**架构：** 使用一套前端应用状态维护当前页面上下文；用 `projectDefinitions` 保存项目稳定定义，用 `projectRuntimeStates` 按项目 ID 保存运行态，用 `returnContext` 支持配置中心返回来源。页面仍由原生 HTML、CSS、JavaScript 渲染，不引入框架。

**技术栈：** 单文件 HTML、CSS、原生 JavaScript；Node.js 静态语法检查；浏览器关键路径回放；OpenSpec 严格校验。

**设计依据：** `docs/superpowers/specs/2026-08-21-labweave-space-project-architecture-design.md`

**规范检查：** 工作区未发现 Web 对应的 `*-rules-lite` 文件，因此沿用现有组件和样式体系，不额外引入平台规则。

---

## 阶段一：重建页面层级与导航外壳

### 任务 1：将侧栏拆为三种互斥上下文

**文件：**

- 修改：`outputs/Agent实验Workflow_AI_Native/index.html:19-105`
- 同步：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 在 CSS 中增加工作台菜单、配置中心菜单、项目菜单和底部动作区的显示状态样式。
2. 保留现有 `.nav-item`、`.nav-scroll`、`.sidebar-foot` 等组件，避免重做侧栏视觉体系。
3. 将当前混合菜单拆为三个容器：
   - `workspaceNav`：首页、项目管理、跨项目执行监控。
   - `configNav`：配置总览、知识库、Agent、Workflow、设备管理、人员与权限。
   - `projectNav`：项目总览、实验规划、计划确认、执行监控、步骤编排、结果与判断、实验归档。
4. 在工作台和项目菜单底部增加同一个“配置中心”齿轮按钮。
5. 在项目菜单底部增加“返回项目管理”；在配置中心头部或底部增加“返回工作台 / 返回原项目”。
6. 删除“全局能力与当前项目同时展开”的旧侧栏结构，不增加工作空间下拉切换器。
7. 保留用户信息和“本页面为交互演示”说明。

**静态验证：**

```bash
rg -n "id=\"workspaceNav\"|id=\"configNav\"|id=\"projectNav\"|配置中心|返回项目管理" outputs/Agent实验Workflow_AI_Native/index.html
rg -n "工作空间.*下拉|切换空间" outputs/Agent实验Workflow_AI_Native/index.html
```

预期：三个导航容器和两个明确出口存在；第二条命令无结果。

### 任务 2：增加配置中心总览页和项目总览页

**文件：**

- 修改：`outputs/Agent实验Workflow_AI_Native/index.html:106-203`
- 同步：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 新增 `page-config`，只提供五类全局能力的状态摘要和进入按钮，不重复渲染模块菜单。
2. 新增 `page-project-overview`，展示当前项目目标、实验类型、当前阶段、规划完善度、Workflow 版本、执行进度、异常和下一步。
3. 新增 `page-results`，将“结果与判断”从执行页的局部节点提升为项目内独立页面，同时仍从执行步骤结果中读取数据。
4. 首页“设备能力”快捷按钮改为通过配置中心上下文进入设备页，避免工作台直接混入配置页面。
5. 保持规划页和执行页已有布局，不在本任务中重写其内容。

**静态验证：**

```bash
rg -n "page-config|page-project-overview|page-results" outputs/Agent实验Workflow_AI_Native/index.html
```

预期：三个页面容器各出现一次。

### 任务 3：实现页面上下文与返回逻辑

**文件：**

- 修改：`outputs/Agent实验Workflow_AI_Native/index.html:225-265`
- 同步：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 在应用状态中增加 `shell: 'workspace' | 'config' | 'project'` 和 `returnContext`。
2. 新增 `renderNavigationShell()`，根据 `state.shell` 只显示一套菜单，并同步顶栏标题和项目上下文。
3. 新增 `openConfig(page, context)`：保存来源后进入配置中心指定模块。
4. 新增 `leaveConfig()`：按 `returnContext` 返回工作台或原项目原页面。
5. 新增 `leaveProject()`：保存项目运行态后进入项目管理，不清空项目数据。
6. 重构 `showPage()`：配置页自动使用配置中心外壳，项目页自动使用项目外壳，工作台页面自动使用工作台外壳。
7. 确保移动端每次导航后收起侧栏，侧栏关闭按钮、遮罩和菜单按钮继续复用同一逻辑。
8. 将所有 `showPage('knowledge')`、`showPage('workflows')`、`showPage('devices')` 等跨上下文调用替换为 `openConfig()`，并传入项目缺口来源。

**行为验证：**

1. 首页只出现工作台菜单。
2. 点击齿轮只出现配置菜单。
3. 从配置中心返回后回到首页或进入前的工作台页面。
4. 进入项目后只出现项目菜单。
5. 从项目缺口进入配置中心，发布或返回后回到原项目原阶段。

---

## 阶段二：隔离项目数据并对齐不同实验流程

### 任务 4：建立项目定义与运行态模型

**文件：**

- 修改：`outputs/Agent实验Workflow_AI_Native/index.html:204-258`
- 同步：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 将全局 `workflowData`、`executionEvents`、`originalOrchestration` 拆入各项目定义。
2. 建立 `projectDefinitions`，每个项目至少包含：
   - 项目基本信息和实验类型。
   - Workflow ID、版本、步骤和依赖。
   - 对应执行事件与每一步结果证据。
   - 编排步骤和资源需求。
   - Demo 缺口场景。
3. 建立 `projectRuntimeStates`，按项目 ID 保存规划对话、完善度、计划版本、执行游标、步骤结果、异常、重规划历史、判断和归档。
4. 编写 `createProjectRuntime(projectDefinition)`，运行态缺失时从当前项目定义初始化，禁止回退到鼠脑项目状态。
5. 编写 `getCurrentProjectDefinition()` 和 `getCurrentProjectRuntime()`，页面渲染只通过这两个入口取项目数据。
6. 保留全局知识库、Agent、Workflow 模板、设备和人员集合；项目仅保存引用与锁定版本。

**静态验证：**

```bash
rg -n "const projectDefinitions|const projectRuntimeStates|function createProjectRuntime|function getCurrentProjectDefinition" outputs/Agent实验Workflow_AI_Native/index.html
rg -n "projectStates\[id\]\|\|projectStates\['EXP-2026-0417'\]" outputs/Agent实验Workflow_AI_Native/index.html
```

预期：新模型入口存在；旧的鼠脑项目兜底表达式不存在。

### 任务 5：为四类实验配置独立 Workflow 和记录

**文件：**

- 修改：`outputs/Agent实验Workflow_AI_Native/index.html:204-240, 340-390`
- 同步：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 鼠脑空间转录项目使用：样本制备、组织切片、透化与空间捕获、逆转录、cDNA 扩增、文库质控、归档。
2. 空间 ATAC 项目使用：样本与切片、染色成像、细胞核提取与质控、转座与空间条形码、ATAC 文库构建、测序数据与质控。
3. SeekOne DD 单细胞项目使用：细胞悬液质控、芯片上样、液滴包裹、逆转录、cDNA 扩增、文库构建、文库质控。
4. 客户自定义实验保留自定义 SOP 与隐性经验缺口，使用独立的自定义步骤集合。
5. 肾脏切片质控归档项目可以保留为第五个只读示例，但必须有自己的质控流程和归档结果，不复用鼠脑记录。
6. 为每个执行步骤补充结果、放行规则、证据、Executor 和状态示例。
7. `parallelExperiments` 只保留跨项目摘要；详细流程改为读取 `projectDefinitions`。

**内容验证：**

```bash
rg -n "空间 ATAC|转座与空间条形码|SeekOne DD|液滴包裹|客户自定义" outputs/Agent实验Workflow_AI_Native/index.html
```

预期：各实验特有步骤存在于各自定义中。

### 任务 6：重写项目选择、保存和恢复流程

**文件：**

- 修改：`outputs/Agent实验Workflow_AI_Native/index.html:241-270`
- 同步：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 重写 `saveProjectState(projectId)`，只保存指定项目运行态。
2. 重写 `loadProjectState(projectId)`，只加载指定项目定义和运行态。
3. 重写 `selectProject(projectId, targetPage)`，严格执行“保存当前 → 校验目标 → 加载目标 → 进入项目外壳 → 渲染目标页”。
4. 移除 `renderProjectPlanning()` 对 `EXP-2026-0417` 的专用分支，改为使用同一页面骨架渲染不同项目配置。
5. 为信息完整项目提供直接生成计划路径；为有缺口项目展示对应知识或 Workflow 缺口。
6. 项目管理卡片、首页最近项目和跨项目监控的入口全部调用同一个 `selectProject()`。
7. 项目不存在时返回项目管理并提示，不进入其他项目。

**行为验证：**

1. 依次进入鼠脑、ATAC、SeekOne DD、客户自定义项目。
2. 每次离开前推进一个不同阶段。
3. 再次进入各项目，确认阶段和记录分别恢复。
4. 确认鼠脑项目始终可进入，且不会展示其他项目 Workflow。

### 任务 7：让规划、确认、执行、编排、结果和归档读取当前项目

**文件：**

- 修改：`outputs/Agent实验Workflow_AI_Native/index.html:269-390`
- 同步：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 重构 `renderPlanning()`：目标、问题、缺口、流程卡和资源编排读取当前项目配置。
2. 重构 `renderWorkflowTrack()`：读取当前项目 Workflow，不写死 8 个鼠脑 Workflow。
3. 重构 `renderExecution()`：读取当前项目执行事件和步骤结果，动态显示步骤总数。
4. 合并重复的 `triggerReplan()`，保留具有执行边界校验的新实现。
5. 重构 `currentExecutionWorkflow()`、`boundaryMessage()` 和编排函数，读取当前项目执行定义。
6. `renderResults()` 汇总当前项目步骤结果、证据和最终判断。
7. `completeArchive()` 只在当前项目所有必需结果通过后生成当前项目档案。
8. 确认页和归档页的样本数、流程数、时间和实验名称均来自当前项目，不再硬编码鼠脑项目文案。

**静态验证：**

```bash
rg -n "function triggerReplan" outputs/Agent实验Workflow_AI_Native/index.html
rg -n "完整空间转录组实验|12 份|0 / 8|/ 8" outputs/Agent实验Workflow_AI_Native/index.html
```

预期：`triggerReplan` 只定义一次；项目通用渲染函数中不再出现鼠脑专用硬编码，鼠脑文案只存在于对应项目定义或其 Demo 对话中。

---

## 阶段三：完善配置闭环、执行边界与最终验证

### 任务 8：让配置中心保留来源并回填项目

**文件：**

- 修改：`outputs/Agent实验Workflow_AI_Native/index.html:390-469`
- 同步：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 知识库列表、详情和录入流程保持现有内容，但从项目缺口进入时高亮对应知识库和条目。
2. 知识发布后更新全局知识库版本，并将新版本显式写入来源项目的引用。
3. Workflow 草案根据来源项目和实验类型生成；发布后写入全局模板，再由来源项目接受版本。
4. 设备接入完成后更新全局设备能力；来源 Workflow 重新选择 Executor 后再返回项目。
5. 人员与权限保持全局配置，不新增未确认的组织逻辑。
6. 所有配置页面的返回动作调用 `leaveConfig()`，删除写死返回鼠脑规划页的内联调用。
7. 配置总览展示各能力状态与缺口数量，但不复制各模块完整内容。

**行为验证：**

1. 从鼠脑项目知识缺口进入知识库，发布后返回鼠脑规划原阶段。
2. 从客户自定义项目 Workflow 缺口进入 Workflow，发布后返回客户项目。
3. 从 Workflow 的设备缺口进入设备管理，完成后返回 Workflow，再返回来源项目。
4. 直接从工作台齿轮进入配置中心，返回后不进入任何项目。

### 任务 9：强化执行步骤结果与重规划版本

**文件：**

- 修改：`outputs/Agent实验Workflow_AI_Native/index.html:300-390`
- 同步：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 每个步骤结果统一展示状态、Executor、时间、产物、指标、证据和判断。
2. 结果缺失时禁止步骤通过和项目归档。
3. 已开始和已完成步骤在编排页锁定，不允许拖拽、移动或修改 Executor。
4. Agent 重规划和人工编排都生成新的计划版本及差异摘要。
5. 新版本未确认前保留当前执行队列；确认后只替换未执行部分。
6. 结果与判断页显示所有步骤结果、异常处置和最终判断；通过后开放归档。

**行为验证：**

1. 启动 SeekOne DD 项目并推进至异常节点。
2. 验证已执行步骤锁定，未执行步骤可编排。
3. 让 Agent 重规划，确认 v1.1 差异只影响后续步骤。
4. 结果未判断时归档入口受限；通过后归档可用。

### 任务 10：同步 OpenSpec 与施工说明

**文件：**

- 修改：`openspec/changes/ai-native-experiment-workflow-demo/specs/progressive-capability-navigation/spec.md`
- 修改：`openspec/changes/ai-native-experiment-workflow-demo/specs/experiment-project-management/spec.md`
- 修改：`openspec/changes/ai-native-experiment-workflow-demo/specs/experiment-execution-monitoring/spec.md`
- 修改：`openspec/changes/ai-native-experiment-workflow-demo/tasks.md`
- 修改：`outputs/Agent实验Workflow_AI_Native/施工方案.md`

**实施步骤：**

1. 更新导航规范：配置中心齿轮入口、三种互斥菜单、来源返回逻辑。
2. 更新项目管理规范：项目定义与运行态隔离、可重复进入、不同 Workflow。
3. 更新执行规范：步骤结果字段、已执行边界和版本化重规划。
4. 在任务列表新增本轮三阶段改造项，并在实施验证完成后勾选。
5. 更新施工说明中的信息架构，删除“全局配置作为顶层菜单与项目菜单并列”的旧描述。
6. 运行严格校验。

**验证命令：**

```bash
openspec validate ai-native-experiment-workflow-demo --strict
```

预期：校验通过且没有规范冲突。

### 任务 11：静态检查、浏览器回放和双副本一致性

**文件：**

- 验证：`outputs/Agent实验Workflow_AI_Native/index.html`
- 验证：`work/Agent实验Workflow_AI_Native/index.html`

**实施步骤：**

1. 提取内联 JavaScript 并通过 Node.js 语法检查。
2. 解析 HTML，检查重复 ID 和关键页面容器。
3. 静态检查项目定义、独立 Workflow、配置返回入口、结果字段和唯一 `triggerReplan()`。
4. 在浏览器回放以下关键路径：
   - 首页 → 新建/进入项目 → 项目总览。
   - 项目管理 → 四个不同项目 → 返回 → 再次进入。
   - 项目缺口 → 配置中心 → 发布 → 返回原项目。
   - 信息完整项目 → 规划确认 → 执行 → 结果 → 归档。
   - 异常 → Agent 重规划 / 人工编排 → 新版本确认。
   - 移动端菜单打开 → 导航 → 自动收起 → 再次打开。
5. 检查浏览器控制台无 JavaScript 错误。
6. 将完成版本同步到工作副本并比较两个文件完全一致。

**验证命令：**

```bash
node --check /tmp/labweave-inline.js
cmp outputs/Agent实验Workflow_AI_Native/index.html work/Agent实验Workflow_AI_Native/index.html
```

预期：JavaScript 语法通过；两个 HTML 无差异。

## 阶段完成条件

### 阶段一完成条件

- 三种侧栏上下文互斥显示。
- 配置中心只有齿轮入口，没有空间下拉。
- 项目可以进入、退出，配置可以按来源返回。

### 阶段二完成条件

- 四类实验具有独立 Workflow、执行记录和结果。
- 项目切换不会串数据。
- 鼠脑项目可以稳定重复进入并恢复状态。

### 阶段三完成条件

- 配置缺口形成完整往返闭环。
- 已执行步骤边界和结果证据规则生效。
- OpenSpec、静态检查、浏览器关键路径和双副本一致性全部通过。
