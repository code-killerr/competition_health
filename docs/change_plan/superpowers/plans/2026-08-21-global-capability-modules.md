# 全局能力模块对齐原 HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** 将知识库、Agent、Workflow、设备接入和人员权限改造成参考原 HTML 的独立全局配置模块，并移除模块内部重复的全局菜单。

**Architecture:** 继续使用现有单文件 `index.html`、集中 `state` 和渲染函数。顶层侧栏负责模块切换；每个配置页由自己的 `renderXModule()` 生成单列内容，不再调用 `moduleMenu()`。主项目缺口状态继续由 `state` 管理，配置流程完成后回写主规划页面。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、OpenSpec、Node 静态语法校验。

---

### Task 1: 移除配置页内部重复导航并建立全局模块布局

**Files:**
- Modify: `work/Agent实验Workflow_AI_Native/index.html`（`.module-layout`、`moduleMenu`、`moduleHead` 与 5 个配置页渲染函数）

- [x] **Step 1: 删除重复菜单结构**

移除 `moduleMenu()` 在知识库、Agent、Workflow、设备接入、人员权限页面中的调用，将 `module-layout` 改为配置页单列容器；保留顶层侧栏的全局工作台导航。

- [x] **Step 2: 调整页面头与返回路径**

让配置页头部只保留标题、描述和“返回项目管理/当前项目”的操作，不再提供同一组全局模块的第二套导航。

- [x] **Step 3: 运行语法检查**

运行：`rtk node -e "const fs=require('fs');const h=fs.readFileSync('work/Agent实验Workflow_AI_Native/index.html','utf8');new Function(h.match(/<script>([\\s\\S]*)<\\/script>/)[1]);console.log('PASS')"`

预期：输出 `PASS`。

### Task 2: 迁移知识库 F1–F5 资料录入流程

**Files:**
- Modify: `work/Agent实验Workflow_AI_Native/index.html`（`renderKnowledgeModule`、知识库状态与事件）

- [x] **Step 1: 增加资料状态模型**

在现有 `state` 中增加 F1–F5 勾选、提交、上传、解析和问答进度字段；F1、F2 作为阻塞项，F3/F4 支持降级为人工回报或线下留痕，F5 记录隐性经验缺口。

- [x] **Step 2: 实现资料提交与完整性检查**

复用原 HTML 的资料项：F1 文档资料包、F2 样本与实验定义表、F3 设备台账与通讯盘点、F4 人员与流程定义表、F5 隐性经验采集表。提交按钮在阻塞项未齐时显示错误提示，齐备后展开上传区。

- [x] **Step 3: 实现模拟上传、解析摘要和缺口登记**

展示原页面对应的 13 项、156 页、107 步、621 字段、12 处冲突、23 处时间窗缺口，并登记 F5 标准图缺口。

- [x] **Step 4: 实现冲突裁决与发布回填**

提供 20 ng/μL 投入量裁决、破乳静置时间问答；完成后将 `state.knowledgeReady` 设为 `true`，刷新主项目规划页面并允许继续生成 Workflow。

### Task 3: 迁移 9 个 Agent 团队配置

**Files:**
- Modify: `work/Agent实验Workflow_AI_Native/index.html`（`renderAgentModule`、Agent 数据与配置事件）

- [x] **Step 1: 替换 Agent 数据**

使用原 HTML 的 9 个 Agent：知识库、确认问答、SOP 编译、实验管理、调度执行、设备接入、视觉判定、结果汇总、反馈优化；每项保留 W 阶段、职责、能力和输入输出。

- [x] **Step 2: 实现团队卡片和当前 Agent 详情**

页面展示 9 张团队卡；点击卡片后在同页显示知识范围、Workflow 权限、工具、人工确认边界和启用开关，不嵌套全局模块菜单。

- [x] **Step 3: 保留协作边界说明**

在详情区展示职责单一、跨职责移交、确认/裁决/署名/反馈节点等原页面协作规则，并提供保存配置按钮。

### Task 4: 迁移 Workflow 编译与设备接入流程

**Files:**
- Modify: `work/Agent实验Workflow_AI_Native/index.html`（`renderWorkflowModule`、`renderDeviceModule`、Workflow/设备状态）

