/* LABWEAVE 静态交互抽取 — 数据模型与交互
   数据来源：packages/client/ui-lab-workbench/src/client/fixtures/adapter.ts 的确定性 fixture，
   叠加 lab-web 演示配置（examples/lab-web/cordis.patch.yml 的 development dispenser 设备）。 */

'use strict'

/* ================= 数据 ================= */

const T = '2026-09-01T09:00:00Z'

const DB = {
  workspaces: [{ workspaceId: 'workspace-fixture', title: 'Fixture Workspace' }],

  projects: [
    {
      projectId: 'project-fixture',
      workspaceId: 'workspace-fixture',
      name: 'Fixture Project',
      description: 'Deterministic Agent-led workbench fixture',
      status: 'ACTIVE',
      sessionCount: 1,
      experimentCount: 1,
      activeRunCount: 0,
      failedRunCount: 0,
      pendingApprovalCount: 0,
    },
    {
      projectId: 'project-atlas',
      workspaceId: 'workspace-fixture',
      name: 'Spatial ATAC Pilot',
      description: '空间转录组 + 排液梯度联合实验（含待确认步骤）',
      status: 'ACTIVE',
      sessionCount: 3,
      experimentCount: 2,
      activeRunCount: 1,
      failedRunCount: 1,
      pendingApprovalCount: 1,
    },
  ],

  experiments: {
    'project-fixture': [
      {
        experimentId: 'experiment-fixture', projectId: 'project-fixture', title: 'Fixture experiment', objective: 'Verify the Agent-led workbench flow', status: 'ACTIVE', createdInSessionId: 'session-fixture',
        sopVersion: 'v1.0', runId: 'run-fixture', progressPct: 100,
        agents: [{ agentId: 'agent-fixture-1', name: '观测采集 Agent', focus: '确定性观测与证据归档', state: 'watching' }],
        todos: [],
        risks: [],
        steps: [
          { stepId: 'F-1', title: '执行确定性观测', status: 'COMPLETED', fields: [['输入状态', '就绪'], ['操作说明', '读取 Fixture 设备值'], ['实时参数', 'obs=42']], explanation: '采集一次基准观测值，用于与后续批次对比。', rationale: '基线校准是所有确定性流程的起点。', sopRef: 'SOP v1.0 §F.1 Baseline', media: [['QC', '观测值 42（目标 ±0.5）']] },
          { stepId: 'F-2', title: '采集证据产物', status: 'COMPLETED', fields: [['输入状态', '观测值已就绪'], ['操作说明', '写入 JSON 产物'], ['实时参数', 'sha256:fixture']], explanation: '把观测值落盘为可审计产物。', rationale: '证据链要求所有观测可回溯到产物哈希。', sopRef: 'SOP v1.0 §F.2 Artifact', media: [['产物', 'fixture-observation.json 128B']] },
          { stepId: 'F-3', title: '生成运行报告', status: 'COMPLETED', fields: [['输入状态', '产物已归档'], ['操作说明', '汇总为报告'], ['实时参数', 'PASS']], explanation: '汇总证据生成运行报告。', rationale: '完成一次受控运行的收尾。', sopRef: 'SOP v1.0 §F.3 Report' },
        ],
        currentStepIndex: 2,
        sections: {
          goal: { summary: '在受控环境中验证 Agent 驱动工作台的端到端流程。', kpis: [['预期观测', '42 ±0.5'], ['样本数', '1'], ['设备数', '1'], ['审批门', '3 层（校验/确认/运行）']] },
          sample: { items: [{ name: 'baseline-sample-01', type: '对照样', volume: '1 mL', source: 'NIST-traceable', qc: 'PASSED' }] },
          procedure: { overview: '基线观测 → 证据落盘 → 报告生成，全流程 3 步。' },
          equipment: { items: [{ id: 'device-fixture', name: 'Fixture measurement device', role: '观测采集', status: 'ready' }] },
          artifact: { items: [{ name: 'fixture-observation.json', kind: 'json', size: '128 B', digest: 'sha256:fixture' }, { name: 'fixture-run-report.md', kind: 'report', size: '—', digest: '—' }] },
          result: { verdict: 'PASSED', metrics: [['观测偏差', '0'], ['产物完整性', 'OK'], ['审批链', '完整']] },
        },
        timeline: [
          { time: '09:00', label: 'Run 启动', status: 'done', detail: '✓' },
          { time: '09:02', label: '观测完成', status: 'done', detail: '✓' },
          { time: '09:04', label: '产物落盘', status: 'done', detail: '✓' },
          { time: '09:05', label: '报告生成', status: 'done', detail: '✓' },
          { time: '—', label: '基线已归档', status: 'info', detail: '' },
        ],
      },
    ],
    'project-atlas': [
      {
      experimentId: 'experiment-atlas-1', projectId: 'project-atlas', title: '排液梯度验证', objective: '在 96 孔板上验证四档排液梯度的重现性', status: 'ACTIVE', createdInSessionId: 'session-atlas-1',
      sopVersion: 'v2.3',
      runId: 'run-atlas-exp024',
      progressPct: 38,
      risks: [{ id: 'r1', text: '油包水破乳温度波动 ±2°C，可能影响相分离效率', level: 'medium' }],
      agents: [
        { agentId: 'agent-atlas-1', name: '排液执行 Agent', focus: '四档排液与孔板方位核对', state: 'waiting-confirmation' },
        { agentId: 'agent-atlas-2', name: 'QC Agent', focus: '排液重现性质控与异常上报', state: 'watching' },
      ],
      todos: [
        { text: '排液前等待人工确认孔板方位', level: 'urgent' },
        { text: '复核四档排液梯度表（20/40/60/80 µL）', level: 'high' },
      ],
      steps: [
        {
          stepId: 'step-4-1', title: '设备准备与校准', status: 'COMPLETED',
          fields: [['输入状态', '就绪'], ['操作说明', '校准移液枪，确认孔板位置'], ['实时参数', '室温 22°C / 湿度 45%']],
          explanation: '确保所有设备处于校准状态，避免系统误差引入。',
          rationale: 'SOP 4.1 要求每次运行前进行设备自检。',
          sopRef: 'SOP v2.3 §4.1 Equipment Setup',
        },
        {
          stepId: 'step-4-2', title: '油包水破乳', status: 'RUNNING',
          fields: [['输入状态', '破乳中'], ['操作说明', '加入破乳剂，低速振荡 5min'], ['实时参数', '振荡频率 800rpm / 温度 25±2°C']],
          media: [['QC', '吸光度 0.42（目标 0.40±0.05）'], ['图片', '孔板光学扫描图'], ['设备状态', 'Robot-02 在线']],
          explanation: '油包水体系需通过控制破乳条件实现相分离，此步是重现性关键。',
          rationale: '文献表明破乳时间与振荡频率直接影响回收率（R²=0.89）。',
          sopRef: 'SOP v2.3 §4.2 Emulsion Breaking',
        },
        {
          stepId: 'step-4-3', title: '相分离收集', status: 'PENDING',
          fields: [['输入状态', '待执行'], ['操作说明', '离心分层后取下层水相'], ['实时参数', '—']],
          explanation: '离心后取水相进行后续分析。',
          rationale: '标准相分离流程。',
          sopRef: 'SOP v2.3 §4.3 Phase Collection',
        },
      ],
      currentStepIndex: 1,
      timeline: [
        { time: '10:32', label: '设备准备', status: 'done', detail: '✓' },
        { time: '10:36', label: '破乳开始', status: 'active', detail: '' },
        { time: '10:39', label: 'QC 复核吸光度', status: 'pending', detail: '' },
        { time: '10:45', label: '相分离收集', status: 'pending', detail: '' },
        { time: '—', label: 'Robot-02 在线', status: 'info', detail: '' },
      ],
      sections: {
        goal: { summary: '在 96 孔板上验证四档排液梯度（20/40/60/80 µL）在油包水破乳条件下的 CV 重现性。', kpis: [['目标 CV', '< 5%'], ['孔板', '96 孔 × 1 块'], ['排液档', '4 档'], ['批次', '单批次 n=8']] },
        sample: { items: [
          { name: 'well-grid-A01-H12', type: '空板（校准用）', volume: '—', source: 'Lot PL-2026-0901', qc: 'PASSED' },
          { name: 'emulsion-lot-EM44', type: '油包水乳液', volume: '32 mL', source: '自制 2026-09-01', qc: 'WAITING' },
          { name: 'demulsifier-DM3', type: '破乳剂', volume: '1.6 mL', source: 'Sigma-Aldrich D5678', qc: 'PASSED' },
        ] },
        procedure: { overview: '设备校准 → 四档排液 → 油包水破乳（振荡 800rpm / 25±2°C / 5min）→ 相分离收集 → QC 吸光度。' },
        equipment: { items: [
          { id: 'dev-dispenser', name: 'development dispenser', role: '排液执行', status: 'ready' },
          { id: 'device-fixture', name: 'Fixture measurement device', role: '吸光度 QC', status: 'ready' },
          { id: 'dev-shaker-mock', name: 'Shaker (Mock)', role: '破乳振荡', status: 'simulated' },
        ] },
        artifact: { items: [
          { name: 'dispense-gradient.csv', kind: 'csv', size: '—', digest: '待产出（运行中）' },
          { name: 'plate-scan.png', kind: 'image', size: '—', digest: '排液步骤完成后采集' },
          { name: 'absorbance-QC.csv', kind: 'csv', size: '—', digest: '破乳完成后产生' },
        ] },
        result: { verdict: 'RUNNING', metrics: [['当前步骤', '油包水破乳（Step 4-2）'], ['已通过步骤', '1 / 3'], ['吸光度 0.42', '目标 0.40±0.05 · 合格'], ['异常', '0 项']] },
      },
    },
      {
        experimentId: 'experiment-atlas-2', title: '空间ATAC捕获率', objective: '评估空间 ATAC 捕获率与批次效应', status: 'PENDING', createdInSessionId: 'session-atlas-2',
        agents: [{ agentId: 'agent-atlas-3', name: '捕获率分析 Agent', focus: '捕获率统计模型选型', state: 'idle' }],
        todos: [{ text: '确认捕获率评估方案与批次分组', level: 'normal' }],
      },
    ],
  },

  plans: {
    'project-fixture': {
      planId: 'plan-fixture',
      revision: 1,
      status: 'LOCKED',
      skillRevisionIds: ['skill-revision-fixture'],
      unresolved: [],
      steps: [
        { stepId: 'step-fixture', name: '执行确定性观测', operation: 'measure', capability: 'device:measure', inputs: ['fact-fixture'], outputs: ['observation-fixture'] },
        { stepId: 'step-fixture-2', name: '采集证据产物', operation: 'collect', capability: 'fs:write', inputs: ['observation-fixture'], outputs: ['artifact-fixture'] },
        { stepId: 'step-fixture-3', name: '生成运行报告', operation: 'report', capability: 'lab:report', inputs: ['artifact-fixture'], outputs: ['report-fixture'] },
      ],
    },
    'project-atlas': {
      planId: 'plan-atlas',
      revision: 2,
      status: 'LOCKED',
      skillRevisionIds: ['skill-revision-dispense'],
      unresolved: [],
      steps: [
        { stepId: 'step-atlas-1', name: '装载孔板', operation: 'load', capability: 'device:dispense', inputs: [], outputs: ['plate-loaded'] },
        { stepId: 'step-atlas-2', name: '四档排液', operation: 'dispense', capability: 'device:dispense', inputs: ['plate-loaded'], outputs: ['dispense-observation'] },
        { stepId: 'step-atlas-3', name: '采集影像', operation: 'image', capability: 'device:measure', inputs: ['dispense-observation'], outputs: ['image-artifact'] },
      ],
    },
  },

  skills: {
    'project-fixture': [{ skillId: 'skill-fixture', revisionId: 'skill-revision-fixture', name: 'Fixture measurement skill', status: 'ACTIVE', purpose: 'Collect one deterministic observation', definitionHash: 'sha256:fixture-skill', revision: 1 }],
    'project-atlas': [{ skillId: 'skill-dispense', revisionId: 'skill-revision-dispense', name: 'Dispense gradient skill', status: 'ACTIVE', purpose: '按梯度表驱动 development dispenser 完成四档排液', definitionHash: 'sha256:dispense-skill', revision: 3 }],
  },

  runs: {
    'project-fixture': [
      {
        runId: 'run-fixture',
        planId: 'plan-fixture',
        runStatus: 'COMPLETED',
        currentStepId: 'step-fixture-3',
        createdAt: T,
        updatedAt: T,
        planStatus: 'LOCKED',
        observations: [{ stepId: 'step-fixture', operationId: 'operation-fixture', valid: true, evidence: ['evidence-fixture'], artifactIds: ['artifact-fixture'], status: 'COMPLETED' }],
        artifacts: ['artifact-fixture'],
        feedback: { status: 'COMPLETED', valid: true, summary: 'Fixture run completed', issues: [] },
      },
    ],
    'project-atlas': [
      {
        runId: 'run-atlas-1',
        planId: 'plan-atlas',
        runStatus: 'WAITING_CONFIRMATION',
        currentStepId: 'step-atlas-2',
        createdAt: T,
        updatedAt: T,
        planStatus: 'LOCKED',
        observations: [{ stepId: 'step-atlas-1', operationId: 'operation-atlas-1', valid: true, evidence: [], artifactIds: [], status: 'COMPLETED' }],
        artifacts: [],
        feedback: { status: 'WAITING_CONFIRMATION', valid: false, summary: '排液前等待人工确认孔板方位', issues: ['confirmation-required'] },
      },
      {
        runId: 'run-atlas-2',
        planId: 'plan-atlas',
        runStatus: 'FAILED',
        currentStepId: 'step-atlas-3',
        createdAt: T,
        updatedAt: T,
        planStatus: 'LOCKED',
        observations: [{ stepId: 'step-atlas-3', operationId: 'operation-atlas-3', valid: false, evidence: [], artifactIds: [], status: 'FAILED', error: 'Fixture step failed' }],
        artifacts: [],
        feedback: { status: 'FAILED', valid: false, summary: '影像采集超时', issues: ['fixture-failed'] },
      },
    ],
  },

  artifacts: {
    'project-fixture': [{ artifactId: 'artifact-fixture', runId: 'run-fixture', kind: 'json', displayName: 'fixture-observation.json', mediaType: 'application/json', size: 128, digest: 'sha256:fixture' }],
    'project-atlas': [{ artifactId: 'artifact-atlas-1', runId: 'run-atlas-2', kind: 'image', displayName: 'capture-01.png', mediaType: 'image/png', size: 20480, digest: 'sha256:atlas' }],
  },

  devices: [
    { deviceId: 'dev-dispenser', id: 'dev-dispenser', name: 'development dispenser', status: 'ready', capabilities: [{ name: 'dispense' }], endpoint: 'http://127.0.0.1:5031', firmware: 'dispenser-mock-1.2.0' },
    { deviceId: 'device-fixture', id: 'device-fixture', name: 'Fixture measurement device', status: 'ready', capabilities: [{ name: 'measure' }], endpoint: 'mock://fixture-device', firmware: 'fixture-mock-0.9.0' },
  ],

  projectDevices: {
    'project-fixture': ['device-fixture'],
    'project-atlas': ['dev-dispenser', 'device-fixture'],
  },

  capabilities: [
    { name: 'device:measure', state: 'available', description: '读取 Fixture measurement device 的确定性观测值' },
    { name: 'device:dispense', state: 'available', description: '驱动 development dispenser 执行排液梯度' },
    { name: 'fs:write', state: 'available', description: '在项目工作区写入证据产物与配置' },
    { name: 'lab:report', state: 'available', description: '汇总观测生成运行报告' },
    { name: 'device:centrifuge', state: 'unavailable', description: '离心机未接入（等待 Host 侧注册）' },
  ],

  knowledge: {
    imports: [{ documentId: 'document-fixture', versionId: 'version-fixture', sourceName: 'fixture-protocol.pdf', status: 'READY' }],
    citations: [
      { documentId: 'document-fixture', versionId: 'version-fixture', sourceName: 'fixture-protocol.pdf', location: 'page:1/block:1', excerpt: '排液梯度建议 20 / 40 / 60 / 80 µL。' },
    ],
  },

  projectFiles: {
    'project-fixture': [
      { projectFileId: 'file-workflow', group: 'configuration', displayName: 'configuration/workflow.json', mediaType: 'application/json', revision: 2, status: 'READY', preview: { kind: 'json', content: JSON.stringify({ planId: 'plan-fixture', revision: 2, source: 'fixture' }, null, 2) } },
      { projectFileId: 'file-goal', group: 'conversation-output', displayName: 'conversation-output/goal.md', mediaType: 'text/markdown', revision: 1, status: 'READY', preview: { kind: 'text', content: '# assembled output\n\nFixture Project 的目标记录。' } },
      { projectFileId: 'file-artifact', group: 'run-artifacts', displayName: 'run-artifacts/fixture-observation.json', mediaType: 'application/json', revision: 1, status: 'READY', artifactId: 'artifact-fixture', runId: 'run-fixture', preview: { kind: 'json', content: JSON.stringify({ artifactId: 'artifact-fixture', runId: 'run-fixture', status: 'READY' }, null, 2) } },
    ],
  },
}

