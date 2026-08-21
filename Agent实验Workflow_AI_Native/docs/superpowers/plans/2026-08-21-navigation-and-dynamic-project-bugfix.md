# 导航与动态项目修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复侧栏操作重复、项目内无法返回首页，以及首页新建项目无法进入的问题。

**Architecture:** 保留现有单文件应用结构，在侧栏建立唯一工具区，并让工作台、项目与配置中心按上下文渲染各自操作。动态项目先建立中性的项目定义，再通过现有项目运行态工厂创建独立状态，避免继承当前项目或其他实验 Workflow。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js 内置断言与静态回归检查。

---

### Task 1: 建立导航结构回归检查

**Files:**
- Create: `tests/navigation-runtime.test.mjs`
- Test: `index.html`

- [ ] **Step 1: 编写当前实现必然失败的结构测试**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /\.sidebar-actions\[hidden\]\s*\{\s*display:none\s*\}/, '隐藏操作区必须真正隐藏');
assert.equal((html.match(/class="sidebar-utility"/g) || []).length, 1, '侧栏只能有一个底部工具区');
assert.match(html, /data-action="go-home"/, '项目空间必须提供返回首页入口');
assert.match(html, /id="configReturnLabel"/, '配置中心必须使用明确的上下文返回文案');
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `rtk node tests/navigation-runtime.test.mjs`

Expected: FAIL，首先提示“隐藏操作区必须真正隐藏”。

### Task 2: 统一侧栏工具区和明确导航目标

**Files:**
- Modify: `index.html:32`
- Modify: `index.html:111-120`
- Modify: `index.html:314-324`
- Test: `tests/navigation-runtime.test.mjs`

- [ ] **Step 1: 在同一个工具区中放置三个上下文操作组**

```html
<div class="sidebar-utility">
  <div class="sidebar-actions" id="workspaceActions">
    <button class="sidebar-action" data-action="open-config">⚙　配置中心</button>
  </div>
  <div class="sidebar-actions" id="configActions" hidden>
    <button class="sidebar-action" data-action="leave-config">←　<span id="configReturnLabel">返回工作台</span></button>
  </div>
  <div class="sidebar-actions" id="projectActions" hidden>
    <button class="sidebar-action subtle" data-action="go-home">⌂　返回首页</button>
    <button class="sidebar-action subtle" data-action="leave-project">▦　项目管理</button>
    <button class="sidebar-action" data-action="open-config">⚙　配置中心</button>
  </div>
</div>
```

- [ ] **Step 2: 让唯一工具区负责占位，并显式处理 hidden**

```css
.sidebar-utility{margin-top:auto;border-top:1px solid var(--line-dark);padding:12px 0 10px}
.sidebar-actions{display:grid;gap:5px}
.sidebar-actions[hidden]{display:none}
```

- [ ] **Step 3: 增加明确的首页导航，并更新配置返回文案**

```js
function goHome(){
  if(state.projectActive)saveProjectState();
  state.shell='workspace';
  state.projectActive=false;
  showPage('home');
}

function renderNavigationShell(){
  const shell=state.shell;
  ['workspace','config','project'].forEach(name=>{
    const nav=$(name+'Nav'),actions=$(name+'Actions');
    if(nav)nav.hidden=shell!==name;
    if(actions)actions.hidden=shell!==name;
  });
  const context=state.returnContext;
  if($('configReturnLabel'))$('configReturnLabel').textContent=
    context?.source==='project'&&projectDefinitions[context.projectId]
      ? `返回 ${projectDefinitions[context.projectId].name}`
      : '返回工作台';
  updateProjectNav();
}
```

- [ ] **Step 4: 绑定首页入口并运行结构测试**

Run: `rtk node tests/navigation-runtime.test.mjs`

Expected: 导航相关断言 PASS。

### Task 3: 建立动态项目创建回归检查

**Files:**
- Modify: `tests/navigation-runtime.test.mjs`
- Test: `index.html`

- [ ] **Step 1: 增加动态项目定义与运行态创建顺序检查**