- [x] **Step 1: 补充 SOP skill 编译摘要**

在 Workflow 页展示空间转录组 SOP skill v2.2 的 39 步、7 个模板、5 张决策表、DD/PCR/离心机绑定和版本锁定信息，并展示浓度—投入量—cycle 决策表。

- [x] **Step 2: 增加三种 SOP 试编译入口**

加入原页面的空间 ATAC、SeekOne DD 单细胞文库构建、客户自定义流程试编译选择器，显示对应 52/44/28 步编译结果；主项目缺口继续保留预生成质量检查 Workflow 的编辑与发布。

- [x] **Step 3: 重构设备台账和接入流程**

展示 DD、PCR、离心机、Bioanalyzer、自动切片设备等台账、通讯状态、能力绑定与项目占用；接入流程保留登记、能力映射、连接方式、连接测试、启用五步。

- [x] **Step 4: 增加通讯中断人工回报兜底**

连接测试失败时展示 T7 手工回报、完成码和责任人，并允许返回 Workflow 继续绑定 Executor。

### Task 5: 对齐人员页、文档和交付同步

**Files:**
- Modify: `work/Agent实验Workflow_AI_Native/index.html`（`renderPeopleModule` 与响应式样式）
- Modify: `work/Agent实验Workflow_AI_Native/施工方案.md`
- Modify: `openspec/changes/ai-native-experiment-workflow-demo/tasks.md`
- Modify: `openspec/changes/ai-native-experiment-workflow-demo/design.md`

- [x] **Step 1: 移除人员页重复菜单**

保留人员、角色、资质、可用性、审批链、任务分配和权限边界表格，删除内部模块菜单。

- [x] **Step 2: 更新施工方案与 OpenSpec**

记录 F1–F5、9 个 Agent、SOP 编译、三种试编译、设备通讯兜底和单列全局配置布局。

- [x] **Step 3: 执行完整验证**

运行 JavaScript 语法检查、静态 ID 重复检查、关键原 HTML 文案检查和 `rtk openspec validate ai-native-experiment-workflow-demo --strict`。

- [x] **Step 4: 同步交付目录**

将工作文件复制到 `outputs/Agent实验Workflow_AI_Native/`，再同步到 `/Users/admin/Documents/ppt/compitation/Agent实验Workflow_AI_Native/`，校验三份 HTML 的 SHA-256 一致。

### Task 6: 将知识库拆为列表、详情和录入流程

**Files:**
- Modify: `work/Agent实验Workflow_AI_Native/index.html`（知识库状态、知识库数据、`renderKnowledgeModule` 及事件绑定）
- Modify: `work/Agent实验Workflow_AI_Native/施工方案.md`
- Modify: `openspec/changes/ai-native-experiment-workflow-demo/design.md`
- Modify: `openspec/changes/ai-native-experiment-workflow-demo/specs/progressive-capability-navigation/spec.md`

- [x] **Step 1: 增加知识库项目与详情状态**

增加 `knowledgeView` 和 `knowledgeBaseId`，提供空间转录组、空间 ATAC、SeekOne DD 单细胞文库、客户自定义流程四个知识库项目，以及每个项目的来源、状态、已录入条目和缺口摘要。

- [x] **Step 2: 实现知识库列表与详情页**

知识库入口默认渲染项目列表；点击卡片进入详情页，详情页展示已录入知识分组、条目状态和关联 SOP，不直接显示 F1–F5 表单。

- [x] **Step 3: 将现有录入流程改为显式入口**

详情页增加“录入知识”按钮；点击后进入现有 F1–F5 资料提交、解析、冲突问答和发布流程。录入页提供“返回知识库详情”，发布后回到详情并显示更新后的知识状态。

- [x] **Step 4: 保留主流程缺口跳转**

主规划页的知识缺口按钮直接打开空间转录组知识库详情，并在详情中标出“8 μm 鼠脑切片图像验收标准”缺口；不改变 Workflow 缺口的后续路径。

- [x] **Step 5: 验证与同步**

运行 JavaScript 语法、静态 ID、知识库分层关键文案校验，执行 OpenSpec 严格校验，并同步工作文件、输出文件和原始目录。