const PROJECT_PAGES = [
  { page: 'overview', label: '总览', icon: '◎' },
  { page: 'planning', label: '规划与工作流', icon: '✎' },
  { page: 'approval', label: '计划审批', icon: '✓' },
  { page: 'execution', label: '执行监控', icon: '▶' },
  { page: 'steps', label: '步骤编排', icon: '☑' },
  { page: 'evidence', label: '证据与报告', icon: '◫' },
  { page: 'files', label: '项目文件', icon: '▤' },
  { page: 'archive', label: '归档', icon: '⌸' },
]

const LIFECYCLE_STAGES = ['目标', '知识', '工作流', 'Skill', '执行', '评估', '报告']

const STATUS_TEXT = {
  COMPLETED: '已完成', FAILED: '失败', BLOCKED: '阻塞', RUNNING: '运行中', WAITING_CONFIRMATION: '待人工确认',
  ACTIVE: '已激活', PENDING: '待定', LOCKED: '已锁定', DRAFT: '草稿', PASSED: '已通过', VALIDATED: '已校验',
  READY: '已就绪', ready: '就绪', WAITING: '等待', locked: '已锁定', validated: '已校验', passed: '已通过',
}

/* 生命周期卡片标题（对齐 LabAgentLifecycleView labels） */
const LIFECYCLE_TITLES = {
  goal: '目标', knowledge: '知识', 'capability-gap': '能力缺口', 'workflow-proposal': '工作流',
  'skill-proposal': 'Skill', execution: '执行', replan: '重规划', 'result-assessment': '结果评估', report: '报告',
}

/* 根应用视图 → 会话模式（对齐各注册项的 conversationMode） */
const CONVERSATION_MODES = {
  'lab-monitor': 'replace',
  'lab-experiment': 'replace',
  'lab-config': 'replace',
  'lab-devices': 'replace',
  'lab-knowledge': 'replace',
  'lab-project': 'lab-workspace',
}

/* ================= 状态 ================= */