```js
assert.match(html, /function createDraftProjectDefinition\(id,title,objective\)/, '需要中性的新项目定义工厂');
assert.match(html, /projectDefinitions\[id\]=createDraftProjectDefinition\(id,title,prompt\)/, '新项目必须先注册定义');
assert.match(html, /projectRuntimeStates\[id\]=createProjectRuntime\(id\)/, '新项目必须创建独立运行态');
assert.doesNotMatch(html, /projectStates\[id\]=createProjectState/, '不能再以当前项目为默认来源创建新项目');

const definitionIndex = html.indexOf('projectDefinitions[id]=createDraftProjectDefinition(id,title,prompt)');
const runtimeIndex = html.indexOf('projectRuntimeStates[id]=createProjectRuntime(id)');
const selectIndex = html.indexOf("selectProject(id,'planning')", runtimeIndex);
assert.ok(definitionIndex < runtimeIndex && runtimeIndex < selectIndex, '创建顺序必须是定义、运行态、进入项目');
```

- [ ] **Step 2: 运行测试并确认动态项目断言失败**

Run: `rtk node tests/navigation-runtime.test.mjs`

Expected: FAIL，提示缺少新项目定义工厂。

### Task 4: 创建中性的规划草稿项目

**Files:**
- Modify: `index.html:269-287`
- Modify: `index.html:441`
- Test: `tests/navigation-runtime.test.mjs`

- [ ] **Step 1: 新增只描述规划缺口的草稿定义工厂**

```js
function createDraftProjectDefinition(id,title,objective){
  const draftWorkflow=[
    ['01','目标理解与信息补齐','Agent 理解实验目标并询问关键实验信息',['Agent','实验员']]
  ];
  return {
    id,
    name:title,
    experimentType:'待识别实验',
    objective,
    samples:'等待补齐样本信息',
    workflow:draftWorkflow,
    executionEvents:createExecutionEvents(draftWorkflow,'规划草稿'),
    orchestration:createOrchestration(draftWorkflow),
    knowledgeBaseId:'custom',
    gapType:'objective'
  };
}
```

- [ ] **Step 2: 修正首页项目的创建顺序和序号冲突检查**

```js
let serial=421;
while(projectDefinitions[`EXP-2026-${String(serial).padStart(4,'0')}`])serial++;
const id=`EXP-2026-${String(serial).padStart(4,'0')}`;
projectDefinitions[id]=createDraftProjectDefinition(id,title,prompt);
projectRuntimeStates[id]=createProjectRuntime(id);
```

- [ ] **Step 3: 运行完整回归测试**

Run: `rtk node tests/navigation-runtime.test.mjs`

Expected: PASS，并输出导航和动态项目检查通过。

### Task 5: 语法与交互验收

**Files:**
- Verify: `index.html`
- Verify: `tests/navigation-runtime.test.mjs`

- [ ] **Step 1: 检查内联脚本语法**

Run: `rtk node --check tests/navigation-runtime.test.mjs`

Expected: exit code 0。

- [ ] **Step 2: 提取并检查 HTML 中主脚本的 JavaScript 语法**

Run: `rtk node tests/check-inline-script.mjs`

Expected: PASS，主脚本可被 Node 编译。

- [ ] **Step 3: 验证用户路径**

检查路径：AI 首页填写目标 → 开始规划 → 进入新项目规划 → 返回首页 → 项目管理 → 再次进入新项目 → 配置中心 → 返回当前项目。

- [ ] **Step 4: 验证侧栏显示**

检查桌面和窄屏：每个空间只有一个有效工具区；移动侧栏可正常打开，并在导航后自动收起。

- [ ] **Step 5: 对照设计说明逐条验收**

Run: `rtk node tests/navigation-runtime.test.mjs`

Expected: 所有断言通过，退出码为 0。

> 当前目录是独立静态演示文件而非 Git 工作树，因此本计划不包含提交步骤。

### Task 6: 补齐新项目资料导入与对话推进

**Files:**
- Modify: `index.html`
- Modify: `tests/navigation-runtime.test.mjs`
- Verify: `tests/check-inline-script.mjs`

- [x] **Step 1: 增加失败断言**

断言新项目规划页存在 `导入实验资料`、规划输入框、资料抽屉和解析预览状态。

- [x] **Step 2: 增加右侧资料导入抽屉**

抽屉提供 SOP、样本表、历史实验记录和质控标准四类资料；演示态允许使用示例资料，确认后显示已识别字段与仍缺少字段。

- [x] **Step 3: 增加对话输入与导入状态回填**

对话输入支持补充文本；导入确认只更新当前项目的资料状态和消息，不复用其他项目状态，不直接发布 Workflow。

- [x] **Step 4: 运行回归与内联脚本语法检查**

Run: `rtk node tests/navigation-runtime.test.mjs && rtk node tests/check-inline-script.mjs`

Expected: PASS。
