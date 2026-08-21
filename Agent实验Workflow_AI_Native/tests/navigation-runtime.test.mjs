import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /\.sidebar-actions\[hidden\]\s*\{\s*display:none\s*\}/, '隐藏操作区必须真正隐藏');
assert.equal((html.match(/class="sidebar-utility"/g) || []).length, 1, '侧栏只能有一个底部工具区');
assert.match(html, /data-action="go-home"/, '项目空间必须提供返回首页入口');
assert.match(html, /id="configReturnLabel"/, '配置中心必须使用明确的上下文返回文案');
assert.doesNotMatch(html, /data-config-back/, '配置首页不应再重复显示返回按钮');
assert.doesNotMatch(html, /data-project-exit/, '项目总览不应再重复显示项目管理按钮');

assert.match(html, /function createDraftProjectDefinition\(id,title,objective\)/, '需要中性的新项目定义工厂');
assert.match(html, /gapType:'objective'/, '新项目必须停留在实验信息补齐阶段');
assert.match(html, /definition\.gapType==='objective'\?'实验信息缺口'/, '规划页必须正确展示实验信息缺口');
assert.match(html, /导入实验资料/, '信息缺口状态必须提供资料导入入口');
assert.match(html, /id="planningInput"/, '信息缺口状态必须保留对话输入框');
assert.match(html, /id="planningImportDrawer"/, '资料导入必须通过右侧抽屉承载');
assert.match(html, /planningImportStatus/, '资料解析状态必须保存到当前项目运行态');
assert.match(html, /projectDefinitions\[id\]=createDraftProjectDefinition\(id,title,prompt\)/, '新项目必须先注册定义');
assert.match(html, /projectRuntimeStates\[id\]=createProjectRuntime\(id\)/, '新项目必须创建独立运行态');
assert.doesNotMatch(html, /projectStates\[id\]=createProjectState/, '不能再以当前项目为默认来源创建新项目');

const definitionIndex = html.indexOf('projectDefinitions[id]=createDraftProjectDefinition(id,title,prompt)');
const runtimeIndex = html.indexOf('projectRuntimeStates[id]=createProjectRuntime(id)', definitionIndex);
const selectIndex = html.indexOf("selectProject(id,'planning')", runtimeIndex);
assert.ok(definitionIndex < runtimeIndex && runtimeIndex < selectIndex, '创建顺序必须是定义、运行态、进入项目');

assert.match(html, /function navigateTo\(name\)/, '动态项目页按钮必须使用统一导航入口');
assert.match(html, /function selectProject\(id,page\).*?loadProjectState\(id\).*?state\.currentProject=id;.*?state\.parallelExperiment=id/s, '切换项目后必须明确恢复目标项目上下文');
assert.match(html, /closest\('\[data-project-action\]'\)/, '项目进入按钮必须使用全局委托，不能依赖单次渲染绑定');
assert.match(html, /workspacePages\.includes\(name\)\)\{saveProjectState\(\)/, '离开项目返回工作台前必须保存当前运行态');
assert.doesNotMatch(html, /querySelectorAll\('\[data-goto\]'\)\.forEach\(btn=>btn\.addEventListener/, '动态 data-goto 按钮不能只依赖初始化时的静态绑定');
assert.match(html, /name:'鼠脑空间转录组实验'/, '鼠脑项目名称在项目定义中必须与项目列表一致');
assert.match(html, /\.workspace-table\{table-layout:fixed\}/, '项目总览表格必须使用固定布局保证列对齐');

assert.match(html, /function finalizeObjectiveProjectPlanning\(\).*?state\.knowledgeReady=true;state\.workflowReady=true/s, '新建非鼠脑项目完成信息确认后必须进入可生成计划状态');
assert.match(html, /finalizeObjectiveProjectPlanning\(\);closePlanningImport\(\)/, '资料导入完成后必须回填当前草稿项目状态');

console.log('导航与动态项目检查通过');