const state = {
  theme: 'light',
  sidebarCollapsed: false,
  activeViewId: 'lab-project', // 当前根应用视图；undefined = 纯会话
  detailsOpen: true, // 项目工作台开关（仅 lab-workspace 模式生效）
  activeProjectId: 'project-fixture',
  selectedExperimentId: 'experiment-fixture', // 当前查看的实验详情
  expAnchor: 'goal', // 实验详情页当前的 nav tab：goal | sample | procedure | equipment | artifact | result
  page: 'overview',
  selectedRunId: 'run-fixture',
  selectedExperimentIndex: 0,
  planReview: { 'project-fixture': 'LOCKED', 'project-atlas': 'LOCKED' },
  skillReview: { 'project-fixture': 'ACTIVE', 'project-atlas': 'ACTIVE' },
  filePreviewOpen: {},
  fileDownloaded: {},
  conversation: [
    { role: 'agent', text: '已进入 Fixture Project。以下为本会话的 Agent 主线投影（LabAgentLifecycleProjection 结构）。' },
    { role: 'lifecycle', kind: 'goal', status: 'READY', text: 'Verify the Agent-led workbench flow', fields: [['缺失输入', '无']] },
    { role: 'lifecycle', kind: 'knowledge', status: 'READY', fields: [['知识源', '1'], ['引用', '1']] },
    { role: 'lifecycle', kind: 'workflow-proposal', status: 'LOCKED', fields: [['步骤数', '3'], ['修订', '1'], ['未决输入', '无'], ['校验', '通过']] },
    { role: 'lifecycle', kind: 'skill-proposal', status: 'ACTIVE', text: 'Fixture measurement skill', fields: [['修订', '1'], ['校验', '通过']] },
    { role: 'lifecycle', kind: 'execution', status: 'COMPLETED', fields: [['当前步骤', 'step-fixture-3'], ['证据', '1']] },
    { role: 'lifecycle', kind: 'result-assessment', status: 'PASSED', fields: [['判定', 'PASS'], ['证据', '1']] },
    { role: 'lifecycle', kind: 'report', status: 'READY', fields: [['证据', '1'], ['计划', 'plan-fixture']] },
  ],
}

const el = id => document.getElementById(id)
const frame = () => el('frame')

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

const badge = (status, text) => `<span class="statusBadge" data-status="${esc(status)}">${esc(text ?? STATUS_TEXT[status] ?? status)}</span>`

const project = () => DB.projects.find(p => p.projectId === state.activeProjectId)
const runsOf = pid => DB.runs[pid] ?? []
const planOf = pid => DB.plans[pid]
const skillsOf = pid => DB.skills[pid] ?? []

/** 展平全部实验（带所属项目） */
const allExperiments = () => DB.projects.flatMap(p =>
  (DB.experiments[p.projectId] ?? []).map(e => ({ ...e, projectId: p.projectId, projectName: p.name })))

/** 按 id 查实验 */
const experimentOf = id => allExperiments().find(e => e.experimentId === id)

/** 实验状态文案（含 agent 盯守态） */
const EXPERIMENT_STATUS = { ACTIVE: '进行中', PENDING: '待启动', COMPLETED: '已完成', FAILED: '失败' }
const AGENT_STATE_TEXT = { watching: '盯守中', 'waiting-confirmation': '待确认', idle: '空闲' }
const TODO_LEVEL_TEXT = { urgent: '紧急', high: '高', normal: '普通' }

/** 当前会话模式（对齐 AppFrame 的四态：default / replace / split / lab-workspace） */
const conversationMode = () => state.activeViewId === undefined
  ? 'default'
  : CONVERSATION_MODES[state.activeViewId] ?? 'replace'

/** 打开根应用视图（对齐 LayoutController.openAppView：replace 收起工作台，lab-workspace 强制展开） */
function openAppView(viewId) {
  state.activeViewId = viewId
  state.detailsOpen = (CONVERSATION_MODES[viewId] ?? 'replace') !== 'replace'
}

/* ================= 侧边栏渲染 ================= */

function renderSidebar() {
  const tree = el('projectTree')
  tree.innerHTML = DB.projects.map(p => `
    <button class="project" data-project="${esc(p.projectId)}"${p.projectId === state.activeProjectId ? ' data-active' : ''}
      title="${esc(p.name)}">
      <span class="projectDot" data-project-status="${esc(p.status)}"></span>
      <span class="projectName">${esc(p.name)}</span>
      ${p.pendingApprovalCount > 0 ? `<span class="projectMeta projectPending" title="待审批">●</span>` : ''}
      ${p.failedRunCount > 0 ? `<span class="projectMeta projectAlert" title="有失败运行">!</span>` : ''}
    </button>`).join('')

  document.querySelectorAll('.globalNav .item[data-nav]').forEach(btn => {
    if (btn.dataset.nav === state.activeViewId) btn.setAttribute('data-active', '')
    else btn.removeAttribute('data-active')
  })
}

/* ================= 中间栏渲染 ================= */

/** 视图可见性与工作台开关（对齐 AppFrame 中间栏/右栏的渲染决策） */
function renderCenter() {
  const surface = document.querySelector('[data-app-view-surface]')
  const conversation = document.querySelector('[data-conversation-surface]')
  const toggle = document.querySelector('.workspaceToggle')
  const mode = conversationMode()
  const replacing = mode === 'replace'

  // replace：视图面占中间栏、会话隐藏；default / lab-workspace：会话占中间栏
  surface.hidden = !replacing
  if (replacing) {
    surface.querySelectorAll('[data-center-view]').forEach(node => { node.hidden = node.dataset.centerView !== state.activeViewId })
  }
  conversation.hidden = replacing
  conversation.dataset.presentation = mode === 'lab-workspace' ? 'lab-workspace' : 'default'

  // 工作台开关仅 lab-workspace 模式渲染（对齐 AppFrame 条件渲染）
  toggle.hidden = mode !== 'lab-workspace'
  if (mode === 'lab-workspace') {
    toggle.textContent = state.detailsOpen ? '›' : '‹'
    const label = state.detailsOpen ? '关闭项目工作区' : '打开项目工作区'
    toggle.title = label
    toggle.setAttribute('aria-label', label)
    toggle.setAttribute('aria-expanded', String(state.detailsOpen))
  }
}

/** 实验卡片：状态 + Agent 盯守数 + 待办数，点击进实验详情 */
function renderMonitor() {
  const experiments = allExperiments()
  el('monitorExperimentGrid').innerHTML = experiments.map(e => `
    <button class="experimentCard" data-open-experiment="${esc(e.experimentId)}" data-status="${esc(e.status)}">
      <div class="experimentCardTop">
        <span class="experimentDot" data-status="${esc(e.status)}"></span>
        <strong class="experimentCardTitle">${esc(e.title)}</strong>
        <span class="experimentStatusText">${esc(EXPERIMENT_STATUS[e.status] ?? e.status)}</span>
      </div>
      <span class="experimentCardMeta">${esc(e.projectName)}</span>
      <div class="experimentCardBottom">
        <span class="agentCount">${e.agents.length} Agent 盯守</span>
        ${e.todos.length > 0 ? `<span class="todoCount">${e.todos.length} 待办</span>` : '<span class="todoCount todoCountClear">无待办</span>'}
      </div>
    </button>`).join('')

  // 重要待办：urgent 优先，其后 high；每条可跳转对应实验详情
  const todos = experiments
    .flatMap(e => e.todos.map(t => ({ ...t, experimentId: e.experimentId, experimentTitle: e.title })))
    .filter(t => t.level === 'urgent' || t.level === 'high')
    .sort((a, b) => (a.level === 'urgent' ? 0 : 1) - (b.level === 'urgent' ? 0 : 1))
  el('monitorTodoList').innerHTML = todos.length === 0
    ? '<div class="row"><span>暂无紧急待办</span><span>—</span></div>'
    : todos.map(t => `
      <button class="todoRow" data-open-experiment="${esc(t.experimentId)}">
        <span class="todoLevel" data-level="${esc(t.level)}">${esc(TODO_LEVEL_TEXT[t.level] ?? t.level)}</span>
        <div class="todoText">
          <strong>${esc(t.experimentTitle)}</strong>
          <span>${esc(t.text)}</span>
        </div>
        <span class="todoArrow">›</span>
      </button>`).join('')
}

/** 实验详情页（nav / main / aside / footer 四语义段 · main 内 Canvas + 分区单槽） */
function renderExperimentDetail() {
  const e = experimentOf(state.selectedExperimentId)
  if (e === undefined) {
    el('expBreadcrumbName').textContent = '未找到实验'
    return
  }

  // ---- 顶栏 ----
  el('expBreadcrumbName').textContent = e.title
  el('expRunId').textContent = `#${e.runId ?? 'EXP-0000'}`
  el('expSopVersion').textContent = e.sopVersion ?? 'v1.0'
  el('expStatusText').textContent = EXPERIMENT_STATUS[e.status] ?? e.status
  el('expProgressPct').textContent = `${e.progressPct ?? 0}%`

  const riskBadge = el('expRiskBadge')
  const risks = e.risks ?? []
  if (risks.length > 0) {
    riskBadge.hidden = false
    el('expRiskCount').textContent = String(risks.length)
  } else {
    riskBadge.hidden = true
  }

  // ---- 上部 Canvas：当前步骤焦点卡 + 步骤导航器（始终保留） ----
  const steps = e.steps ?? []
  const idx = e.currentStepIndex ?? 0
  const step = steps[idx]

  if (step !== undefined) {
    el('expStepTitle').textContent = step.title
    el('expStepFields').innerHTML = (step.fields ?? []).map(([label, value]) => `
      <dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')
    el('expStepMedia').innerHTML = (step.media ?? []).map(([type, text]) => `
      <div class="expMediaItem" data-media-type="${esc(type)}"><strong>${esc(type)}</strong><span>${esc(text)}</span></div>`).join('')
  } else {
    el('expStepTitle').textContent = '—'
    el('expStepFields').innerHTML = ''
    el('expStepMedia').innerHTML = ''
  }

  // 步骤导航器 Chip（点击时切到"流程" tab 显示对应 SOP steps 列表 + 当前步高亮）
  el('expStepNav').innerHTML = steps.map((s, i) => {
    const isCurrent = i === idx
    const arrow = i < steps.length - 1 ? '<span class="stepArrow">→▶</span>' : ''
    const statusClass = s.status === 'COMPLETED' ? 'Done' : s.status === 'RUNNING' ? 'Current' : 'Pending'
    const cls = isCurrent
      ? 'stepChip stepCurrent'
      : `stepChip step${statusClass}`
    return `<button class="${cls}" data-step-index="${i}" type="button" title="切换到流程 Tab · ${esc(s.title)}">${esc(s.stepId)}${isCurrent ? ` [${s.status}]` : ''}</button>${arrow}`
  }).join('')

  // ---- 右 Inspector ----
  if (step !== undefined) {
    el('expInsExplanation').textContent = step.explanation ?? '—'
    el('expInsRationale').textContent = step.rationale ?? '—'
    el('expInsSopRef').textContent = step.sopRef ?? '—'
  } else {
    el('expInsExplanation').textContent = '—'
    el('expInsRationale').textContent = '—'
    el('expInsSopRef').textContent = '—'
  }

  el('expInsRisks').innerHTML = risks.length === 0
    ? '<span class="expNoRisk">无风险项</span>'
    : risks.map(r => `<div class="expRiskItem" data-risk-level="${esc(r.level)}">${esc(r.text)}</div>`).join('')

  // ---- 底 Timeline ----
  const tl = e.timeline ?? []
  el('expTimelineTrack').innerHTML = tl.map(t => `
    <span class="tlNode" data-tl-status="${esc(t.status)}">
      <strong>${esc(t.time)}</strong>
      <span>${esc(t.label)}</span>
      ${t.detail !== '' ? `<em>${esc(t.detail)}</em>` : ''}
    </span>`).join('')

  // ---- 下部：分区切换槽位 ----
  // 按 state.expAnchor 只渲染"当前选中 tab"的 1 张分区卡（goal/sample/procedure/equipment/artifact/result · 6 选 1）
  setExperimentAnchor(state.expAnchor, /*refreshNavOnly*/ false, e)
}

/** tab 头元信息（序号圆标 + 中文标题） */
const EXP_SECTION_META = {
  goal:       { index: '①', title: '实验目标' },
  sample:     { index: '②', title: '样本' },
  procedure:  { index: '③', title: '流程' },
  equipment:  { index: '④', title: '设备' },
  artifact:   { index: '⑤', title: '产物' },
  result:     { index: '⑥', title: '结果' },
}

/** 切换实验详情的 nav tab：更新 state → 高亮左导航 → 重新渲染"单张"分区卡进 main 下部槽位 */
function setExperimentAnchor(anchor, refreshNavOnly = false, exp) {
  const e = exp ?? experimentOf(state.selectedExperimentId)
  const meta = EXP_SECTION_META[anchor] ?? EXP_SECTION_META.goal
  const realAnchor = EXP_SECTION_META[anchor] ? anchor : 'goal'
  state.expAnchor = realAnchor

  // 高亮 nav
  document.querySelectorAll('#expNavList a').forEach(a => {
    if (a.dataset.navAnchor === realAnchor) a.classList.add('active')
    else a.classList.remove('active')
  })

  if (refreshNavOnly) return
  if (e === undefined) { el('expSectionSlot').innerHTML = ''; return }

  renderExperimentSectionSlot(realAnchor, meta, e)
}

/** 在 expSectionSlot（main 下部单槽）渲染 1 张分区卡（按 tab 切换 · 每次只渲染 1 张） */
function renderExperimentSectionSlot(anchor, meta, e) {
  const sec = e.sections ?? {}
  const steps = e.steps ?? []
  const idx = e.currentStepIndex ?? 0
  const { index, title } = meta
  const head = `
    <section class="expSection" id="exp-section-${anchor}">
      <header class="expSectionHead">
        <div class="sectionHeadLeft"><span class="expSectionIndex">${index}</span><h3>${esc(title)}</h3></div>
        <button class="jumpToChatBtn" type="button" data-jump-to-workdir title="跳回工作目录（Agent 聊天页）">🏢&nbsp;工作目录</button>
      </header>
      <div class="expSectionBody">`
  const tail = `</div></section>`

  let bodyHtml = ''
  switch (anchor) {
    case 'goal': {
      const goal = sec.goal
      bodyHtml = `
        <p class="expSummary">${esc((e.objective ?? goal?.summary ?? '—'))}</p>
        ${goal?.kpis?.length ? `
          <div class="miniGrid">
            ${goal.kpis.map(([k, v]) => `<div class="miniCard"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}
          </div>` : ''}
        <div class="detailRow"><span>所属项目</span><span>${esc(e.projectName ?? '—')}</span></div>
        <div class="detailRow"><span>创建会话</span><span>${esc(e.createdInSessionId ?? '—')}</span></div>
      `
      break
    }
    case 'sample': {
      const samples = sec.sample?.items ?? []
      bodyHtml = samples.length === 0
        ? '<p class="noticeText">该实验暂未登记样本。</p>'
        : samples.map(s => `
            <div class="block">
              <div class="summaryHeader">
                <strong>${esc(s.name)}</strong>
                ${badge(s.qc)}
              </div>
              <div class="miniGrid">
                <div class="miniCard"><span>类型</span><strong>${esc(s.type ?? '—')}</strong></div>
                <div class="miniCard"><span>体积</span><strong>${esc(s.volume ?? '—')}</strong></div>
                <div class="miniCard"><span>来源</span><strong>${esc(s.source ?? '—')}</strong></div>
                <div class="miniCard"><span>QC 状态</span><strong>${esc(s.qc ?? '—')}</strong></div>
              </div>
            </div>`).join('')
      break
    }
    case 'procedure': {
      const proc = sec.procedure
      bodyHtml = `
        ${proc?.overview ? `<p class="expSummary">${esc(proc.overview)}</p>` : ''}
        ${steps.length === 0
          ? '<p class="noticeText">暂无步骤定义。</p>'
          : `<ol class="steps">
              ${steps.map((s, i) => `
                <li class="step" style="${i === idx ? 'border-color:rgba(59,130,246,.45);background:rgba(59,130,246,.04)' : ''}">
                  <span class="stepMarker" style="${i === idx ? 'background:#3b82f6;color:#fff' : ''}">${i + 1}</span>
                  <div class="stepBody">
                    <h3>${esc(s.title)} <span class="workflowBadge">${esc(s.stepId)} · ${esc(s.status)}</span></h3>
                    <div class="stepFields">
                      ${(s.fields ?? []).map(([k, v]) => `<div class="miniCard"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}
                    </div>
                    ${s.explanation ? `<p class="noticeText" style="margin:0">${esc(s.explanation)}</p>` : ''}
                  </div>
                </li>`).join('')}
            </ol>`}
      `
      break
    }
    case 'equipment': {
      const equip = sec.equipment?.items ?? []
      bodyHtml = equip.length === 0
        ? '<p class="noticeText">该运行暂未绑定设备。</p>'
        : equip.map(d => `
            <div class="block">
              <div class="summaryHeader">
                <strong>${esc(d.name)}</strong>
                <span>${esc(d.role ?? '')}</span>
                ${badge(d.status)}
              </div>
              <div class="detailRow"><span>设备 ID</span><span>${esc(d.id ?? '—')}</span></div>
              <div class="detailRow"><span>角色</span><span>${esc(d.role ?? '—')}</span></div>
            </div>`).join('')
      break
    }
    case 'artifact': {
      const arts = sec.artifact?.items ?? []
      bodyHtml = arts.length === 0
        ? '<p class="noticeText">暂无可审计产物。</p>'
        : arts.map(a => `
            <div class="fileRow">
              <div class="fileRowHeader">
                <strong>${esc(a.name)}</strong>
                <span class="fileMeta">${esc(a.kind ?? '')} · ${esc(a.size ?? '')}</span>
              </div>
              <div class="detailRow"><span>摘要</span><span>${esc(a.digest ?? '—')}</span></div>
            </div>`).join('')
      break
    }
    case 'result': {
      const res = sec.result
      bodyHtml = res === undefined
        ? '<p class="noticeText">实验未到结果判定阶段。</p>'
        : `
          <div class="block">
            <div class="summaryHeader">
              <h3 style="margin:0">最终判定</h3>
              ${badge(res.verdict)}
            </div>
            ${res.metrics?.length ? `
              <div class="miniGrid" style="margin-top:10px">
                ${res.metrics.map(([k, v]) => `<div class="miniCard"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}
              </div>` : ''}
          </div>`
      break
    }
  }

  el('expSectionSlot').innerHTML = head + bodyHtml + tail
}


function renderConfig() {
  const plans = Object.entries(DB.plans)
  el('configWorkflowGrid').innerHTML = plans.map(([pid, plan]) => `
    <div class="card">
      <span>工作流 ${esc(plan.planId)} · 修订 ${plan.revision}</span>
      <strong>${plan.steps.length} 步</strong>
      <span>状态 ${STATUS_TEXT[plan.status] ?? plan.status} · Skill 修订 ${plan.skillRevisionIds.length} 个 · 未决输入 ${plan.unresolved.length}</span>
    </div>`).join('')

  el('configCapabilityGrid').innerHTML = DB.capabilities.map(c => `
    <div class="capabilityCard" data-capability-state="${esc(c.state)}">
      <div>
        <h3>${esc(c.name)}</h3>
        <p>${esc(c.description)}</p>
      </div>
      <button class="action" ${c.state === 'unavailable' ? 'disabled' : ''}>测试能力</button>
    </div>`).join('')
}

function renderDevices() {
  const online = DB.devices.filter(d => d.status === 'ready').length
  el('devicesStatusValue').textContent = `${online} 台在线`

  el('devicesGrid').innerHTML = DB.devices.map(d => {
    const bound = (DB.projectDevices[state.activeProjectId] ?? []).includes(d.deviceId)
    return `
    <div class="deviceCard">
      <div class="deviceCardHeader">
        <div>
          <h3 class="deviceName">${esc(d.name)}</h3>
          <div class="deviceId">${esc(d.deviceId)} · ${esc(d.endpoint)}</div>
        </div>
        <span class="${d.status === 'ready' ? 'deviceBadge' : 'deviceBadge deviceBadgeMuted'}">${d.status === 'ready' ? 'ready' : 'offline'}</span>
      </div>
      <div class="deviceDetails">
        <div><span>固件</span><span>${esc(d.firmware)}</span></div>
        <div><span>接入项目</span><span>${Object.entries(DB.projectDevices).filter(([, ids]) => ids.includes(d.deviceId)).length} 个</span></div>
      </div>
      <div class="deviceCapabilities">${d.capabilities.map(c => `<span class="capability">${esc(c.name)}</span>`).join('')}</div>
      <div class="deviceActions">
        <button class="deviceActionButton" data-toggle-device="${esc(d.deviceId)}">${bound ? '从当前项目移除' : '加入当前项目'}</button>
      </div>
    </div>`
  }).join('')
}

function renderKnowledge() {
  const k = DB.knowledge
  el('knowledgeStatusBadge').textContent = `${k.imports.length} 个来源`

  el('knowledgeList').innerHTML = k.imports.map(item => `
    <li class="knowledgeRow">
      <div class="knowledgeRowText">
        <strong>${esc(item.sourceName)}</strong>
        <span class="knowledgeMuted">${esc(item.documentId)} · ${esc(item.versionId)}</span>
      </div>
      <span class="badge">${esc(item.status)}</span>
    </li>`).join('') + k.citations.map(c => `
    <li class="knowledgeRow">
      <div class="knowledgeRowText">
        <strong>引用 · ${esc(c.location)}</strong>
        <span class="knowledgeMuted">${esc(c.sourceName)}（${esc(c.versionId)}）— ${esc(c.excerpt)}</span>
      </div>
      <span class="badge">citation</span>
    </li>`).join('')
}

/* ================= 项目工作台渲染 ================= */

function renderShellHeader() {
  const p = project()
  el('shellProjectName').textContent = p.name
  el('shellProjectDescription').textContent = p.description
  el('shellProjectId').textContent = p.projectId
  el('agentContextProject').textContent = p.name
  el('composerProjectChip').textContent = p.name
}

function renderProjectNavigation() {
  el('projectNavigation').innerHTML = PROJECT_PAGES.map(item => `
    <button class="navButton" data-page="${esc(item.page)}" title="${esc(item.label)}" aria-label="${esc(item.label)}"
      ${item.page === state.page ? 'data-active' : ''}>${item.icon}</button>`).join('')
}

function renderShellPage() {
  const pid = state.activeProjectId
  const plan = planOf(pid)
  const runs = runsOf(pid)
  const page = el('shellPage')

  const nav = el('projectNavigation')
  nav.querySelectorAll('[data-page]').forEach(btn => {
    if (btn.dataset.page === state.page) btn.setAttribute('data-active', '')
    else btn.removeAttribute('data-active')
  })

  if (state.page === 'overview') {
    page.innerHTML = renderOverview(pid, plan, runs)
  } else if (state.page === 'planning') {
    page.innerHTML = renderPlanning(pid, plan)
  } else if (state.page === 'approval') {
    page.innerHTML = renderApproval(pid, plan)
  } else if (state.page === 'execution') {
    page.innerHTML = renderExecution(pid, plan, runs)
  } else if (state.page === 'steps') {
    page.innerHTML = renderSteps(plan)
  } else if (state.page === 'evidence') {
    page.innerHTML = renderEvidence(pid, runs)
  } else if (state.page === 'files') {
    page.innerHTML = renderFiles(pid)
  } else if (state.page === 'archive') {
    page.innerHTML = renderArchive(pid, runs)
  }
}

function renderOverview(pid, plan, runs) {
  const p = project()
  const stageIndex = runs.some(r => r.runStatus === 'COMPLETED') ? 6 : 3
  return `
  <div class="lifecycleCardPanel" data-lab-lifecycle-overview>
    <div>
      <h3 class="pageSectionTitle" style="margin:0">AGENT 主线</h3>
      <p class="noticeText">当前生命周期路径：目标 → 知识 → 工作流 → Skill → 执行 → 评估 → 报告</p>
    </div>
    <div class="lifecycleRail">
      ${LIFECYCLE_STAGES.map((label, i) => `
        <div class="stage" data-stage-state="${i < stageIndex ? 'done' : i === stageIndex ? 'current' : ''}">${esc(label)}</div>`).join('')}
    </div>
  </div>

  <div class="block" data-lab-pending-action-wrapper>
    <h3>待处理动作</h3>
    ${plan.status === 'LOCKED'
      ? `<div class="pendingAction" data-lab-pending-action><span>计划审批 — 已由人工确认，无待办</span><span>✓</span></div>`
      : `<div class="pendingAction" data-lab-pending-action><span>计划审批 — 工作流等待人工确认</span><button class="action" data-action="goto-approval">前往审批</button></div>`}
  </div>

  <div class="block">
    <h3>项目快照</h3>
    <div class="miniGrid">
      <div class="miniCard"><span>项目状态</span><strong>${esc(STATUS_TEXT[p.status] ?? p.status)}</strong></div>
      <div class="miniCard"><span>会话数</span><strong>${p.sessionCount}</strong></div>
      <div class="miniCard"><span>实验数</span><strong>${p.experimentCount}</strong></div>
      <div class="miniCard"><span>活跃运行</span><strong>${p.activeRunCount}</strong></div>
      <div class="miniCard"><span>接入设备</span><strong>${(DB.projectDevices[pid] ?? []).length}</strong></div>
      <div class="miniCard"><span>知识源</span><strong>${DB.knowledge.imports.length}</strong></div>
    </div>
  </div>

  <p class="noticeText">实验来源、设备与项目会话由 Host 管理；此视图为 Agent 侧只读投影。</p>`
}

function renderPlanning(pid, plan) {
  const experiments = DB.experiments[pid] ?? []
  const selected = experiments[state.selectedExperimentIndex] ?? experiments[0]
  const skill = skillsOf(pid)[0]
  return `
  <div class="block">
    <h3>实验</h3>
    <div class="experimentList">
      ${experiments.map((e, i) => `
        <button class="experimentRow" data-experiment="${i}" ${i === state.selectedExperimentIndex ? 'data-active' : ''}>
          <strong>${esc(e.title)}</strong>
          <span>${esc(e.experimentId)} · ${esc(e.status === 'ACTIVE' ? '进行中' : '待定')}</span>
        </button>`).join('')}
    </div>
  </div>

  ${selected ? `
  <div class="block">
    <h3>${esc(selected.title)}</h3>
    <p>${esc(selected.objective)}</p>
    <div class="miniGrid">
      <div class="miniCard"><span>实验</span><strong>${esc(selected.experimentId)}</strong></div>
      <div class="miniCard"><span>状态</span><strong>${esc(selected.status)}</strong></div>
      <div class="miniCard"><span>创建会话</span><strong>${esc(selected.createdInSessionId)}</strong></div>
      <div class="miniCard"><span>派生自</span><strong>goal</strong></div>
    </div>
    <div class="detailRow"><span>项目会话</span><span>${esc(selected.createdInSessionId)}</span></div>
    <div class="detailRow"><span>计划</span><span>${esc(plan.planId)} rev.${plan.revision}</span></div>
    <div class="detailRow"><span>运行记录</span><span>${runsOf(pid).length} 条</span></div>
    <div class="detailRow"><span>结果</span><span>${runsOf(pid).some(r => r.runStatus === 'COMPLETED') ? '已生成报告' : '待执行'}</span></div>
    <div class="detailRow"><span>确认依据</span><span>fixture-protocol.pdf · page:1/block:1</span></div>
  </div>` : ''}

  ${renderWorkflow(plan)}
  ${renderSkill(pid, skill)}`
}

function renderWorkflow(plan) {
  return `
  <div class="block">
    <div class="summaryHeader">
      <h3>工作流（计划修订版）</h3>
      <span>${esc(plan.planId)} · rev.${plan.revision}</span>
      ${badge(plan.status)}
    </div>
    <div class="summaryRow">
      <div class="summaryItem"><span>步骤数</span><strong>${plan.steps.length}</strong></div>
      <div class="summaryItem"><span>Skill 修订版</span><strong>${plan.skillRevisionIds.length}</strong></div>
      <div class="summaryItem"><span>未决输入</span><strong>${plan.unresolved.length}</strong></div>
    </div>
    <ol class="steps">
      ${plan.steps.map((s, i) => `
        <li class="step">
          <span class="stepMarker">${i + 1}</span>
          <div class="stepBody">
            <h3>${esc(s.name)}</h3>
            <div class="stepFields">
              <div class="miniCard"><span>步骤</span><strong>${esc(s.stepId)}</strong></div>
              <div class="miniCard"><span>操作</span><strong>${esc(s.operation)}</strong></div>
              <div class="miniCard"><span>能力</span><strong>${esc(s.capability)}</strong></div>
            </div>
          </div>
        </li>`).join('')}
    </ol>
  </div>`
}

function renderSkill(pid, skill) {
  const review = state.skillReview[pid]
  return `
  <div class="block">
    <div class="summaryHeader">
      <h3>Skill 修订版</h3>
      <span>${esc(skill.revisionId)} · rev.${skill.revision}</span>
      ${badge(review === 'ACTIVE' ? 'ACTIVE' : review)}
    </div>
    <div class="miniGrid">
      <div class="miniCard"><span>名称</span><strong>${esc(skill.name)}</strong></div>
      <div class="miniCard"><span>定义哈希</span><strong>${esc(skill.definitionHash)}</strong></div>
    </div>
    <p class="noticeText">用途：${esc(skill.purpose)}</p>
    <div class="detailRow"><span>确定性校验</span><span>${review === 'DRAFT' ? '未执行' : '通过（issues: 0）'}</span></div>
    <div class="actions">
      <button class="action" data-action="validate-skill" ${review === 'DRAFT' ? '' : 'disabled'}>校验 Skill</button>
      <button class="action" data-action="approve-skill" ${review === 'VALIDATED' ? '' : 'disabled'}>批准 Skill</button>
      <button class="action primary" data-action="activate-skill" ${review === 'APPROVED' ? '' : 'disabled'}>激活 Skill</button>
    </div>
  </div>`
}

function renderApproval(pid, plan) {
  const review = state.planReview[pid]
  const next = review === 'DRAFT' ? '确定性校验' : review === 'VALIDATED' ? '人工确认计划' : review === 'LOCKED' ? '开始受控运行' : '已完成'
  return `
  <div class="lifecycleCardPanel">
    <div>
      <h3 class="pageSectionTitle" style="margin:0">计划审批</h3>
      <p class="noticeText">审批门：确定性校验 → 人工确认 → 受控运行。下一阶段：<strong>${next}</strong></p>
    </div>
    <div class="lifecycleRail">
      <div class="stage" data-stage-state="${review !== 'DRAFT' ? 'done' : 'current'}">校验</div>
      <div class="stage" data-stage-state="${review === 'LOCKED' || review === 'RUNNING' ? 'done' : review === 'VALIDATED' ? 'current' : ''}">确认</div>
      <div class="stage" data-stage-state="${review === 'RUNNING' ? 'current' : ''}">运行</div>
    </div>
  </div>

  <div class="block">
    <div class="summaryHeader">
      <h3>${esc(plan.planId)}</h3>
      <span>rev.${plan.revision}</span>
      ${badge(review)}
    </div>
    <div class="summaryRow">
      <div class="summaryItem"><span>步骤数</span><strong>${plan.steps.length}</strong></div>
      <div class="summaryItem"><span>Skill 修订版</span><strong>${plan.skillRevisionIds.length}</strong></div>
      <div class="summaryItem"><span>未决输入</span><strong>${plan.unresolved.length}</strong></div>
    </div>
    <div class="detailRow"><span>确定性校验</span><span>${review === 'DRAFT' ? '未执行' : '通过（valid: true, issues: 0）'}</span></div>
    <div class="detailRow"><span>确认人</span><span>${review === 'DRAFT' || review === 'VALIDATED' ? '—' : 'fixture-agent'}</span></div>
    <div class="actions">
      <button class="action" data-action="validate-plan" ${review === 'DRAFT' ? '' : 'disabled'}>确定性校验</button>
      <button class="action" data-action="approve-plan" ${review === 'VALIDATED' ? '' : 'disabled'}>人工确认计划</button>
      <button class="action primary" data-action="start-run" ${review === 'LOCKED' ? '' : 'disabled'}>开始受控运行</button>
    </div>
  </div>

  ${renderWorkflow(plan)}`
}

function renderExecution(pid, plan, runs) {
  const run = runs.find(r => r.runId === state.selectedRunId) ?? runs[0]
  if (run === undefined) {
    return `<div class="block"><h3>执行监控</h3><p class="noticeText">暂无运行记录。先在「计划审批」页开始一次受控运行。</p></div>`
  }
  const waiting = run.runStatus === 'WAITING_CONFIRMATION'
  return `
  <div class="block">
    <div class="summaryHeader">
      <h3>${esc(run.runId)}</h3>
      <span>计划 ${esc(run.planId)}</span>
      ${badge(run.runStatus)}
    </div>
    <div class="actions">
      ${run.runStatus === 'RUNNING' || waiting ? `<button class="action danger" data-action="stop-run">停止运行</button>` : ''}
      ${waiting ? `<button class="action primary" data-action="confirm-step">确认当前步骤</button>` : ''}
      ${run.runStatus === 'FAILED' ? `<button class="action primary" data-action="retry-run">重试运行</button>` : ''}
    </div>
    <div class="miniGrid">
      <div class="miniCard"><span>创建</span><strong>${esc(run.createdAt.slice(0, 10))}</strong></div>
      <div class="miniCard"><span>当前步骤</span><strong>${esc(run.currentStepId)}</strong></div>
      <div class="miniCard"><span>计划状态</span><strong>${esc(run.planStatus)}</strong></div>
      <div class="miniCard"><span>观测</span><strong>${run.observations.length}</strong></div>
    </div>
    <div class="detailRow"><span>反馈</span><span>${esc(run.feedback.summary)}</span></div>
    <div class="detailRow"><span>问题</span><span>${run.feedback.issues.length === 0 ? '无' : run.feedback.issues.join(', ')}</span></div>
  </div>

  ${waiting ? `
  <div class="block">
    <h3>等待人工确认</h3>
    <p class="noticeText">步骤 ${esc(run.currentStepId)} 需要人工确认后才能继续。确认会记录确认人与证据。</p>
    <div class="field">
      <label for="confirmEvidence">确认证据</label>
      <input id="confirmEvidence" type="text" placeholder="例如：孔板方位已核对" value="孔板方位已核对">
    </div>
    <div class="actions"><button class="action primary" data-action="confirm-step">确认当前步骤</button></div>
  </div>` : ''}

  <div class="block">
    <h3>执行图</h3>
    <ol class="steps">
      ${plan.steps.map((s, i) => {
        const obs = run.observations.find(o => o.stepId === s.stepId)
        const stepState = obs === undefined ? '未开始' : obs.status === 'COMPLETED' ? '已完成' : obs.status === 'FAILED' ? '失败' : '进行中'
        return `
        <li class="step">
          <span class="stepMarker">${i + 1}</span>
          <div class="stepBody">
            <h3>${esc(s.name)} · ${esc(stepState)}</h3>
            <div class="stepFields">
              <div class="miniCard"><span>操作</span><strong>${esc(s.operation)}</strong></div>
              <div class="miniCard"><span>能力</span><strong>${esc(s.capability)}</strong></div>
              <div class="miniCard"><span>观测</span><strong>${obs === undefined ? '—' : `valid: ${obs.valid}`}</strong></div>
            </div>
          </div>
        </li>`
      }).join('')}
    </ol>
  </div>

  <div class="block">
    <h3>运行记录</h3>
    <div class="runList">
      ${runs.map(r => `
        <button class="runRow" data-select-run="${esc(r.runId)}" ${r.runId === state.selectedRunId ? 'style="border-color:#8edb81"' : ''}>
          <strong>${esc(r.runId)}</strong>
          <span>${esc(r.feedback.summary)}</span>
          ${badge(r.runStatus)}
        </button>`).join('')}
    </div>
  </div>`
}

function renderSteps(plan) {
  return `
  <div class="block">
    <div class="summaryHeader">
      <h3>步骤编排</h3>
      <span>${esc(plan.planId)} · rev.${plan.revision}</span>
      ${badge(plan.status)}
    </div>
    <p class="noticeText">步骤编排由工作流修订版决定；人工只读。</p>
    <ol class="steps">
      ${plan.steps.map((s, i) => `
        <li class="step">
          <span class="stepMarker">${i + 1}</span>
          <div class="stepBody">
            <h3>${esc(s.name)}</h3>
            <div class="stepFields">
              <div class="miniCard"><span>输入</span><strong>${s.inputs.length === 0 ? '—' : s.inputs.map(esc).join(', ')}</strong></div>
              <div class="miniCard"><span>输出</span><strong>${s.outputs.map(esc).join(', ')}</strong></div>
              <div class="miniCard"><span>能力</span><strong>${esc(s.capability)}</strong></div>
            </div>
          </div>
        </li>`).join('')}
    </ol>
  </div>`
}

function renderEvidence(pid, runs) {
  const artifacts = DB.artifacts[pid] ?? []
  return `
  <div class="block">
    <h3>证据产物</h3>
    ${artifacts.length === 0 ? '<p class="noticeText">暂无证据产物。</p>' : artifacts.map(a => `
      <div class="evidenceCard" style="margin-bottom:8px">
        <div class="summaryHeader">
          <strong>${esc(a.displayName)}</strong>
          <span>${esc(a.mediaType)} · ${a.size} B</span>
        </div>
        <div class="evidenceGrid">
          <div class="miniCard"><span>产物</span><strong>${esc(a.artifactId)}</strong></div>
          <div class="miniCard"><span>运行</span><strong>${esc(a.runId)}</strong></div>
          <div class="miniCard"><span>摘要</span><strong>${esc(a.digest)}</strong></div>
        </div>
        <div class="actions"><button class="action" data-action="open-artifact">打开</button></div>
      </div>`).join('')}
  </div>

  <div class="block">
    <h3>结果报告</h3>
    ${(() => {
      const completed = runs.find(r => r.runStatus === 'COMPLETED')
      if (completed === undefined) return '<p class="noticeText">暂无已完成运行，报告待生成。</p>'
      return `
      <div class="miniGrid">
        <div class="miniCard"><span>状态</span><strong>已通过（PASSED）</strong></div>
        <div class="miniCard"><span>判定</span><strong>PASS</strong></div>
        <div class="miniCard"><span>方法</span><strong>fixture-record</strong></div>
        <div class="miniCard"><span>证据</span><strong>1 条</strong></div>
        <div class="miniCard"><span>引用</span><strong>page:1/block:1</strong></div>
      </div>
      <div class="detailRow"><span>评估人</span><span>fixture-agent</span></div>
      <div class="detailRow"><span>评估时间</span><span>${esc(completed.updatedAt.slice(0, 10))}</span></div>
      <div class="detailRow"><span>人工 QC</span><span>不需要</span></div>`
    })()}
  </div>`
}

function renderFiles(pid) {
  const files = DB.projectFiles[pid] ?? []
  const groups = [['configuration', '配置'], ['conversation-output', '会话输出'], ['run-artifacts', '运行产物']]
  return `
  <div class="block" data-lab-project-files>
    <div class="summaryHeader">
      <h3>项目文件</h3>
      <button class="action" data-action="refresh-files">刷新文件</button>
    </div>
    <p class="noticeText">文件由 Host 投影；预览与下载需要项目授权。</p>
    ${groups.map(([group, label]) => {
      const groupFiles = files.filter(f => f.group === group)
      if (groupFiles.length === 0) return ''
      return `
      <p class="pageSectionTitle">${label}</p>
      ${groupFiles.map(f => `
        <div class="fileRow" data-lab-project-file-group="${esc(group)}">
          <div class="fileRowHeader">
            <strong>${esc(f.displayName)}</strong>
            <span class="fileMeta">${esc(f.mediaType)} · rev.${f.revision} · ${esc(f.status)}</span>
          </div>
          <div class="actions">
            <button class="action" data-preview-file="${esc(f.projectFileId)}">${state.filePreviewOpen[f.projectFileId] ? '收起预览' : '预览'}</button>
            <button class="action" data-download-file="${esc(f.projectFileId)}">${state.fileDownloaded[f.projectFileId] ? '下载就绪' : '下载'}</button>
          </div>
          ${state.filePreviewOpen[f.projectFileId] ? `<pre class="filePreview">${esc(f.preview.content)}</pre>` : ''}
        </div>`).join('')}`
    }).join('')}
  </div>`
}

function renderArchive(pid, runs) {
  const completed = runs.filter(r => r.runStatus === 'COMPLETED').length
  return `
  <div class="block">
    <h3>归档</h3>
    <p class="noticeText">项目归档由 Host 执行：会话、计划、运行与产物一并冻结。</p>
    <div class="miniGrid">
      <div class="miniCard"><span>已完成运行</span><strong>${completed}</strong></div>
      <div class="miniCard"><span>产物</span><strong>${(DB.artifacts[pid] ?? []).length}</strong></div>
      <div class="miniCard"><span>报告</span><strong>${completed > 0 ? '1 份' : '0 份'}</strong></div>
    </div>
    <div class="actions"><button class="action danger" data-action="archive-project" disabled>归档项目（Host 权限）</button></div>
  </div>`
}

/* ================= 会话渲染 ================= */

/** 生命周期卡片（对齐 LabAgentLifecycleView：cardHeader + body(p/field)） */
function lifecycleCard(m) {
  const title = LIFECYCLE_TITLES[m.kind] ?? m.kind
  const statusText = STATUS_TEXT[m.status] ?? m.status
  return `
  <article class="lifecycleCard" data-kind="${esc(m.kind)}">
    <div class="cardHeader">
      <h3>${esc(title)}</h3>
      <span class="lifecycleStatusText">${esc(statusText)}</span>
    </div>
    <div class="lifecycleBody">
      ${m.text === undefined ? '' : `<p>${esc(m.text)}</p>`}
      ${(m.fields ?? []).map(([label, value]) => `
        <div class="lifecycleField"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}
    </div>
  </article>`
}

function renderConversation() {
  const html = state.conversation.map(m => {
    if (m.role === 'user') return `<div class="userRow"><div class="userStack"><div class="userBubble">${esc(m.text)}</div></div></div>`
    if (m.role === 'agent') return `<div class="assistantText">${esc(m.text)}</div>`
    return lifecycleCard(m)
  }).join('')

  const node = el('conversationList')
  if (node !== null) node.innerHTML = html
}

function pushAgentReply(input) {
  const pid = state.activeProjectId
  const plan = planOf(pid)
  state.conversation.push(
    { role: 'agent', text: `收到：「${input}」。我将按已锁定的工作流 ${plan.planId}（rev.${plan.revision}，${plan.steps.length} 步）推进。` },
    { role: 'lifecycle', kind: 'execution', status: 'RUNNING', fields: [['当前步骤', plan.steps[0].name], ['能力', plan.steps[0].capability]] },
    { role: 'agent', text: '演示环境：事件卡片按 LabAgentLifecycleProjection 结构投影，真实环境由 Host 侧 Session 事件流驱动。' },
  )
  renderConversation()
  scrollConversation()
}

function scrollConversation() {
  for (const node of document.querySelectorAll('[data-conversation-scroll]')) {
    node.scrollTop = node.scrollHeight
  }
}

/* ================= 布局：列宽拖拽与折叠 ================= */

function applyColumns() {
  const f = frame()
  const sidebar = Number(f.dataset.sidebarWidth ?? 260)
  // replace 模式强制右栏 0（对齐 computeColumns 的让步求解）
  const details = conversationMode() === 'replace' ? 0 : state.detailsOpen ? Number(f.dataset.detailsWidth ?? 460) : 0
  f.style.gridTemplateColumns = `${sidebar}px minmax(0, 1fr) ${details}px`
  if (details === 0) f.setAttribute('data-details-collapsed', '')
  else f.removeAttribute('data-details-collapsed')
}

function bindDrag(handle) {
  const side = handle.dataset.side
  handle.addEventListener('pointerdown', event => {
    event.preventDefault()
    handle.setPointerCapture(event.pointerId)
    handle.dataset.dragging = 'true'
    frame().setAttribute('data-dragging', '')
    const move = e => {
      if (side === 'sidebar') {
        frame().dataset.sidebarWidth = Math.min(Math.max(e.clientX, 180), 420)
      } else {
        frame().dataset.detailsWidth = Math.min(Math.max(window.innerWidth - e.clientX, 320), Math.round(window.innerWidth * .6))
      }
      applyColumns()
    }
    const up = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', up)
      delete handle.dataset.dragging
      frame().removeAttribute('data-dragging')
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', up)
  })
}

/* ================= 全局渲染 ================= */

function renderAll() {
  renderSidebar()
  renderMonitor()
  renderExperimentDetail()
  renderConfig()
  renderDevices()
  renderKnowledge()
  renderShellHeader()
  renderProjectNavigation()
  renderShellPage()
  renderConversation()
  renderCenter()
  applyColumns()
}

/* ================= 事件委托 ================= */

document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null
  if (target === null) return

  const closest = selector => target.closest(selector)

  // 全局导航（对齐 LabGlobalNavigation → ctx.layout.openAppView）
  const nav = closest('.globalNav .item[data-nav]')
  if (nav !== null) {
    openAppView(nav.dataset.nav)
    renderSidebar()
    renderCenter()
    applyColumns()
    return
  }

  // 侧边栏项目树（对齐 registerActiveProjectBridge → openAppView('lab-project')）
  const projectBtn = closest('[data-project]')
  if (projectBtn !== null && projectBtn.classList.contains('project')) {
    state.activeProjectId = projectBtn.dataset.project
    state.page = 'overview'
    state.selectedRunId = runsOf(state.activeProjectId)[0]?.runId ?? ''
    state.selectedExperimentIndex = 0
    openAppView('lab-project')
    renderAll()
    return
  }

  // 总览视图：实验卡片 / 待办行 → 实验详情页
  const openExperiment = closest('[data-open-experiment]')
  if (openExperiment !== null) {
    state.selectedExperimentId = openExperiment.dataset.openExperiment
    state.expAnchor = 'goal' // 进入详情默认先看「① 实验目标」tab
    openAppView('lab-experiment')
    renderExperimentDetail()
    renderCenter()
    applyColumns()
    return
  }

  // 实验详情：点击 nav tab → 切到对应 tab 的那组信息（main 下部单槽"刷新切换"，不再 6 条堆叠）
  const navAnchor = closest('[data-nav-anchor]')
  if (navAnchor !== null) {
    event.preventDefault()
    setExperimentAnchor(navAnchor.dataset.navAnchor)
    // 同时把 main（唯一主列）滚回顶部，让新 tab 的分区卡从视觉上从顶部开始
    const expMain = document.querySelector('main.expMain')
    if (expMain !== null) expMain.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  // 实验详情：点击步骤导航器 Chip → 直接切换到「③ 流程」tab（展示完整 SOP steps 列表 + 当前步高亮）
  const stepChip = closest('[data-step-index]')
  if (stepChip !== null && stepChip.classList.contains('stepChip')) {
    event.preventDefault()
    setExperimentAnchor('procedure')
    const expMain = document.querySelector('main.expMain')
    if (expMain !== null) expMain.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  // section 右上角「工作目录」按钮 → 从实验详情 replace 视图跳回 Agent 聊天工作目录（lab-project）
  const jumpWorkDir = closest('[data-jump-to-workdir]')
  if (jumpWorkDir !== null) {
    event.preventDefault()
    const e = experimentOf(state.selectedExperimentId)
    const pid = e?.projectId || state.activeProjectId || 'project-fixture'
    state.activeProjectId = pid
    openAppView('lab-project') // 切 conversation 模式回 workspace（detailsOpen=true）
    renderCenter()
    applyColumns()
    return
  }

  const openRun = closest('[data-open-run]')
  if (openRun !== null) {
    state.activeProjectId = openRun.dataset.project
    state.selectedRunId = openRun.dataset.openRun
    state.page = 'execution'
    openAppView('lab-project')
    renderAll()
    return
  }

  // 工作台页面导航
  const pageBtn = closest('[data-page]')
  if (pageBtn !== null) {
    state.page = pageBtn.dataset.page
    renderShellPage()
    return
  }

  // 实验选择
  const experimentBtn = closest('[data-experiment]')
  if (experimentBtn !== null) {
    state.selectedExperimentIndex = Number(experimentBtn.dataset.experiment)
    renderShellPage()
    return
  }

  // 运行选择
  const selectRun = closest('[data-select-run]')
  if (selectRun !== null) {
    state.selectedRunId = selectRun.dataset.selectRun
    renderShellPage()
    return
  }

  // 文件预览 / 下载
  const previewFile = closest('[data-preview-file]')
  if (previewFile !== null) {
    const id = previewFile.dataset.previewFile
    state.filePreviewOpen[id] = !state.filePreviewOpen[id]
    renderShellPage()
    return
  }

  const downloadFile = closest('[data-download-file]')
  if (downloadFile !== null) {
    state.fileDownloaded[downloadFile.dataset.downloadFile] = true
    renderShellPage()
    return
  }

  // 设备加入/移除
  const toggleDevice = closest('[data-toggle-device]')
  if (toggleDevice !== null) {
    const deviceId = toggleDevice.dataset.toggleDevice
    const list = DB.projectDevices[state.activeProjectId] ?? (DB.projectDevices[state.activeProjectId] = [])
    const index = list.indexOf(deviceId)
    if (index >= 0) list.splice(index, 1)
    else list.push(deviceId)
    renderDevices()
    return
  }

  // 动作按钮
  const action = closest('[data-action]')
  if (action === null) return
  const kind = action.dataset.action
  const pid = state.activeProjectId

  switch (kind) {
    case 'toggle-sidebar': {
      state.sidebarCollapsed = !state.sidebarCollapsed
      const f = frame()
      f.dataset.sidebarWidth = state.sidebarCollapsed ? '0' : '260'
      if (state.sidebarCollapsed) f.setAttribute('data-sidebar-collapsed', '')
      else f.removeAttribute('data-sidebar-collapsed')
      applyColumns()
      return
    }
    case 'toggle-theme': {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
      document.body.toggleAttribute('data-ds-dark-theme', state.theme === 'dark')
      return
    }
    case 'toggle-workspace': {
      state.detailsOpen = !state.detailsOpen
      renderCenter()
      applyColumns()
      return
    }
    case 'open-workbench': {
      openAppView('lab-project')
      renderCenter()
      applyColumns()
      return
    }
    case 'back-overview': {
      openAppView('lab-monitor')
      renderSidebar()
      renderCenter()
      applyColumns()
      return
    }
    case 'open-experiment-project': {
      const e = experimentOf(state.selectedExperimentId)
      if (e !== undefined) {
        state.activeProjectId = e.projectId
        state.page = 'overview'
        state.selectedRunId = runsOf(e.projectId)[0]?.runId ?? ''
        openAppView('lab-project')
        renderAll()
      }
      return
    }
    case 'goto-approval':
      state.page = 'approval'
      renderShellPage()
      return
    case 'validate-plan':
      state.planReview[pid] = 'VALIDATED'
      state.conversation.push({ role: 'lifecycle', kind: 'workflow-proposal', status: 'VALIDATED', fields: [['校验', '通过（valid: true, issues: 0）'], ['计划', planOf(pid).planId]] })
      renderShellPage(); renderConversation(); scrollConversation()
      return
    case 'approve-plan':
      state.planReview[pid] = 'LOCKED'
      state.conversation.push({ role: 'lifecycle', kind: 'workflow-proposal', status: 'LOCKED', fields: [['确认人', 'fixture-agent'], ['计划', planOf(pid).planId]] })
      renderShellPage(); renderConversation(); scrollConversation()
      return
    case 'start-run': {
      state.planReview[pid] = 'RUNNING'
      const runId = `run-${pid}-${Date.now().toString(36).slice(-4)}`
      DB.runs[pid].unshift({ runId, planId: planOf(pid).planId, runStatus: 'RUNNING', currentStepId: planOf(pid).steps[0].stepId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), planStatus: 'LOCKED', observations: [], artifacts: [], feedback: { status: 'RUNNING', valid: false, summary: '受控运行已开始', issues: [] } })
      state.selectedRunId = runId
      state.conversation.push({ role: 'lifecycle', kind: 'execution', status: 'RUNNING', fields: [['运行', runId], ['计划', planOf(pid).planId]] })
      renderShellPage(); renderMonitor(); renderConversation(); scrollConversation()
      return
    }
    case 'stop-run': {
      const run = runsOf(pid).find(r => r.runId === state.selectedRunId)
      if (run !== undefined) {
        run.runStatus = 'BLOCKED'
        run.feedback = { status: 'BLOCKED', valid: false, summary: '运行已被人工停止', issues: ['stopped-by-user'] }
      }
      renderShellPage(); renderMonitor()
      return
    }
    case 'confirm-step': {
      const run = runsOf(pid).find(r => r.runId === state.selectedRunId)
      const evidence = document.getElementById('confirmEvidence')
      if (run !== undefined) {
        run.runStatus = 'RUNNING'
        run.feedback = { status: 'RUNNING', valid: false, summary: `人工确认通过${evidence !== null && evidence.value !== '' ? `（证据：${evidence.value}）` : ''}`, issues: [] }
        state.conversation.push({ role: 'lifecycle', kind: 'execution', status: 'RUNNING', fields: [['运行', run.runId], ['证据', evidence?.value ?? '无']] })
      }
      renderShellPage(); renderMonitor(); renderConversation(); scrollConversation()
      return
    }
    case 'retry-run': {
      const run = runsOf(pid).find(r => r.runId === state.selectedRunId)
      if (run !== undefined) {
        run.runStatus = 'RUNNING'
        run.feedback = { status: 'RUNNING', valid: false, summary: '重试中', issues: [] }
      }
      renderShellPage(); renderMonitor()
      return
    }
    case 'validate-skill':
      state.skillReview[pid] = 'VALIDATED'
      renderShellPage()
      return
    case 'approve-skill':
      state.skillReview[pid] = 'APPROVED'
      renderShellPage()
      return
    case 'activate-skill':
      state.skillReview[pid] = 'ACTIVE'
      renderShellPage()
      return
    case 'open-artifact':
      state.page = 'files'
      renderShellPage()
      return
    case 'refresh-files': {
      const files = DB.projectFiles[pid] ?? []
      if (files.length < 4) {
        files.push({ projectFileId: `file-refresh-${files.length}`, group: 'run-artifacts', displayName: `run-artifacts/manual-refresh-${files.length}.json`, mediaType: 'application/json', revision: 1, status: 'READY', preview: { kind: 'json', content: JSON.stringify({ source: 'manual-refresh' }, null, 2) } })
      }
      renderShellPage()
      return
    }
    case 'archive-project':
      return
    case 'send-message': {
      sendMessage()
      return
    }
    default:
  }

  // 知识库动作
  const knowledgeAction = closest('[data-action]')
  if (knowledgeAction !== null) {
    switch (knowledgeAction.dataset.action) {
      case 'knowledge-import': {
        const name = el('knowledgeFileInput').value.trim() || 'protocol-new.pdf'
        DB.knowledge.imports.push({ documentId: `document-${DB.knowledge.imports.length}`, versionId: `version-${DB.knowledge.imports.length}`, sourceName: name, status: 'READY' })
        renderKnowledge()
        showKnowledgeNotice(`已导入并创建版本：${name}`)
        return
      }
      case 'knowledge-search': {
        const keyword = el('knowledgeSearchInput').value.trim()
        const hit = DB.knowledge.citations[0]
        if (keyword !== '' && hit.excerpt.includes(keyword)) showKnowledgeNotice(`命中引用：${hit.sourceName} ${hit.location}`)
        else showKnowledgeNotice('未命中引用：请尝试关键词 dispense 或 梯度')
        return
      }
      case 'knowledge-create-sop': {
        const name = el('knowledgeSopInput').value.trim() || '新 SOP'
        showKnowledgeNotice(`Skill 草稿已创建：${name}（DRAFT，待校验与批准）`)
        return
      }
      default:
    }
  }
})

function showKnowledgeNotice(text) {
  const notice = el('knowledgeNotice')
  notice.textContent = text
  notice.hidden = false
}

/* ================= 输入交互（对齐 InputBar：Enter 发送 / Shift+Enter 换行 / IME 守卫 / 自动增高） ================= */

const composerInput = el('composerInput')
const composerSend = document.querySelector('[data-action="send-message"]')

// IME 组合态：composition Enter 选词不发送；清除延迟一拍，兼容 Safari 在 compositionend 之后派发关闭键
let composing = false
composerInput.addEventListener('compositionstart', () => { composing = true })
composerInput.addEventListener('compositionend', () => { setTimeout(() => { composing = false }, 10) })

function syncComposer() {
  const text = composerInput.value
  composerSend.disabled = text.trim() === ''
  // 自动增高：以内容高度为准，封顶 CSS 的 max-height（超出转内部滚动）
  const max = Number.parseInt(getComputedStyle(composerInput).maxHeight, 10) || 336
  composerInput.style.height = 'auto'
  composerInput.style.height = `${Math.min(composerInput.scrollHeight, max)}px`
}

composerInput.addEventListener('input', syncComposer)

composerInput.addEventListener('keydown', event => {
  // Shift+Enter 恒为原生换行（先于 IME 守卫判定）
  if (event.key !== 'Enter' || event.shiftKey) return
  // keyCode 229 是引擎在无 isComposing 时发出的组合中信号
  if (composing || event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  sendMessage()
})

function sendMessage() {
  const text = composerInput.value.trim()
  if (text === '') return
  state.conversation.push({ role: 'user', text })
  composerInput.value = ''
  syncComposer()
  composerInput.focus()
  pushAgentReply(text)
}

/* ================= 启动 ================= */

for (const handle of document.querySelectorAll('.handle')) bindDrag(handle)
renderAll()
syncComposer()
scrollConversation()
