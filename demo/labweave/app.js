/* LABWEAVE 静态交互抽取 — 数据模型与交互
   数据来源：packages/client/ui-lab-workbench/src/client/fixtures/adapter.ts 的确定性 fixture，
   叠加 lab-web 演示配置（examples/lab-web/cordis.patch.yml 的移液分配仪设备）。 */

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

  /* 助手 + SaaS：一个项目下可多轮对话（会话）；点会话 = qwork 式对话 */
  sessions: {
    'project-fixture': [
      { sessionId: 'session-fixture', title: '基线观测与证据归档', days: 18, messages: [
        { role: 'user', text: '跑一次确定性基线观测，观测值取 42。' },
        { role: 'agent', text: '已完成：观测 42（±0.5），证据落盘 fixture-observation.json，报告已生成。' },
      ] },
    ],
    'project-atlas': [
      { sessionId: 'session-atlas-1', title: '排液梯度重现性验证', days: 2, messages: [
        { role: 'user', text: '复核四档排液梯度（20/40/60/80 µL）在油包水破乳条件下的 CV。' },
        { role: 'agent', text: '已按锁定工作流推进，当前步骤 油包水破乳（步骤 2/3）。排液前需要你确认孔板方位。' },
      ] },
      { sessionId: 'session-atlas-2', title: '空间 ATAC 捕获率方案', days: 31, messages: [] },
    ],
  },

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
          { id: 'dev-dispenser', name: '移液分配仪', role: '排液执行', status: 'ready' },
          { id: 'device-fixture', name: '观测测量仪', role: '吸光度 QC', status: 'ready' },
          { id: 'dev-shaker', name: '破乳振荡器', role: '破乳振荡', status: 'ready' },
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
    'project-fixture': [{ skillId: 'skill-fixture', revisionId: 'skill-revision-fixture', name: '观测测量技能', status: 'ACTIVE', purpose: '采集一次确定性观测', definitionHash: 'sha256:fixture-skill', revision: 1 }],
    'project-atlas': [{ skillId: 'skill-dispense', revisionId: 'skill-revision-dispense', name: '排液梯度技能', status: 'ACTIVE', purpose: '按梯度表驱动移液分配仪完成四档排液', definitionHash: 'sha256:dispense-skill', revision: 3 }],
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
        feedback: { status: 'COMPLETED', valid: true, summary: '观测运行已完成', issues: [] },
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
        observations: [{ stepId: 'step-atlas-3', operationId: 'operation-atlas-3', valid: false, evidence: [], artifactIds: [], status: 'FAILED', error: '观测步骤执行失败' }],
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
    { deviceId: 'dev-dispenser', id: 'dev-dispenser', name: '移液分配仪', status: 'ready', capabilities: [{ name: '移液', desc: '按 20/40/60/80 µL 四档梯度排液', md: '# 移液（排液梯度）\n\n## 参数\n- volume: 20 / 40 / 60 / 80 µL（四档）\n- speed: medium\n- aspirate: 分两次，避免交叉污染\n\n## 边界\n- 单次排液体积 ≤ 100 µL\n- 零点漂移 > 0.5 µL 需先校准\n\n## 异常处理\n- 挂壁残留：末尾 0.5 s 反向回吸（blow-out）' }, { name: '混匀', desc: '低速振荡混匀 5min（800rpm）', md: '# 混匀\n\n## 参数\n- speed: 800 rpm\n- duration: 5 min\n- temperature: 25±2°C\n\n## 边界\n- 转速 ≤ 1000 rpm，避免乳化' }], endpoint: 'http://127.0.0.1:5031', firmware: '移液分配仪固件 v1.2.0', agentFns: ['operate', 'collect'] },
    { deviceId: 'device-fixture', id: 'device-fixture', name: '观测测量仪', status: 'ready', capabilities: [{ name: '测量', desc: '吸光度读数并上报观测事件', md: '# 测量（吸光度读数）\n\n## 参数\n- wavelength: 200–999 nm\n- plate_id: string\n\n## 上报事件\n- observation（吸光度读数）\n\n## 边界\n- 读数前预热 5 min，否则首值偏低' }], endpoint: 'http://127.0.0.1:5032', firmware: '观测测量仪固件 v0.9.0', agentFns: [] },
  ],

  /* Work Agent（数字员工）：设备绑定后按 SOP 与能力边界自主运行。操作/采集/盯守是它的三项功能（见 WORK_AGENT_FUNCTIONS），按设备勾选启用 */
  workAgents: [
    { agentId: 'wa-device', name: '设备 Work Agent', desc: '接管设备、按 SOP 与能力边界自主运行的数字员工', scope: '设备' },
  ],

  projectDevices: {
    'project-fixture': ['device-fixture'],
    'project-atlas': ['dev-dispenser', 'device-fixture'],
  },

  capabilities: [
    { name: 'device:measure', state: 'available', description: '读取观测测量仪的确定性观测值' },
    { name: 'device:dispense', state: 'available', description: '驱动移液分配仪执行排液梯度' },
    { name: 'fs:write', state: 'available', description: '在项目工作区写入证据产物与配置' },
    { name: 'lab:report', state: 'available', description: '汇总观测生成运行报告' },
    { name: 'device:centrifuge', state: 'unavailable', description: '离心机未接入（等待 Host 侧注册）' },
  ],

  knowledge: {
    imports: [{ documentId: 'document-fixture', versionId: 'version-fixture', sourceName: 'fixture-protocol.pdf', status: 'READY' }],
    citations: [
      { documentId: 'document-fixture', versionId: 'version-fixture', sourceName: 'fixture-protocol.pdf', location: 'page:1/block:1', excerpt: '排液梯度建议 20 / 40 / 60 / 80 µL。' },
    ],
    /* 参考文档（论文 / 协议 / 数据集）：知识中心「参考文档」区数据源 */
    refs: [
      { refId: 'ref-protocol', title: 'fixture-protocol.pdf', kind: 'protocol', source: '内部 SOP 库', versionId: 'version-fixture', status: 'READY', cited: 1, excerpt: '排液梯度建议 20 / 40 / 60 / 80 µL；破乳 800 rpm / 25±2°C / 5 min。' },
      { refId: 'ref-atac', title: 'Spatial ATAC-seq 捕获率优化', kind: 'paper', source: 'Nat. Methods 2024 · DOI 10.1038/s41592', versionId: 'v1', status: 'READY', cited: 2, excerpt: '核浓度与透化时间共同决定捕获率，建议 5k–10k nuclei/µL。' },
      { refId: 'ref-demul', title: '油包水破乳对相分离效率的影响', kind: 'paper', source: 'Lab on a Chip 2023', versionId: 'v1', status: 'READY', cited: 1, excerpt: '振荡频率 800 rpm、25±2°C 下回收率最高（R²=0.89）。' },
      { refId: 'ref-dataset', title: 'dispense-gradient-dataset.csv', kind: 'dataset', source: 'run-atlas 历史批次汇总', versionId: 'v3', status: 'READY', cited: 0, excerpt: '四档排液梯度 3 批次原始观测（CV / 吸光度 / 回收率）。' },
    ],
  },

  /* 项目记忆：跨会话沉淀的决策 / 结论 / 偏好 / 教训（按项目归档） */
  projectMemory: {
    'project-fixture': [
      { memoryId: 'pm-f1', kind: '结论', text: '基线观测稳定在 42 ±0.5，可作为后续批次的对照基准。', source: 'session-fixture', updatedAt: '18天前' },
      { memoryId: 'pm-f2', kind: '偏好', text: '证据产物统一落盘 run-artifacts/，命名 {experiment}-{kind}.json。', source: '项目约定', updatedAt: '18天前' },
    ],
    'project-atlas': [
      { memoryId: 'pm-a1', kind: '决策', text: '排液梯度锁定 20/40/60/80 µL 四档，依据 fixture-protocol.pdf §排液。', source: 'session-atlas-1', updatedAt: '2天前' },
      { memoryId: 'pm-a2', kind: '教训', text: '破乳温度波动 ±2°C 会拉高 CV，须先稳定振荡器温控再排液。', source: 'run-atlas-2 复盘', updatedAt: '5天前' },
      { memoryId: 'pm-a3', kind: '结论', text: '批次 C 的 CV 降至 3.7%，确认 800 rpm / 25°C 为当前最优破乳参数。', source: '实验回溯', updatedAt: '1天前' },
    ],
  },

  /* Agent 记忆：每个 Agent 独立沉淀，分「实验 / 设备 / 其他」三类 */
  agentMemory: {
    'agent-fixture-1': { experiment: ['基线观测 42 的标准差控制流程已固化，采样 3 次取中位。'], device: ['观测测量仪读数前预热 5 min，否则首值偏低。'], other: ['报告模板偏好 markdown 表格。'] },
    'agent-atlas-1': { experiment: ['四档排液顺序固定 20→80 µL，避免交叉污染。', '排液前必须人工确认孔板方位（A1 在左上）。'], device: ['移液分配仪零点每周一校准，漂移 >0.5 µL 需复位。'], other: ['与 QC Agent 交接时附带 plate-scan.png。'] },
    'agent-atlas-2': { experiment: ['吸光度目标带 0.40±0.05，越界即判异常并上报。'], device: ['观测测量仪比色皿每次用后以 70% 乙醇冲洗。'], other: ['异常上报走 urgent 级待办。'] },
    'agent-atlas-3': { experiment: ['捕获率统计优先用负二项模型，批次效应以 random effect 建模。'], device: [], other: ['周报每周五 18:00 导出。'] },
    'wa-device': { experiment: ['严格按 SOP 边界操作，超界即暂停等待确认。', '每个观测事件绑定 evidence 哈希后才归档。'], device: ['设备动作前回读固件版本，低于 v1.2 拒绝执行排液。', '订阅设备事件超时 30 s 触发重连。', '7×24 心跳，设备离线 60 s 内置为 offline。'], other: ['产物增量同步至知识中心（每小时）。'] },
  },

  /* 实验回溯：已完成实验的结果对比 / 总结 / 可优化点（对标 Skill 文件） */
  retrospects: [
    {
      retrospectId: 'retro-a', experimentId: 'experiment-atlas-1', batch: '批次 A', title: '排液梯度重现性 · 批次 A',
      projectName: 'Spatial ATAC Pilot', skillId: 'skill-dispense', skillName: '排液梯度技能', sopRef: 'SOP v2.1 §4.2',
      completedAt: '2026-08-12', verdict: 'PASSED_WITH_ISSUES',
      summary: '首次四档排液，CV 偏高（6.8%）。破乳温控不稳导致 2 孔相分离不全，回收率仅 82%。',
      metrics: [['CV', '6.8%', '< 5%', false], ['吸光度', '0.44', '0.40±0.05', false], ['回收率', '82%', '≥ 85%', false], ['单批用时', '48 min', '≤ 45 min', false], ['异常孔', '2 / 96', '0', false]],
      optimizations: [
        { id: 'opt-a1', point: '破乳温控波动 ±2°C', suggestion: '在 SOP §4.2 增加「振荡前预稳定温控 3 min」前置步骤。', severity: 'high' },
        { id: 'opt-a2', point: '60 µL 档 CV 偏高', suggestion: '将该档排液速度由快调为中速，分两次 aspiration。', severity: 'medium' },
      ],
    },
    {
      retrospectId: 'retro-b', experimentId: 'experiment-atlas-1', batch: '批次 B', title: '排液梯度重现性 · 批次 B',
      projectName: 'Spatial ATAC Pilot', skillId: 'skill-dispense', skillName: '排液梯度技能', sopRef: 'SOP v2.2 §4.2',
      completedAt: '2026-08-20', verdict: 'PASSED',
      summary: '引入温控预稳定后 CV 降至 4.9%，达标；回收率提升至 88%。仍偶见 80 µL 档挂壁残留。',
      metrics: [['CV', '4.9%', '< 5%', true], ['吸光度', '0.41', '0.40±0.05', true], ['回收率', '88%', '≥ 85%', true], ['单批用时', '45 min', '≤ 45 min', true], ['异常孔', '0 / 96', '0', true]],
      optimizations: [
        { id: 'opt-b1', point: '80 µL 档挂壁残留', suggestion: '在 §4.2 排液末尾增加 0.5 s 反向回吸（blow-out）。', severity: 'low' },
      ],
    },
    {
      retrospectId: 'retro-c', experimentId: 'experiment-atlas-1', batch: '批次 C', title: '排液梯度重现性 · 批次 C',
      projectName: 'Spatial ATAC Pilot', skillId: 'skill-dispense', skillName: '排液梯度技能', sopRef: 'SOP v2.3 §4.2',
      completedAt: '2026-08-28', verdict: 'PASSED',
      summary: '加入反向回吸后 CV 进一步降至 3.7%，回收率 91%，达成 SOP 目标；当前参数已固化为推荐基准。',
      metrics: [['CV', '3.7%', '< 5%', true], ['吸光度', '0.40', '0.40±0.05', true], ['回收率', '91%', '≥ 85%', true], ['单批用时', '43 min', '≤ 45 min', true], ['异常孔', '0 / 96', '0', true]],
      optimizations: [
        { id: 'opt-c1', point: '单批用时仍可压缩', suggestion: '评估相分离离心 5 min → 4 min（附分层校验）。', severity: 'low' },
      ],
    },
  ],

  projectFiles: {
    'project-fixture': [
      { projectFileId: 'file-workflow', group: 'configuration', displayName: 'configuration/workflow.json', mediaType: 'application/json', revision: 2, status: 'READY', preview: { kind: 'json', content: JSON.stringify({ planId: 'plan-fixture', revision: 2, source: 'fixture' }, null, 2) } },
      { projectFileId: 'file-goal', group: 'conversation-output', displayName: 'conversation-output/goal.md', mediaType: 'text/markdown', revision: 1, status: 'READY', preview: { kind: 'text', content: '# assembled output\n\nFixture Project 的目标记录。' } },
      { projectFileId: 'file-artifact', group: 'run-artifacts', displayName: 'run-artifacts/fixture-observation.json', mediaType: 'application/json', revision: 1, status: 'READY', artifactId: 'artifact-fixture', runId: 'run-fixture', preview: { kind: 'json', content: JSON.stringify({ artifactId: 'artifact-fixture', runId: 'run-fixture', status: 'READY' }, null, 2) } },
    ],
  },

  /* 与实验关联的定时 / 运行任务（例：机器人移液中） */
  tasks: [
    { taskId: 'task-pipette',      projectId: 'project-fixture', experimentId: 'experiment-fixture',   name: '机器人移液',        state: 'running',   trigger: '事件驱动 · 观测就绪',    nextAt: '进行中',            detail: 'Development dispenser 按 20/40/60/80 µL 四档排液，当前 Step 4-2' },
    { taskId: 'task-sync-kb',      projectId: 'project-fixture', experimentId: 'experiment-fixture',   name: '产物同步至知识库',  state: 'scheduled', trigger: 'cron: 0 * * * *',        nextAt: '每小时 :00',        detail: '把新的 run-artifacts 推送到 knowledge imports（增量）' },
    { taskId: 'task-cali-week',    projectId: 'project-fixture', experimentId: 'experiment-fixture',   name: '设备周校准',        state: 'failed',    trigger: 'cron: 0 8 * * 1',        nextAt: '周一 08:00 · 上次失败', detail: '移液枪零点漂移超阈值，等待人工复位后重试' },
    { taskId: 'task-emulsion',     projectId: 'project-atlas',   experimentId: 'experiment-atlas-1',   name: '油包水破乳',        state: 'running',   trigger: 'SOP v2.3 §4.2',          nextAt: '进行中 · 剩余 3min', detail: '加入破乳剂，低速振荡 5min（800rpm · 25±2°C）' },
    { taskId: 'task-qc-daily',     projectId: 'project-atlas',   experimentId: 'experiment-atlas-1',   name: '每日 QC 吸光度复核', state: 'scheduled', trigger: 'cron: 0 9 * * *',        nextAt: '明日 09:00',        detail: '读取 plate-scan.png，比对 0.40±0.05 目标带并归档异常' },
    { taskId: 'task-phase-sep',    projectId: 'project-atlas',   experimentId: 'experiment-atlas-1',   name: '相分离离心',        state: 'queued',    trigger: '依赖：破乳完成',        nextAt: '待前序完成',        detail: '离心分层后取下层水相，转入 Step 4-3' },
    { taskId: 'task-atac-report',  projectId: 'project-atlas',   experimentId: 'experiment-atlas-2',   name: '捕获率周报导出',    state: 'scheduled', trigger: 'cron: 0 18 * * 5',       nextAt: '本周五 18:00',      detail: '汇总捕获率指标 → 生成 markdown 周报并推送邮箱' },
  ],
}

/* 右栏 6 类导航：概述（进展/产物/设备/引用）+ 5 类资源；状态类信息不再散落侧栏 */
const PROJECT_PAGES = [
  { page: 'overview', label: '概述', icon: '◎' },
  { page: 'files', label: '文件', icon: '▤' },
  { page: 'knowledge', label: '知识参考', icon: '❐' },
  { page: 'skills', label: '技能', icon: '⚙' },
  { page: 'outputs', label: '阶段产出', icon: '◧' },
  { page: 'results', label: '重要结果', icon: '★' },
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
  activeViewId: undefined, // 默认纯会话（不展开工作台）；点「新建 chat / 选中会话」才进 lab-workspace
  detailsOpen: false, // 项目工作台开关（仅 lab-workspace 模式生效）
  activeProjectId: 'project-fixture',
  activeSessionId: 'session-fixture', // 助手+SaaS：当前项目下选中的对话
  selectedExperimentId: 'experiment-fixture', // 当前查看的实验详情
  expAnchor: 'goal', // 实验详情页当前的 nav tab：goal | sample | procedure | equipment | artifact | result
  page: 'overview',
  selectedRunId: 'run-fixture',
  selectedExperimentIndex: 0,
  planReview: { 'project-fixture': 'LOCKED', 'project-atlas': 'LOCKED' },
  skillReview: { 'project-fixture': 'ACTIVE', 'project-atlas': 'ACTIVE' },
  filePreviewOpen: {},
  fileDownloaded: {},
  conversation: [],
  deviceWizard: null, // 新增设备向导态：{ step, docId, uploadedName, parsing, parsed, chat, testState, testChecks, agentFns }
  deviceDetail: null, // 设备详情弹窗态：{ deviceId }
  skillEditor: null, // 设备 Skill 编辑器态：{ deviceId, index, isNew, draft:{ name, desc, md } }
  retroSelected: null, // 实验回溯：已选用于对比的已完成实验 retrospectId 数组（null=默认全选）
  settingsOpen: false, // 设置弹窗（DeepSeek Harness 原有设置入口）开关
  sopDialog: null, // SOP 优化对话态：{ retrospectId, optId, chat, draftLines, appliedRev }
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
const VERDICT_TEXT = { PASSED: '达标', PASSED_WITH_ISSUES: '达标·有异常', FAILED: '未达标' }
const SEV_TEXT = { high: '高', medium: '中', low: '低' }
const REF_KIND_TEXT = { paper: '论文', protocol: '协议', dataset: '数据集' }
const MEM_KIND_TEXT = { experiment: '实验', device: '设备', other: '其他' }

/* Work Agent 的三项功能：设备绑定一个 Work Agent，按需勾选它在这台设备上承担的功能 */
const WORK_AGENT_FUNCTIONS = [
  { fn: 'operate', name: '操作', desc: '执行设备动作与参数变更，严格遵循 SOP 边界' },
  { fn: 'collect', name: '采集', desc: '订阅设备事件，回传并归档 run-artifacts' },
  { fn: 'observe', name: '盯守', desc: '7×24 盯守运行指标，异常即时上报' },
]
/** 把已启用功能 key 数组转为中文名（顿号连接） */
const workFnNames = fns => fns.map(fn => WORK_AGENT_FUNCTIONS.find(f => f.fn === fn)?.name ?? fn).join('、')

/** 汇总全部 Agent（实验内 Agent + 工作级 Work Agent），按 agentId 去重 */
const allAgents = () => {
  const map = new Map()
  for (const p of DB.projects) {
    for (const e of (DB.experiments[p.projectId] ?? [])) {
      for (const a of (e.agents ?? [])) {
        if (!map.has(a.agentId)) map.set(a.agentId, { agentId: a.agentId, name: a.name, role: a.focus, scope: p.name })
      }
    }
  }
  for (const w of DB.workAgents) {
    if (!map.has(w.agentId)) map.set(w.agentId, { agentId: w.agentId, name: w.name, role: w.desc, scope: `工作区 · ${w.scope}` })
  }
  return [...map.values()]
}

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

const QUEST_DAYS = { 'project-fixture': 18, 'project-atlas': 5 }
const fmtAgo = d => d >= 30 ? `${Math.round(d / 30)}个月` : `${d}天`

function renderSidebar() {
  // 上段：项目（SaaS 顶层实体）；下行：当前项目下的对话
  const tree = el('projectTree')
  tree.innerHTML = DB.projects.map(p => `
    <button class="projectRow" data-project="${esc(p.projectId)}"${p.projectId === state.activeProjectId ? ' data-active' : ''} title="${esc(p.name)}">
      <span class="questDot" data-project-status="${esc(p.status)}"></span>
      <span class="questName">${esc(p.name)}</span>
      ${p.failedRunCount > 0 ? '<span class="questMeta questAlert" title="有失败运行">!</span>' : ''}
      ${p.pendingApprovalCount > 0 ? '<span class="questMeta questPending" title="待审批">●</span>' : ''}
      <span class="questMeta questDays">${fmtAgo(QUEST_DAYS[p.projectId] ?? 1)}</span>
    </button>`).join('') || '<div class="chatEmpty">暂无项目</div>'

  const pid = state.activeProjectId
  const chats = el('chatTree')
  chats.innerHTML = (DB.sessions[pid] ?? []).map(s => `
    <button class="sessionRow" data-session="${esc(s.sessionId)}" data-project="${esc(pid)}"${s.sessionId === state.activeSessionId ? ' data-active' : ''} title="${esc(s.title)}">
      <span class="sessionDot"></span>
      <span class="sessionName">${esc(s.title)}</span>
      <span class="sessionMeta">${fmtAgo(s.days ?? 1)}</span>
    </button>`).join('') || '<div class="chatEmpty">该项目暂无对话</div>'

  document.querySelectorAll('.globalNav .item[data-nav]').forEach(btn => {
    if (btn.dataset.nav === state.activeViewId) btn.setAttribute('data-active', '')
    else btn.removeAttribute('data-active')
  })
}

/** 新建项目（顶级）：默认工作区下创建项目 + 一个空对话并打开 */
function createProject(workspaceId) {
  const ws = DB.workspaces.find(w => w.workspaceId === workspaceId) ?? DB.workspaces[0]
  const n = DB.projects.filter(p => p.workspaceId === ws.workspaceId).length + 1
  const projectId = `project-${Math.random().toString(36).slice(2, 8)}`
  const sessionId = `session-${projectId}`
  DB.projects.push({ projectId, workspaceId: ws.workspaceId, name: `新项目 ${n}`, description: '尚未配置目标，向助手描述以生成实验', status: 'ACTIVE', sessionCount: 1, experimentCount: 0, activeRunCount: 0, failedRunCount: 0, pendingApprovalCount: 0 })
  DB.sessions[projectId] = [{ sessionId, title: '新对话 1', days: 1, messages: [] }]
  state.activeProjectId = projectId
  state.activeSessionId = sessionId
  state.conversation = []
  state.page = 'overview'
  state.selectedRunId = ''
  state.selectedExperimentIndex = 0
  openAppView('lab-project')
  renderAll()
  scrollConversation()
}

/** 当前项目下新建一轮对话 */
function createSession() {
  const pid = state.activeProjectId
  const list = DB.sessions[pid] ?? (DB.sessions[pid] = [])
  const sessionId = `session-${Math.random().toString(36).slice(2, 8)}`
  list.unshift({ sessionId, title: `新对话 ${list.length + 1}`, days: 1, messages: [] })
  state.activeSessionId = sessionId
  state.conversation = []
  openAppView('lab-project')
  renderAll()
  scrollConversation()
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
  el('monitorExperimentGrid').innerHTML = experiments.map(e => {
    // 关联设备（信息展示）：设备与实验的绑定以项目为粒度，在此处管理
    const devices = (DB.projectDevices[e.projectId] ?? []).map(id => DB.devices.find(d => d.deviceId === id)).filter(Boolean)
    return `
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
      <div class="experimentCardDevices">${devices.length === 0 ? '<span class="todoCount todoCountClear">未关联设备</span>' : devices.map(d => `<span class="capability">${esc(d.name)}</span>`).join('')}</div>
    </button>`
  }).join('')

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

  // 任务：各实验关联的定时 / 运行任务（例：机器人移液中）
  renderTasks()
}

const TASK_STATE_TEXT = { running: '运行中', scheduled: '计划中', queued: '排队中', paused: '暂停', failed: '失败', done: '已完成' }

function renderTasks() {
  const node = el('monitorTasks')
  if (node === null) return
  const tasks = DB.tasks ?? []
  if (tasks.length === 0) { node.innerHTML = '<div class="chatEmpty">暂无任务</div>'; return }
  node.innerHTML = tasks.map(t => {
    const exp = experimentOf(t.experimentId)
    const proj = DB.projects.find(p => p.projectId === t.projectId)
    return `
    <div class="taskRow" data-task-state="${esc(t.state)}">
      <span class="taskDot" data-task-state="${esc(t.state)}"></span>
      <div class="taskBody">
        <div class="taskHead"><strong>${esc(t.name)}</strong><span class="taskExp">· ${esc(proj?.name ?? t.projectId)} / ${esc(exp?.title ?? t.experimentId)}</span></div>
        <div class="taskDetail">${esc(t.detail)}</div>
      </div>
      <div class="taskMeta">
        <span class="taskState" data-state="${esc(t.state)}">${esc(TASK_STATE_TEXT[t.state] ?? t.state)}</span>
        <span>${esc(t.trigger)}</span>
        <span>${esc(t.nextAt)}</span>
      </div>
    </div>`
  }).join('')
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


function renderRetrospect() {
  const retros = DB.retrospects
  if (retros.length === 0) {
    el('retroPicker').innerHTML = ''
    el('retroCompare').innerHTML = '<div class="retroEmpty">暂无已完成实验</div>'
    el('retroCards').innerHTML = ''
    return
  }

  // 选择态：默认全选；对比表列 = 已选实验（按 DB 顺序稳定排列，选择先后不影响列序）
  if (state.retroSelected === null) state.retroSelected = retros.map(r => r.retrospectId)
  const picked = new Set(state.retroSelected)
  const selected = retros.filter(r => picked.has(r.retrospectId))

  // ① 已完成实验选择卡（多选）：勾选的实验进入下方对比表
  el('retroPicker').innerHTML = `
    <div class="retroPickerBar">
      <span class="retroPickerHint">${selected.length < 2 ? '请选择至少 2 个已完成实验进行对比' : `已选 ${selected.length} 个实验 · 下表按指标逐项对比`}</span>
      <span class="retroPickerActs">
        <button class="retroPickerBtn" data-retro-pick-all>全选</button>
        <button class="retroPickerBtn" data-retro-pick-none>清空</button>
      </span>
    </div>
    <div class="retroPickList">
      ${retros.map(r => {
        const on = picked.has(r.retrospectId)
        return `
        <button class="retroPick ${on ? 'is-picked' : ''}" data-retro-pick="${esc(r.retrospectId)}" aria-pressed="${on}" title="${on ? '点击取消对比' : '点击加入对比'}">
          <span class="retroPickCheck">${on ? '✓' : ''}</span>
          <span class="retroPickBody">
            <strong>${esc(r.title)}</strong>
            <span class="retroPickMeta">${esc(r.projectName)} · ${esc(r.sopRef)} · 完成于 ${esc(r.completedAt)}</span>
          </span>
          <span class="verdictBadge" data-verdict="${esc(r.verdict)}">${esc(VERDICT_TEXT[r.verdict] ?? r.verdict)}</span>
        </button>`
      }).join('')}
    </div>`

  // 对标 Skill（取首个已选实验）
  el('retroSkillName').textContent = selected[0]?.skillName ?? '—'

  // ② 结果对比表：行=指标，列=已选实验（多选动态对比，非静态全量）
  el('retroCompare').innerHTML = selected.length === 0
    ? '<div class="retroEmpty">请从上方选择已完成实验进行对比</div>'
    : renderRetroTable(selected)

  // 总结卡 + 可优化点（点可优化点 → 对话优化该实验对标的 SOP/Skill）
  el('retroCards').innerHTML = retros.map(r => `
    <article class="retroCard">
      <header class="retroCardTop">
        <div class="retroCardTitle">
          <strong>${esc(r.title)}</strong>
          <span class="knowledgeMuted">${esc(r.projectName)} · ${esc(r.sopRef)} · 完成于 ${esc(r.completedAt)}</span>
        </div>
        <span class="verdictBadge" data-verdict="${esc(r.verdict)}">${esc(VERDICT_TEXT[r.verdict] ?? r.verdict)}</span>
      </header>
      <p class="retroSummary">${esc(r.summary)}</p>
      <div class="retroOpts">
        <h4>可优化点 <span class="sectionNote">点击对话优化 SOP</span></h4>
        ${r.optimizations.map(o => `
        <button class="optRow" data-optimize-sop="${esc(r.retrospectId)}" data-opt="${esc(o.id)}">
          <span class="optSeverity" data-level="${esc(o.severity)}">${esc(SEV_TEXT[o.severity] ?? o.severity)}</span>
          <span class="optText"><strong>${esc(o.point)}</strong><span>${esc(o.suggestion)}</span></span>
          <span class="optCta">优化 SOP ›</span>
        </button>`).join('')}
      </div>
    </article>`).join('')
}

/** 对比表：列=传入的已选实验，行=指标（按指标名匹配，兼容不同实验的指标顺序） */
function renderRetroTable(rows) {
  const labels = rows[0].metrics.map(m => m[0])
  return `
    <table class="retroTable">
      <thead>
        <tr><th>指标</th><th class="targetCol">目标</th>${rows.map(r => `<th>${esc(r.batch)}<span class="retroThMeta">${esc(r.completedAt)}</span></th>`).join('')}</tr>
      </thead>
      <tbody>
        ${labels.map((label, i) => `
        <tr>
          <td class="metricLabel">${esc(label)}</td>
          <td class="targetCol">${esc(rows[0].metrics[i][2])}</td>
          ${rows.map(r => {
            const m = r.metrics.find(x => x[0] === label) ?? ['', '—', '', false]
            return `<td data-ok="${m[3] ? 'yes' : 'no'}">${esc(m[1])}</td>`
          }).join('')}
        </tr>`).join('')}
      </tbody>
    </table>`
}

/** 切换已完成实验对比选择：单卡切换 / 全选 / 清空 */
function toggleRetroPick(node) {
  if (state.retroSelected === null) state.retroSelected = DB.retrospects.map(r => r.retrospectId)
  if (node.hasAttribute('data-retro-pick-all')) state.retroSelected = DB.retrospects.map(r => r.retrospectId)
  else if (node.hasAttribute('data-retro-pick-none')) state.retroSelected = []
  else {
    const id = node.dataset.retroPick
    const i = state.retroSelected.indexOf(id)
    if (i >= 0) state.retroSelected.splice(i, 1)
    else state.retroSelected.push(id)
  }
  renderRetrospect()
}

/* ============ 设置（DeepSeek Harness 原有设置入口：侧栏底部齿轮） ============ */

function openSettings() {
  state.settingsOpen = true
  renderSettings()
}

function renderSettings() {
  const root = el('settingsDialog')
  if (root === null) return
  root.hidden = !state.settingsOpen
  if (state.settingsOpen === false) return
  el('settingsBody').innerHTML = `
    <section class="settingsSec">
      <h3>外观</h3>
      <div class="settingsRow">
        <span class="settingsLabel">主题</span>
        <div class="settingsSeg">
          <button class="settingsSegBtn ${state.theme === 'light' ? 'is-on' : ''}" data-action="set-theme" data-theme="light">浅色</button>
          <button class="settingsSegBtn ${state.theme === 'dark' ? 'is-on' : ''}" data-action="set-theme" data-theme="dark">深色</button>
        </div>
      </div>
      <div class="settingsRow">
        <span class="settingsLabel">侧边栏</span>
        <div class="settingsSeg">
          <button class="settingsSegBtn ${state.sidebarCollapsed ? '' : 'is-on'}" data-action="set-sidebar" data-collapse="0">展开</button>
          <button class="settingsSegBtn ${state.sidebarCollapsed ? 'is-on' : ''}" data-action="set-sidebar" data-collapse="1">折叠</button>
        </div>
      </div>
    </section>
    <section class="settingsSec">
      <h3>Host</h3>
      <div class="settingsRow">
        <span class="settingsLabel">连接状态</span>
        <span class="settingsValue"><span class="statusDot"></span> DeepSeek Harness · 已连接</span>
      </div>
    </section>
    <section class="settingsSec">
      <h3>数据</h3>
      <div class="settingsRow">
        <span class="settingsLabel">重置演示数据</span>
        <button class="action" data-action="reset-demo">重新加载</button>
      </div>
      <p class="wizardMuted">静态演示数据保存在内存中，重新加载即恢复初始状态。</p>
    </section>`
  el('settingsFoot').innerHTML = `<button class="action primary" data-action="close-settings">完成</button>`
}

function renderDevices() {
  const online = DB.devices.filter(d => d.status === 'ready').length
  el('devicesStatusValue').textContent = `${online} 台在线`

  // 仅作信息显示：设备与实验的关联由「项目总览 → 实验卡片」管理；点卡弹详情可改绑 Work Agent / 编辑设备 Skill
  el('devicesGrid').innerHTML = DB.devices.map(d => {
    const ready = d.status === 'ready'
    const projects = DB.projects.filter(p => (DB.projectDevices[p.projectId] ?? []).includes(d.deviceId))
    return `
    <div class="deviceCard" data-device-detail="${esc(d.deviceId)}" role="button" tabindex="0" title="点击查看设备详情"${d.flash ? ' data-flash' : ''}>
      <div class="deviceCardHeader">
        <div>
          <h3 class="deviceName">${esc(d.name)}</h3>
          <div class="deviceId">端点 · ${esc(d.endpoint)}</div>
        </div>
        <span class="deviceBadge" data-state="${ready ? 'ready' : 'offline'}">${ready ? '在线' : '离线'}</span>
      </div>
      <div class="deviceDetails">
        <div><span>固件</span><span>${esc(d.firmware)}</span></div>
        <div><span>接入项目</span><span>${projects.length === 0 ? '<em class="devicesMuted">未关联</em>' : projects.map(p => esc(p.name)).join('、')}</span></div>
        <div><span>Work Agent</span><span>${d.agentFns.length === 0 ? '<em class="devicesMuted">未绑定</em>' : `已启用 ${d.agentFns.length} 项功能 · ${esc(workFnNames(d.agentFns))}`}</span></div>
      </div>
      <div class="deviceCapabilities">${d.capabilities.map(c => `<span class="capability" title="${esc(c.desc ?? '')}">${esc(c.name)}</span>`).join('')}</div>
    </div>`
  }).join('')
  for (const d of DB.devices) delete d.flash
}

/* ============ 新增设备向导：上传接口文档 → LLM 理解 → chat 确认/手动修改 → 连接测试 → 分配 Work Agent ============ */

const WIZARD_STEPS = [
  { id: 'doc', label: '上传接口文档' },
  { id: 'parse', label: 'LLM 理解' },
  { id: 'confirm', label: '确认与修改' },
  { id: 'test', label: '连接测试' },
  { id: 'agent', label: '启用 Work Agent' },
]

const WIZARD_DOCS = [
  { docId: 'doc-openapi', name: 'cellassay-openapi.yaml', kind: 'OpenAPI 3.1', size: '84 KB' },
  { docId: 'doc-modbus', name: 'modbus-register-map.xlsx', kind: 'Modbus 寄存器表', size: '31 KB' },
  { docId: 'doc-http', name: 'vendor-http-api.md', kind: '厂商 HTTP 接口文档', size: '12 KB' },
]

const WIZARD_PARSE_RESULT = {
  deviceName: 'CellAssay Pro 多功能读板仪',
  vendor: 'Biotron',
  endpoint: 'tcp://192.168.1.42:5025',
  protocol: 'SCPI over TCP',
  confidence: 0.93,
  functions: [
    { fn: 'start_scan', label: '启动扫描', params: [['mode', 'enum: absorb | fluor'], ['wavelength', 'number · 200–999 nm']], events: ['scan_progress', 'scan_completed'] },
    { fn: 'read_plate', label: '读取整板吸光', params: [['plate_id', 'string'], ['shaking', 'bool · 默认 false']], events: ['plate_data'] },
    { fn: 'home', label: '归位', params: [], events: ['device_ready'] },
  ],
}

function openDeviceWizard() {
  state.deviceWizard = { step: 0, docId: '', uploadedName: '', parsing: false, parsed: null, chat: [], testState: 'idle', testChecks: [], agentFns: [] }
  renderDeviceWizard()
}

function closeDeviceWizard() {
  state.deviceWizard = null
  renderDeviceWizard()
}

function renderDeviceWizard() {
  const root = el('deviceWizard')
  if (root === null) return
  const w = state.deviceWizard
  root.hidden = w === null
  if (w === null) return
  el('deviceWizardRail').innerHTML = WIZARD_STEPS.map((s, i) => `
    <li class="wizardStepItem" data-state="${i < w.step ? 'done' : i === w.step ? 'active' : 'todo'}">
      <span class="wizardStepDot">${i < w.step ? '✓' : i + 1}</span><span>${esc(s.label)}</span>
    </li>`).join('')
  el('deviceWizardBody').innerHTML = renderWizardStep(w)
  el('deviceWizardFoot').innerHTML = renderWizardFoot(w)
  // step0 上传接口文档：选中本地文件后作为已选项（静态演示：只记文件名，解析结果走 mock）
  const docFile = el('wizardDocFile')
  if (docFile !== null) docFile.addEventListener('change', () => {
    const f = docFile.files?.[0]
    if (f === undefined || state.deviceWizard === null) return
    state.deviceWizard.docId = 'uploaded'
    state.deviceWizard.uploadedName = f.name
    renderDeviceWizard()
  })
  const list = el('wizardChatList')
  if (list !== null) list.scrollTop = list.scrollHeight
  const input = el('wizardChatInput')
  if (input !== null && w.step === 2) input.focus()
}

function renderWizardStep(w) {
  if (w.step === 0) {
    return `
    <div class="wizardBlock">
      <h3>选择接口文档</h3>
      <p class="wizardHint">支持 OpenAPI / Modbus 寄存器表 / 厂商 HTTP 文档；LLM 将从中提取设备功能、字段与上报事件。</p>
      <div class="wizardDocList">
        ${WIZARD_DOCS.map(d => `
        <button class="wizardDoc ${w.docId === d.docId ? 'is-picked' : ''}" data-action="wizard-doc-pick" data-doc="${d.docId}">
          <span class="wizardDocName">${esc(d.name)}</span>
          <span class="wizardDocMeta">${esc(d.kind)} · ${esc(d.size)}</span>
        </button>`).join('')}
        ${w.docId === 'uploaded' ? `
        <button class="wizardDoc is-picked" data-action="wizard-doc-pick" data-doc="uploaded">
          <span class="wizardDocName">${esc(w.uploadedName || '已上传文档')}</span>
          <span class="wizardDocMeta">本地上传</span>
        </button>` : ''}
      </div>
      <div class="wizardUploadRow">
        <button class="action" data-action="wizard-upload-doc">＋ 上传接口文档</button>
        <input id="wizardDocFile" type="file" accept=".yaml,.yml,.json,.md,.markdown,.xlsx,.csv,.txt" hidden>
        <span class="wizardMuted">或从本地上传 .yaml / .json / .md / .xlsx / .csv</span>
      </div>
    </div>`
  }
  if (w.step === 1) {
    if (w.parsing) {
      return `
      <div class="wizardBlock wizardParsing">
        <h3>LLM 正在理解文档…</h3>
        <ul class="wizardParseLines">
          <li>读取文档结构与接口定义…</li>
          <li>识别设备类型与通信协议…</li>
          <li>抽取功能 / 字段 / 上报事件…</li>
        </ul>
      </div>`
    }
    const p = w.parsed
    const fnCount = p.functions.length
    const evtCount = new Set(p.functions.flatMap(f => f.events)).size
    return `
    <div class="wizardBlock">
      <h3>理解结果</h3>
      <div class="wizardParseSummary">
        <div class="wizardParseDevice"><strong>${esc(p.deviceName)}</strong><span class="wizardMuted">${esc(p.vendor)} · ${esc(p.protocol)}</span></div>
        <span class="wizardEndpoint"><code>${esc(p.endpoint)}</code></span>
        <div class="wizardConfidence"><span>理解置信度</span><div class="bar"><i style="width:${Math.round(p.confidence * 100)}%"></i></div><code>${Math.round(p.confidence * 100)}%</code></div>
        <p class="wizardMuted">识别到 ${fnCount} 个功能 · ${evtCount} 个上报事件，进入下一步逐项确认。</p>
      </div>
    </div>`
  }
  if (w.step === 2) {
    const p = w.parsed
    return `
    <div class="wizardConfirm">
      <section class="wizardChat">
        <div class="wizardChatList" id="wizardChatList">
          ${w.chat.map(m => `<div class="wizardMsg ${m.role === 'agent' ? 'is-agent' : 'is-user'}"><span>${esc(m.text)}</span></div>`).join('')}
        </div>
        <div class="wizardChatInputRow">
          <input id="wizardChatInput" placeholder="例如：波长上限改成 1100 nm / 删除归位功能" />
          <button class="action primary" data-action="wizard-send">发送</button>
        </div>
      </section>
      <section class="wizardParsed">
        <div class="wizardParsedMeta">
          <span data-edit-meta="deviceName" class="wizardEditSpan" title="点击修改">${esc(p.deviceName)}</span>
          <span class="wizardMuted">${esc(p.vendor)} · ${esc(p.protocol)}</span>
          <span data-edit-meta="endpoint" class="wizardEditSpan" title="点击修改"><code>${esc(p.endpoint)}</code></span>
        </div>
        <div class="wizardFnList">
          ${p.functions.map((f, fi) => `
          <div class="wizardFnCard ${f.deleted ? 'is-deleted' : ''}">
            <header>
              <strong data-edit-param="${fi}:label" class="wizardEditSpan" title="点击修改">${esc(f.label)}</strong>
              <code class="wizardFnId">${esc(f.fn)}</code>
              <button class="wizardMiniBtn" data-action="wizard-del-fn" data-del-fn="${fi}">${f.deleted ? '恢复' : '删除'}</button>
            </header>
            ${f.params.length === 0 ? '<p class="wizardMuted">无参数</p>' : `
            <ul class="wizardParamList">
              ${f.params.map((kv, pi) => `<li><code>${esc(kv[0])}</code><span data-edit-param="${fi}:${pi}" class="wizardEditSpan" title="点击修改">${esc(kv[1])}</span></li>`).join('')}
            </ul>`}
            <p class="wizardMuted">上报事件：${f.events.length > 0 ? f.events.map(x => esc(x)).join('、') : '无'}</p>
          </div>`).join('')}
        </div>
        <button class="action" data-action="wizard-add-fn">＋ 手动补充功能</button>
      </section>
    </div>`
  }
  if (w.step === 3) {
    const p = w.parsed
    const fns = p.functions.filter(f => !f.deleted)
    if (w.testChecks.length === 0) {
      w.testChecks = [
        { label: '端点可达', detail: `TCP ${p.endpoint}`, state: 'pending', note: '' },
        { label: '鉴权握手', detail: `Token 校验 · vendor=${p.vendor}`, state: 'pending', note: '' },
        { label: '协议握手', detail: p.protocol, state: 'pending', note: '' },
        { label: '能力探测', detail: `${fns.length} 个功能 · ${new Set(fns.flatMap(f => f.events)).size} 个事件全部响应`, state: 'pending', note: '' },
      ]
    }
    return `
    <div class="wizardBlock">
      <h3>连接测试</h3>
      <ul class="wizardTestList">
        ${w.testChecks.map(c => `
        <li data-state="${c.state}">
          <span class="wizardTestDot"></span>
          <div><strong>${esc(c.label)}</strong><span class="wizardMuted">${esc(c.detail)}</span></div>
          <code>${esc(c.note)}</code>
        </li>`).join('')}
      </ul>
      <button class="action primary" data-action="wizard-test" ${w.testState === 'running' ? 'disabled' : ''}>${w.testState === 'done' ? '重新测试' : '开始连接测试'}</button>
    </div>`
  }
  return `
  <div class="wizardBlock">
    <h3>启用 Work Agent</h3>
    <p class="wizardHint">为该设备绑定 <strong>Work Agent</strong>（数字员工），并勾选它在这台设备上承担的功能。绑定后 Agent 按 SOP 与能力边界自主运行，并通过事件回传沉淀运行记忆。</p>
    <div class="wizardAgentSingle">
      <span class="wizardAgentAvatar">◈</span>
      <div class="wizardAgentId"><strong>设备 Work Agent</strong><span class="wizardMuted">接管设备、按 SOP 与能力边界自主运行的数字员工</span></div>
    </div>
    <div class="wizardFnToggles">
      ${WORK_AGENT_FUNCTIONS.map(f => `
      <button class="wizardFnToggle ${w.agentFns.includes(f.fn) ? 'is-on' : ''}" data-action="wizard-toggle-fn" data-fn="${f.fn}">
        <span class="wizardFnCheck">${w.agentFns.includes(f.fn) ? '✓' : ''}</span>
        <span class="wizardFnText"><strong>${esc(f.name)}</strong><span>${esc(f.desc)}</span></span>
      </button>`).join('')}
    </div>
  </div>`
}

function renderWizardFoot(w) {
  const canNext = w.step === 0 ? w.docId !== ''
    : w.step === 1 ? w.parsed !== null
    : w.step === 3 ? w.testState === 'done'
    : w.step === 4 ? w.agentFns.length > 0
    : true
  const nextLabel = ['开始 LLM 理解', '进入确认', '开始连接测试', '启用 Work Agent', '完成接入'][w.step]
  return `
    <button class="action" data-action="wizard-prev" ${w.step === 0 ? 'disabled' : ''}>上一步</button>
    <button class="action ${w.step === 4 ? 'primary' : ''}" data-action="wizard-next" ${canNext ? '' : 'disabled'}>${nextLabel}</button>`
}

function runWizardParse() {
  const w = state.deviceWizard
  w.step = 1
  w.parsing = true
  renderDeviceWizard()
  setTimeout(() => {
    const ww = state.deviceWizard
    if (ww === null || ww.parsing === false) return
    ww.parsing = false
    ww.parsed = structuredClone(WIZARD_PARSE_RESULT)
    ww.chat = [{ role: 'agent', text: `文档解析完成：识别到 ${ww.parsed.functions.length} 个功能、${new Set(ww.parsed.functions.flatMap(f => f.events)).size} 个上报事件。请逐项核对右侧列表——字段值可直接点击修改，也可以直接在这里告诉我，例如「波长上限改成 1100 nm」「删除归位功能」。` }]
    renderDeviceWizard()
  }, 1400)
}

function sendWizardChat() {
  const input = el('wizardChatInput')
  const text = (input?.value ?? '').trim()
  if (text === '' || state.deviceWizard === null) return
  const w = state.deviceWizard
  w.chat.push({ role: 'user', text })
  w.chat.push({ role: 'agent', text: wizardAgentReply(text) })
  input.value = ''
  renderDeviceWizard()
}

function wizardAgentReply(text) {
  const p = state.deviceWizard.parsed
  const hit = p.functions.find(f => !f.deleted && text.includes(f.label))
  if (/(删除|移除|去掉)/.test(text) && hit !== undefined) {
    hit.deleted = true
    return `已标记删除「${hit.label}」，接入时不会注册该功能。`
  }
  if (/波长|wavelength/i.test(text)) {
    for (const f of p.functions) for (const kv of f.params) if (kv[0] === 'wavelength') kv[1] = 'number · 200–1100 nm'
    return '已更新：wavelength 范围 → 200–1100 nm，右侧列表已同步。'
  }
  if (/(新增|补充|加一?个?功能)/.test(text)) return '可以点右侧「＋ 手动补充功能」生成空白功能卡，字段值点击即可填写。'
  if (/(设备名|名称)/.test(text)) return '设备名可在右上直接点击修改，修改后将作为注册名。'
  return '已记录。字段值支持在右侧直接点击修改；确认无误后点「开始连接测试」。'
}

function beginWizardEdit(span) {
  const key = span.dataset.editParam ?? span.dataset.editMeta
  const p = state.deviceWizard.parsed
  const parts = key.split(':')
  const fi = Number(parts[0])
  const field = parts[1]
  let current
  if (span.dataset.editMeta !== undefined) current = p[span.dataset.editMeta]
  else if (field === 'label') current = p.functions[fi].label
  else current = p.functions[fi].params[Number(field)][1]
  const input = document.createElement('input')
  input.className = 'wizardEditInput'
  input.value = current
  span.replaceWith(input)
  input.focus()
  input.select()
  let done = false
  const commit = () => {
    if (done) return
    done = true
    const value = input.value.trim()
    if (span.dataset.editMeta !== undefined) p[span.dataset.editMeta] = value
    else if (field === 'label') p.functions[fi].label = value
    else p.functions[fi].params[Number(field)][1] = value
    renderDeviceWizard()
  }
  input.addEventListener('blur', commit)
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); input.blur() }
    if (ev.key === 'Escape') { done = true; renderDeviceWizard() }
  })
}

function runWizardTest() {
  const w = state.deviceWizard
  if (w.testState === 'running') return
  w.testState = 'running'
  w.testChecks.forEach(c => { c.state = 'pending'; c.note = '' })
  let i = 0
  const tick = () => {
    const ww = state.deviceWizard
    if (ww === null) return
    if (i > 0) ww.testChecks[i - 1].state = 'ok', ww.testChecks[i - 1].note = `${12 + i * 7} ms`
    if (i < ww.testChecks.length) {
      ww.testChecks[i].state = 'running'
      renderDeviceWizard()
      i += 1
      setTimeout(tick, 620)
      return
    }
    ww.testState = 'done'
    renderDeviceWizard()
  }
  tick()
}

function finishDeviceWizard() {
  const w = state.deviceWizard
  const p = w.parsed
  const deviceId = `device-${Date.now().toString(36).slice(-6)}`
  const fns = p.functions.filter(f => !f.deleted)
  DB.devices.push({
    deviceId, id: deviceId, name: p.deviceName, status: 'ready',
    endpoint: p.endpoint, firmware: `${p.vendor.toLowerCase()}-llm-1.0.0`,
    capabilities: fns.map(f => ({
      name: f.label,
      desc: `fn: ${f.fn} · 事件 ${f.events.length > 0 ? f.events.join('/') : '无'}`,
      md: `# ${f.label}\n\n## 接口\n- fn: ${f.fn}\n${f.params.length > 0 ? f.params.map(kv => `- ${kv[0]}: ${kv[1]}`).join('\n') : '- 无参数'}\n\n## 上报事件\n${f.events.length > 0 ? f.events.map(e => `- ${e}`).join('\n') : '- 无'}`,
    })),
    agentFns: [...w.agentFns], flash: true,
  })
  state.deviceWizard = null
  renderDeviceWizard()
  renderDevices()
}

/* ============ 设备详情弹窗：点击设备卡打开；可改绑 Work Agent、编辑设备 Skill ============ */

function renderDeviceDetail() {
  const root = el('deviceDetail')
  if (root === null) return
  const d = DB.devices.find(x => x.deviceId === state.deviceDetail?.deviceId)
  root.hidden = d === undefined
  if (d === undefined) return
  const projects = DB.projects.filter(p => (DB.projectDevices[p.projectId] ?? []).includes(d.deviceId))
  el('deviceDetailTitle').textContent = d.name
  el('deviceDetailBody').innerHTML = `
    <section class="deviceDetailSec">
      <h3>基本信息</h3>
      <div class="deviceDetailGrid">
        <div><span>设备名</span><span data-edit-dev="name" class="wizardEditSpan" title="点击修改">${esc(d.name)}</span></div>
        <div><span>端点</span><span data-edit-dev="endpoint" class="wizardEditSpan" title="点击修改"><code>${esc(d.endpoint)}</code></span></div>
        <div><span>固件</span><span data-edit-dev="firmware" class="wizardEditSpan" title="点击修改">${esc(d.firmware)}</span></div>
        <div><span>状态</span><span>${d.status === 'ready' ? '在线' : '离线'}</span></div>
        <div><span>接入项目</span><span>${projects.length === 0 ? '<em class="devicesMuted">未关联</em>' : projects.map(p => esc(p.name)).join('、')}</span></div>
      </div>
      <p class="wizardHint">设备与实验的关联由「项目总览 → 实验卡片」管理；此页仅作信息显示与智能化配置。</p>
    </section>
    <section class="deviceDetailSec">
      <h3>Work Agent${d.agentFns.length === 0 ? ' <em class="devicesMuted">未绑定 · 勾选功能后设备获得自主运行能力</em>' : ` <em class="devicesMuted">已启用 ${d.agentFns.length} 项功能</em>`}</h3>
      <div class="wizardAgentSingle">
        <span class="wizardAgentAvatar">◈</span>
        <div class="wizardAgentId"><strong>设备 Work Agent</strong><span class="wizardMuted">接管设备、按 SOP 与能力边界自主运行的数字员工</span></div>
      </div>
      <div class="wizardFnToggles">
        ${WORK_AGENT_FUNCTIONS.map(f => `
        <button class="wizardFnToggle ${d.agentFns.includes(f.fn) ? 'is-on' : ''}" data-action="device-toggle-fn" data-fn="${f.fn}">
          <span class="wizardFnCheck">${d.agentFns.includes(f.fn) ? '✓' : ''}</span>
          <span class="wizardFnText"><strong>${esc(f.name)}</strong><span>${esc(f.desc)}</span></span>
        </button>`).join('')}
      </div>
    </section>
    <section class="deviceDetailSec">
      <h3>设备 Skill <span class="wizardMuted">Work Agent 通过这些 Skill 操作设备 · 点击可编辑 skill.md</span></h3>
      <div class="deviceSkillList">
        ${d.capabilities.length === 0 ? '<p class="wizardMuted">暂无 Skill，点下方「新增 Skill」上传或编写。</p>' : d.capabilities.map((c, i) => `
        <div class="deviceSkillRow" data-edit-skill="${i}" role="button" tabindex="0" title="点击编辑 skill.md">
          <strong>${esc(c.name)}</strong>
          <span class="wizardSkillDesc">${c.desc !== undefined && c.desc !== '' ? esc(c.desc) : '补充描述…'}</span>
          <button class="wizardMiniBtn" data-action="device-del-skill" data-del-skill="${i}">删除</button>
        </div>`).join('')}
      </div>
      <button class="action" data-action="device-add-skill">＋ 新增 Skill</button>
    </section>`
  el('deviceDetailFoot').innerHTML = '<button class="action primary" data-action="close-device-detail">完成</button>'
}

function beginDeviceEdit(span) {
  const d = DB.devices.find(x => x.deviceId === state.deviceDetail.deviceId)
  if (d === undefined) return
  const key = span.dataset.editDev // name | endpoint | firmware
  const input = document.createElement('input')
  input.className = 'wizardEditInput'
  input.value = d[key] ?? ''
  span.replaceWith(input)
  input.focus()
  input.select()
  let done = false
  const commit = () => {
    if (done) return
    done = true
    d[key] = input.value.trim()
    renderDeviceDetail()
    renderDevices()
  }
  input.addEventListener('blur', commit)
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); input.blur() }
    if (ev.key === 'Escape') { done = true; renderDeviceDetail() }
  })
}

/* ============ 设备 Skill 编辑器：弹窗编辑 skill.md（多行文本 / 上传 .md）+ 名称 / 简解 ============ */

function openSkillEditor(deviceId, index, isNew = false) {
  const d = DB.devices.find(x => x.deviceId === deviceId)
  if (d === undefined) return
  const c = isNew ? { name: '', desc: '', md: '' } : d.capabilities[index]
  if (c === undefined) return
  state.skillEditor = { deviceId, index, isNew, draft: { name: c.name ?? '', desc: c.desc ?? '', md: c.md ?? '' } }
  renderSkillEditor()
}

function renderSkillEditor() {
  const root = el('skillEditor')
  if (root === null) return
  const s = state.skillEditor
  root.hidden = s === null
  if (s === null) return
  el('skillEditorTitle').textContent = s.isNew ? '新增 Skill' : '编辑 Skill'
  el('skillEditorBody').innerHTML = `
    <div class="skillEdFields">
      <div class="skillEdField"><label for="skillEdName">名称</label><input id="skillEdName" class="kcInput" value="${esc(s.draft.name)}" placeholder="例如：排液梯度"></div>
      <div class="skillEdField"><label for="skillEdDesc">简解</label><input id="skillEdDesc" class="kcInput" value="${esc(s.draft.desc)}" placeholder="一句话说明这个 Skill 做什么"></div>
    </div>
    <div class="skillEdMdHead">
      <label for="skillEdMd">skill.md <span class="wizardMuted">Work Agent 操作该设备的完整技能定义</span></label>
      <button class="action" data-action="skill-upload-md">＋ 上传 .md</button>
      <input id="skillMdFile" type="file" accept=".md,.markdown,text/markdown,text/plain" hidden>
    </div>
    <textarea id="skillEdMd" class="skillEdMd" rows="14" spellcheck="false" placeholder="# 排液梯度&#10;&#10;## 参数&#10;- volume: 20/40/60/80 µL&#10;&#10;## 边界&#10;- 单次 ≤ 100 µL">${esc(s.draft.md)}</textarea>
    <p class="wizardHint">可直接编辑 skill.md 全文，或上传 .md 文件覆盖；保存后 Work Agent 即以此定义操作设备。</p>`
  el('skillEditorFoot').innerHTML = `
    <button class="action" data-action="close-skill-editor">取消</button>
    <button class="action primary" data-action="save-skill">保存 Skill</button>`
  const mdFile = el('skillMdFile')
  if (mdFile !== null) mdFile.addEventListener('change', () => {
    const f = mdFile.files?.[0]
    if (f === undefined || state.skillEditor === null) return
    const reader = new FileReader()
    reader.onload = () => {
      if (state.skillEditor === null) return
      state.skillEditor.draft.md = String(reader.result ?? '')
      const ta = el('skillEdMd')
      if (ta !== null) ta.value = state.skillEditor.draft.md
      const nameInput = el('skillEdName')
      if (nameInput !== null && nameInput.value.trim() === '') nameInput.value = f.name.replace(/\.(md|markdown)$/i, '')
    }
    reader.readAsText(f)
  })
}

const FILE_GROUP_TEXT = { configuration: '配置', 'conversation-output': '会话产出', 'run-artifacts': '运行产物' }

function renderKnowledge() {
  const refs = DB.knowledge.refs
  el('knowledgeStatusBadge').textContent = `${refs.length} 篇`

  // 1) 参考文档（论文 / 协议 / 数据集）
  el('knowledgeRefs').innerHTML = refs.map(r => `
    <article class="refCard" data-ref-kind="${esc(r.kind)}">
      <header class="refCardTop">
        <span class="refKind">${esc(REF_KIND_TEXT[r.kind] ?? r.kind)}</span>
        <strong class="refTitle" title="${esc(r.title)}">${esc(r.title)}</strong>
        <span class="badge">${esc(STATUS_TEXT[r.status] ?? r.status)}</span>
      </header>
      <p class="refExcerpt">${esc(r.excerpt)}</p>
      <footer class="refMeta"><span>${esc(r.source)}</span><span>${esc(r.versionId)}${r.cited > 0 ? ` · 被引 ${r.cited}` : ''}</span></footer>
    </article>`).join('')

  // 2) 项目归档（历史项目文件；「归档项目文件」换称「项目归档」）
  const archive = DB.projects.flatMap(p => (DB.projectFiles[p.projectId] ?? []).map(f => ({ ...f, projectName: p.name })))
  el('knowledgeArchive').innerHTML = archive.length === 0
    ? '<div class="row"><span>暂无归档文件</span><span>—</span></div>'
    : archive.map(f => `
    <div class="archiveRow">
      <span class="archiveGroup" data-group="${esc(f.group)}">${esc(FILE_GROUP_TEXT[f.group] ?? f.group)}</span>
      <div class="archiveText">
        <strong>${esc(f.displayName)}</strong>
        <span class="knowledgeMuted">${esc(f.projectName)} · rev.${f.revision} · ${esc(f.mediaType)}</span>
      </div>
      <span class="badge">${esc(STATUS_TEXT[f.status] ?? f.status)}</span>
    </div>`).join('')

  // 3) 项目记忆（决策 / 结论 / 偏好 / 教训）
  const pm = DB.projects.flatMap(p => (DB.projectMemory[p.projectId] ?? []).map(m => ({ ...m, projectName: p.name })))
  el('knowledgeProjectMemory').innerHTML = pm.length === 0
    ? '<div class="row"><span>暂无项目记忆</span><span>—</span></div>'
    : pm.map(m => `
    <div class="memoryRow">
      <span class="memKind" data-kind="${esc(m.kind)}">${esc(m.kind)}</span>
      <div class="memoryText">
        <strong>${esc(m.text)}</strong>
        <span class="knowledgeMuted">${esc(m.projectName)} · 来源 ${esc(m.source)} · ${esc(m.updatedAt)}</span>
      </div>
    </div>`).join('')

  // 4) Agent 记忆（实验 / 设备 / 其他；每个 Agent 一张卡）
  el('knowledgeAgentMemory').innerHTML = allAgents().map(a => {
    const mem = DB.agentMemory[a.agentId] ?? { experiment: [], device: [], other: [] }
    const cat = key => (mem[key]?.length ?? 0) > 0
      ? `<ul class="memCatList">${mem[key].map(t => `<li>${esc(t)}</li>`).join('')}</ul>`
      : '<p class="memCatEmpty">暂无沉淀</p>'
    return `
    <article class="agentMemCard">
      <header class="agentMemHead">
        <span class="agentMemDot"></span>
        <div class="agentMemId"><strong>${esc(a.name)}</strong><span class="knowledgeMuted">${esc(a.role)} · ${esc(a.scope)}</span></div>
      </header>
      <div class="agentMemCats">
        <div class="memCat" data-cat="experiment"><h5>实验</h5>${cat('experiment')}</div>
        <div class="memCat" data-cat="device"><h5>设备</h5>${cat('device')}</div>
        <div class="memCat" data-cat="other"><h5>其他</h5>${cat('other')}</div>
      </div>
    </article>`
  }).join('')
}

/* ============ SOP 优化对话：点击实验回溯卡片的可优化点打开；对话式优化对标的 Skill/SOP ============ */

function openSopDialog(retrospectId, optId) {
  const r = DB.retrospects.find(x => x.retrospectId === retrospectId)
  if (r === undefined) return
  const o = r.optimizations.find(x => x.id === optId) ?? r.optimizations[0]
  state.sopDialog = {
    retrospectId,
    optId: o?.id ?? '',
    chat: [{ role: 'agent', text: `针对可优化点「${o?.point ?? r.title}」：${o?.suggestion ?? ''} 当前对标 ${r.sopRef}（${r.skillName}）。你想怎么改？告诉我具体参数，我直接生成 SOP 修订草案。` }],
    draftLines: [],
    appliedRev: null,
  }
  renderSopDialog()
}

function closeSopDialog() {
  state.sopDialog = null
  renderSopDialog()
}

const sopRetrospect = () => DB.retrospects.find(x => x.retrospectId === state.sopDialog?.retrospectId)

function sopSkill() {
  const r = sopRetrospect()
  if (r === undefined) return undefined
  for (const pid of Object.keys(DB.skills)) {
    const hit = DB.skills[pid].find(s => s.skillId === r.skillId)
    if (hit !== undefined) return hit
  }
  return undefined
}

function renderSopDialog() {
  const root = el('sopDialog')
  if (root === null) return
  const d = state.sopDialog
  root.hidden = d === null
  if (d === null) return
  const r = sopRetrospect()
  const skill = sopSkill()
  const o = r?.optimizations.find(x => x.id === d.optId)
  el('sopDialogTitle').textContent = `优化 SOP · ${r?.skillName ?? ''}`
  el('sopDialogBody').innerHTML = `
    <div class="wizardConfirm">
      <section class="wizardChat">
        <div class="wizardChatList" id="sopChatList">
          ${d.chat.map(m => `<div class="wizardMsg ${m.role === 'agent' ? 'is-agent' : 'is-user'}"><span>${esc(m.text)}</span></div>`).join('')}
        </div>
        <div class="wizardChatInputRow">
          <input id="sopChatInput" placeholder="例如：振荡前预稳定温控 3 min / 末尾回吸 0.5 s" />
          <button class="action primary" data-action="sop-send">发送</button>
        </div>
      </section>
      <section class="wizardParsed">
        <div class="sopSkillCard">
          <h3>${esc(skill?.name ?? r?.skillName ?? 'Skill')}</h3>
          <div class="sopSkillMeta">
            <span>Skill ID <code>${esc(r?.skillId ?? '—')}</code></span>
            <span>修订 <code>${skill ? `v${skill.revision}` : '—'}</code>${d.appliedRev !== null ? ` → <code class="sopDraftRev">v${d.appliedRev} 草稿</code>` : ''}</span>
            <span>定义哈希 <code>${esc(skill?.definitionHash ?? '—')}</code></span>
          </div>
          <p class="wizardHint">${esc(skill?.purpose ?? '')}</p>
        </div>
        ${o === undefined ? '' : `
        <div class="sopOptHint">
          <span class="optSeverity" data-level="${esc(o.severity)}">${esc(SEV_TEXT[o.severity] ?? o.severity)}</span>
          <div><strong>${esc(o.point)}</strong><span class="wizardMuted">${esc(o.suggestion)}</span></div>
        </div>`}
        <div class="sopDraft">
          <h4>SOP 修订草案 <span class="wizardMuted">${esc(r?.sopRef ?? '')}</span></h4>
          ${d.draftLines.length === 0
            ? '<p class="wizardMuted">尚无修订。在左侧对话里描述要改的参数，我会把改动落到这里。</p>'
            : `<ol class="sopDraftList">${d.draftLines.map(line => `<li>${esc(line)}</li>`).join('')}</ol>`}
        </div>
      </section>
    </div>`
  el('sopDialogFoot').innerHTML = `
    <button class="action" data-action="close-sop-dialog">关闭</button>
    <button class="action primary" data-action="sop-apply" ${d.draftLines.length === 0 ? 'disabled' : ''}>${d.appliedRev !== null ? `已生成 v${d.appliedRev} 草稿` : '应用为新修订草稿'}</button>`
  const list = el('sopChatList')
  if (list !== null) list.scrollTop = list.scrollHeight
  const input = el('sopChatInput')
  if (input !== null) input.focus()
}

function sendSopChat() {
  const input = el('sopChatInput')
  const text = (input?.value ?? '').trim()
  if (text === '' || state.sopDialog === null) return
  const d = state.sopDialog
  d.chat.push({ role: 'user', text })
  d.chat.push({ role: 'agent', text: sopAgentReply(text) })
  input.value = ''
  renderSopDialog()
}

function sopAgentReply(text) {
  const d = state.sopDialog
  const push = line => { if (!d.draftLines.includes(line)) d.draftLines.push(line) }
  if (/(温控|温度|预稳定|振荡|频率)/.test(text)) { push('§4.2 前置：破乳前预稳定温控 3 min，振荡频率锁定 800 rpm（25±2°C）。'); return '已加入修订草案：§4.2 增加温控预稳定前置步骤，锁定 800 rpm / 25±2°C。' }
  if (/(回吸|blow|残留|挂壁)/i.test(text)) { push('§4.2 排液末尾增加 0.5 s 反向回吸（blow-out），消除挂壁残留。'); return '已加入修订草案：排液末尾 0.5 s 反向回吸。' }
  if (/(速度|分次|分两次|aspiration|60)/i.test(text)) { push('§4.2 60 µL 档改为中速、分两次 aspiration，降低该档 CV。'); return '已加入修订草案：60 µL 档中速分两次 aspiration。' }
  if (/(离心|压缩|用时|4\s?min|4分钟)/i.test(text)) { push('§4.3 相分离离心 5 min → 4 min，附分层校验（不合格自动回退 5 min）。'); return '已加入修订草案：离心压缩至 4 min，附分层校验与回退。' }
  if (/(孔板|方位|确认|人工)/.test(text)) { push('§4.1 排液前强制人工确认孔板方位（A1 左上），未确认不得进入 §4.2。'); return '已加入修订草案：排液前强制人工确认孔板方位。' }
  return '已记录。可以告诉我具体参数（如「振荡前预稳定温控 3 min」「末尾回吸 0.5 s」「60 µL 档中速分两次」），我会把改动落到右侧 SOP 修订草案。'
}

function applySopRevision() {
  const d = state.sopDialog
  if (d === null || d.draftLines.length === 0) return
  const skill = sopSkill()
  const nextRev = (skill?.revision ?? 0) + 1
  if (skill !== undefined) { skill.revision = nextRev; skill.status = 'DRAFT' }
  d.appliedRev = nextRev
  d.chat.push({ role: 'agent', text: `已生成 SOP 修订草稿 v${nextRev}（含 ${d.draftLines.length} 处改动），状态 DRAFT，待校验与批准后生效。` })
  renderSopDialog()
  renderRetrospect()
}

/* ================= 项目工作台渲染 ================= */

function renderProjectIdentity() {
  const p = project()
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
    page.innerHTML = renderOverviewPage(pid)
  } else if (state.page === 'files') {
    page.innerHTML = renderFiles(pid)
  } else if (state.page === 'knowledge') {
    page.innerHTML = renderKnowledgeRefs(pid)
  } else if (state.page === 'skills') {
    page.innerHTML = renderSkillsPage(pid)
  } else if (state.page === 'outputs') {
    page.innerHTML = renderOutputs(pid)
  } else if (state.page === 'results') {
    page.innerHTML = renderResults(pid)
  } else {
    page.innerHTML = renderFiles(pid)
  }
}

/* ---- 右栏 5 类资源页 ---- */

function renderKnowledgeRefs(pid) {
  const k = DB.knowledge
  return `
  <div class="block">
    <h3>知识来源</h3>
    ${k.imports.map(i => `<div class="pendingAction"><span>${esc(i.sourceName)}</span><span>${esc(STATUS_TEXT[i.status] ?? i.status)}</span></div>`).join('') || '<div class="pendingAction"><span>暂无来源</span><span>—</span></div>'}
  </div>
  <div class="block">
    <h3>引用</h3>
    ${k.citations.map(c => `<div class="pendingAction"><span>${esc(c.sourceName)} · ${esc(c.location)}</span></div><p class="noticeText">${esc(c.excerpt)}</p>`).join('') || '<div class="pendingAction"><span>暂无引用</span><span>—</span></div>'}
  </div>`
}

function renderSkillsPage(pid) {
  const skills = skillsOf(pid)
  return `
  <div class="block">
    <h3>技能</h3>
    ${skills.map(s => `
      <div class="pendingAction"><span>${esc(s.name)} · rev.${s.revision}</span><span>${esc(STATUS_TEXT[s.status] ?? s.status)}</span></div>
      <p class="noticeText">${esc(s.purpose)}</p>`).join('') || '<div class="pendingAction"><span>暂无技能</span><span>—</span></div>'}
  </div>`
}

function renderOutputs(pid) {
  const exps = DB.experiments[pid] ?? []
  const blocks = exps.map(e => {
    const arts = e.sections?.artifact?.items ?? []
    return `
    <div class="block">
      <h3>${esc(e.title)} · 阶段产出</h3>
      ${arts.map(a => `<div class="pendingAction"><span>${esc(a.name)}</span><span>${esc(a.kind)} · ${esc(a.digest ?? a.size ?? '')}</span></div>`).join('') || '<div class="pendingAction"><span>暂无产出</span><span>—</span></div>'}
    </div>`
  }).join('')
  return blocks || '<div class="block"><h3>阶段产出</h3><div class="pendingAction"><span>暂无</span><span>—</span></div></div>'
}

function renderResults(pid) {
  const exps = DB.experiments[pid] ?? []
  const blocks = exps.map(e => {
    const res = e.sections?.result
    if (res === undefined) return ''
    return `
    <div class="block">
      <h3>${esc(e.title)} · 判定 ${esc(res.verdict)}</h3>
      <div class="miniGrid">
        ${res.metrics.map(([k, v]) => `<div class="miniCard"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}
      </div>
    </div>`
  }).join('')
  return blocks || '<div class="block"><h3>重要结果</h3><div class="pendingAction"><span>暂无</span><span>—</span></div></div>'
}

/* ---- chat 顶部单张实验卡片（纯展示，hover 显示详情）与侧栏概要 ---- */

function currentStageIndex(pid) {
  const runs = runsOf(pid)
  if (runs.some(r => r.runStatus === 'COMPLETED')) return 6
  if (runs.some(r => r.runStatus === 'RUNNING' || r.runStatus === 'WAITING_CONFIRMATION')) return 4
  const plan = planOf(pid)
  if (plan !== undefined && plan.status === 'LOCKED') return 3
  return 0
}

function summaryFacts(pid) {
  const stageIndex = currentStageIndex(pid)
  const artifacts = (DB.artifacts[pid] ?? []).map(a => a.displayName)
  const devices = (DB.projectDevices[pid] ?? []).map(id => DB.devices.find(d => d.deviceId === id)?.name ?? id)
  const citations = DB.knowledge.citations.map(c => c.sourceName)
  return { stageIndex, artifacts, devices, citations }
}

/** 选中实验的「具体当前步骤」——仪器准备中 / 加入反应 Mix 中 这类操作级阶段 */
function currentStepInfo(e) {
  const steps = e?.steps ?? []
  if (steps.length === 0) {
    const label = e?.status === 'PENDING' ? '待启动' : (EXPERIMENT_STATUS[e?.status] ?? e?.status ?? '—')
    return { title: label, op: '', param: '', state: '', stepNo: 0, stepTotal: 0, explanation: '', rationale: '', sopRef: '' }
  }
  const allDone = steps.every(x => x.status === 'COMPLETED')
  const running = steps.find(s => s.status === 'RUNNING')
  const idx = Math.max(0, Math.min(e.currentStepIndex ?? 0, steps.length - 1))
  const s = running ?? (allDone ? steps[steps.length - 1] : (steps[idx] ?? steps[0]))
  const field = name => s.fields?.find(f => f[0] === name)?.[1] ?? ''
  return {
    title: allDone ? `${s.title}（已完成）` : s.title,
    op: field('操作说明'), param: field('实时参数'),
    state: allDone ? 'done' : (s.status ?? '').toLowerCase(),
    stepNo: steps.indexOf(s) + 1, stepTotal: steps.length,
    explanation: s.explanation ?? '', rationale: s.rationale ?? '', sopRef: s.sopRef ?? '',
  }
}

function experimentSummaryCard(pid) {
  const p = project()
  const exps = DB.experiments[pid] ?? []
  const e = exps.find(x => x.experimentId === state.selectedExperimentId) ?? exps[0]
  const step = currentStepInfo(e)
  const goal = e?.objective ?? p.description
  const goalSummary = e?.sections?.goal?.summary ?? ''
  const plan = planOf(pid)
  const pending = plan !== undefined && plan.status !== 'LOCKED' ? [{ text: '工作流等待人工确认', level: 'urgent' }] : []
  const todos = [...pending, ...(e?.todos ?? [])]
  const todoTop = todos.slice(0, 3)

  return `
  <article class="expSummaryCard" data-exp-summary>
    <div class="expSummaryMain">
      <div class="expSummaryStage">
        <span class="expSummaryLabel">当前阶段</span>
        <span class="stageNow" data-state="${esc(step.state)}">${esc(step.title)}</span>
        ${step.stepTotal > 0 ? `<span class="stageStep">步骤 ${step.stepNo}/${step.stepTotal}</span>` : ''}
      </div>
      ${step.op ? `<div class="expSummaryOp">${esc(step.op)}</div>` : ''}
      <div class="expSummaryGoal"><span class="expSummaryLabel">目标</span><span class="goalText">${esc(goal)}</span></div>
      <div class="expSummaryTodos"><span class="expSummaryLabel">重要代办</span>
        ${todoTop.length === 0 ? '<span class="todoNone">无待办</span>' : todoTop.map(t => `<span class="todoLine" data-level="${esc(t.level)}">${esc(t.text)}</span>`).join('')}
      </div>
    </div>
    <div class="expSummaryDetail">
      <div class="detailGroup"><h4>目标（完整）</h4><div class="detailLine">${esc(goal)}</div>${goalSummary ? `<div class="detailLine">${esc(goalSummary)}</div>` : ''}</div>
      <div class="detailGroup"><h4>当前步骤</h4>
        <div class="detailLine">${esc(step.title)}${step.stepTotal > 0 ? ` · 步骤 ${step.stepNo}/${step.stepTotal}` : ''}</div>
        ${step.op ? `<div class="detailLine">操作：${esc(step.op)}</div>` : ''}
        ${step.param ? `<div class="detailLine">实时参数：${esc(step.param)}</div>` : ''}
        ${step.explanation ? `<div class="detailLine">说明：${esc(step.explanation)}</div>` : ''}
        ${step.rationale ? `<div class="detailLine">依据：${esc(step.rationale)}</div>` : ''}
        ${step.sopRef ? `<div class="detailLine">SOP：${esc(step.sopRef)}</div>` : ''}
      </div>
      <div class="detailGroup"><h4>重要代办（全部 ${todos.length}）</h4>
        ${todos.length === 0 ? '<div class="detailLine">无待办</div>' : todos.map(t => `<div class="detailLine" data-level="${esc(t.level)}">· ${esc(t.text)}${t.level ? `（${esc(TODO_LEVEL_TEXT[t.level] ?? t.level)}）` : ''}</div>`).join('')}
      </div>
    </div>
  </article>`
}

/** 右栏「概述」资源页：简单进展 / 产物 / 设备 / 引用（状态类信息的正式归属） */
function renderOverviewPage(pid) {
  const { stageIndex, artifacts, devices, citations } = summaryFacts(pid)
  return `
  <div class="block">
    <h3>简单进展</h3>
    <div class="lifecycleRail">${LIFECYCLE_STAGES.map((label, i) => `<div class="stage" data-stage-state="${i < stageIndex ? 'done' : i === stageIndex ? 'current' : ''}">${esc(label)}</div>`).join('')}</div>
  </div>
  <div class="block">
    <h3>产物</h3>
    ${artifacts.map(a => `<div class="pendingAction"><span>${esc(a)}</span></div>`).join('') || '<div class="pendingAction"><span>暂无产物</span><span>—</span></div>'}
  </div>
  <div class="block">
    <h3>设备</h3>
    ${devices.map(d => `<div class="pendingAction"><span>${esc(d)}</span></div>`).join('') || '<div class="pendingAction"><span>暂无设备</span><span>—</span></div>'}
  </div>
  <div class="block">
    <h3>引用</h3>
    ${citations.map(c => `<div class="pendingAction"><span>${esc(c)}</span></div>`).join('') || '<div class="pendingAction"><span>暂无引用</span><span>—</span></div>'}
  </div>`
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
  const pid = state.activeProjectId
  // 生命周期事件不再逐条上屏，统一由顶部单张实验卡片承载
  const messages = state.conversation.map(m => {
    if (m.role === 'user') return `<div class="userRow"><div class="userStack"><div class="userBubble">${esc(m.text)}</div></div></div>`
    if (m.role === 'agent') return `<div class="assistantText">${esc(m.text)}</div>`
    return ''
  }).join('')

  const node = el('conversationList')
  if (node !== null) node.innerHTML = experimentSummaryCard(pid) + messages
}

function pushAgentReply(input) {
  const pid = state.activeProjectId
  const plan = planOf(pid)
  state.conversation.push(
    { role: 'agent', text: `收到：「${input}」。我将按已锁定的工作流 ${plan.planId}（rev.${plan.revision}，${plan.steps.length} 步）推进。` },
    { role: 'lifecycle', kind: 'execution', status: 'RUNNING', fields: [['当前步骤', plan.steps[0].name], ['能力', plan.steps[0].capability]] },
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
  const desired = conversationMode() === 'replace' ? 0 : state.detailsOpen ? Number(f.dataset.detailsWidth ?? 460) : 0
  // 窄视口下给中间会话留最小宽度，避免三栏挤压
  const details = Math.min(desired, Math.max(0, window.innerWidth - sidebar - 360))
  f.style.gridTemplateColumns = `${sidebar}px minmax(0, 1fr) ${details}px`
  if (details === 0) f.setAttribute('data-details-collapsed', '')
  else f.removeAttribute('data-details-collapsed')
  // 列宽/可见性变化后重算输入框高度（启动时宽度为 0 会算出错误的超高值）
  syncComposer()
}

window.addEventListener('resize', () => applyColumns())

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
  renderRetrospect()
  renderDevices()
  renderKnowledge()
  renderProjectIdentity()
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

  // 侧边栏「对话」：切换当前项目下的一轮会话（助手+SaaS）
  const sessionBtn = closest('[data-session]')
  if (sessionBtn !== null) {
    state.activeProjectId = sessionBtn.dataset.project
    state.activeSessionId = sessionBtn.dataset.session
    const s = (DB.sessions[state.activeProjectId] ?? []).find(x => x.sessionId === state.activeSessionId)
    state.conversation = (s?.messages ?? []).map(m => ({ ...m }))
    state.page = 'overview'
    state.selectedRunId = runsOf(state.activeProjectId)[0]?.runId ?? ''
    openAppView('lab-project')
    renderAll()
    scrollConversation()
    return
  }

  // 侧边栏「项目」：切换当前项目，并载入其首个对话
  const projectBtn = closest('[data-project]')
  if (projectBtn !== null && (projectBtn.classList.contains('project') || projectBtn.classList.contains('projectRow'))) {
    state.activeProjectId = projectBtn.dataset.project
    state.page = 'overview'
    state.selectedRunId = runsOf(state.activeProjectId)[0]?.runId ?? ''
    state.selectedExperimentIndex = 0
    const firstSess = (DB.sessions[state.activeProjectId] ?? [])[0]
    state.activeSessionId = firstSess?.sessionId
    state.conversation = (firstSess?.messages ?? []).map(m => ({ ...m }))
    openAppView('lab-project')
    renderAll()
    scrollConversation()
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

  // 实验回溯：点击可优化点 → 打开 SOP 优化对话
  const optimizeSop = closest('[data-optimize-sop]')
  if (optimizeSop !== null) {
    openSopDialog(optimizeSop.dataset.optimizeSop, optimizeSop.dataset.opt)
    return
  }

  // 实验回溯：选择已完成实验卡片进行对比（多选）；全选 / 清空
  const retroPick = closest('[data-retro-pick], [data-retro-pick-all], [data-retro-pick-none]')
  if (retroPick !== null) {
    toggleRetroPick(retroPick)
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
    state.page = 'overview'
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

  // 设备卡 → 弹出设备详情（改绑 Work Agent / 编辑设备 Skill）
  const detailCard = closest('[data-device-detail]')
  if (detailCard !== null) {
    state.deviceDetail = { deviceId: detailCard.dataset.deviceDetail }
    renderDeviceDetail()
    return
  }

  // 设备详情内点击编辑：设备名/端点/固件（Skill 走弹窗编辑器）
  const devEdit = closest('[data-edit-dev]')
  if (devEdit !== null && state.deviceDetail !== null) {
    beginDeviceEdit(devEdit)
    return
  }

  // 设备详情内点击 Skill 行 → 打开 skill.md 编辑器（点行内删除按钮时让位给 data-action）
  const skillRow = closest('[data-edit-skill]')
  if (skillRow !== null && state.deviceDetail !== null && closest('[data-action]') === null) {
    openSkillEditor(state.deviceDetail.deviceId, Number(skillRow.dataset.editSkill))
    return
  }

  // 向导内点击编辑：设备名/端点/功能名/字段值（点击文本 → 原位输入框，Enter/失焦提交，Esc 取消）
  const editSpan = closest('[data-edit-param], [data-edit-meta]')
  if (editSpan !== null && state.deviceWizard !== null) {
    beginWizardEdit(editSpan)
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
    case 'open-settings':
      openSettings()
      return
    case 'close-settings':
      state.settingsOpen = false
      renderSettings()
      return
    case 'set-theme': {
      state.theme = action.dataset.theme
      document.body.toggleAttribute('data-ds-dark-theme', state.theme === 'dark')
      renderSettings()
      return
    }
    case 'set-sidebar': {
      const collapsed = action.dataset.collapse === '1'
      state.sidebarCollapsed = collapsed
      const f = frame()
      f.dataset.sidebarWidth = collapsed ? '0' : '260'
      if (collapsed) f.setAttribute('data-sidebar-collapsed', '')
      else f.removeAttribute('data-sidebar-collapsed')
      applyColumns()
      renderSettings()
      return
    }
    case 'reset-demo':
      location.reload()
      return
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
    case 'new-project':
      createProject(action.dataset.workspace)
      return
    case 'new-session':
      createSession()
      return
    case 'new-device':
      openDeviceWizard()
      return
    case 'close-device-wizard':
      closeDeviceWizard()
      return
    case 'wizard-doc-pick':
      state.deviceWizard.docId = action.dataset.doc
      renderDeviceWizard()
      return
    case 'wizard-upload-doc':
      el('wizardDocFile')?.click()
      return
    case 'wizard-next': {
      const w = state.deviceWizard
      if (w.step === 0) { runWizardParse(); return }
      if (w.step === 4) { finishDeviceWizard(); return }
      w.step += 1
      renderDeviceWizard()
      return
    }
    case 'wizard-prev':
      state.deviceWizard.step = Math.max(0, state.deviceWizard.step - 1)
      renderDeviceWizard()
      return
    case 'wizard-test':
      runWizardTest()
      return
    case 'wizard-toggle-fn': {
      const w = state.deviceWizard
      const fn = action.dataset.fn
      const i = w.agentFns.indexOf(fn)
      if (i >= 0) w.agentFns.splice(i, 1)
      else w.agentFns.push(fn)
      renderDeviceWizard()
      return
    }
    case 'wizard-send':
      sendWizardChat()
      return
    case 'wizard-del-fn': {
      const f = state.deviceWizard.parsed.functions[Number(action.dataset.delFn)]
      f.deleted = !f.deleted
      renderDeviceWizard()
      return
    }
    case 'wizard-add-fn': {
      const fns = state.deviceWizard.parsed.functions
      fns.push({ fn: `manual_fn_${fns.length + 1}`, label: '新功能（点击命名）', params: [['param_1', 'string']], events: [] })
      renderDeviceWizard()
      return
    }
    case 'close-device-detail':
      state.deviceDetail = null
      renderDeviceDetail()
      return
    case 'close-skill-editor':
      state.skillEditor = null
      renderSkillEditor()
      return
    case 'skill-upload-md':
      el('skillMdFile')?.click()
      return
    case 'save-skill': {
      const s = state.skillEditor
      if (s === null) return
      const d = DB.devices.find(x => x.deviceId === s.deviceId)
      if (d === undefined) return
      const name = (el('skillEdName')?.value ?? '').trim() || '未命名 Skill'
      const desc = (el('skillEdDesc')?.value ?? '').trim()
      const md = el('skillEdMd')?.value ?? ''
      if (s.isNew) d.capabilities.push({ name, desc, md })
      else d.capabilities[s.index] = { name, desc, md }
      state.skillEditor = null
      renderSkillEditor()
      renderDeviceDetail()
      renderDevices()
      return
    }
    case 'close-sop-dialog':
      closeSopDialog()
      return
    case 'sop-send':
      sendSopChat()
      return
    case 'sop-apply':
      applySopRevision()
      return
    case 'device-toggle-fn': {
      const d = DB.devices.find(x => x.deviceId === state.deviceDetail?.deviceId)
      if (d !== undefined) {
        const fn = action.dataset.fn
        const i = d.agentFns.indexOf(fn)
        if (i >= 0) d.agentFns.splice(i, 1)
        else d.agentFns.push(fn)
      }
      renderDeviceDetail()
      renderDevices()
      return
    }
    case 'device-add-skill':
      if (state.deviceDetail !== null) openSkillEditor(state.deviceDetail.deviceId, -1, true)
      return
    case 'device-del-skill': {
      const d = DB.devices.find(x => x.deviceId === state.deviceDetail?.deviceId)
      if (d !== undefined) d.capabilities.splice(Number(action.dataset.delSkill), 1)
      renderDeviceDetail()
      renderDevices()
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
      state.page = 'files'
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

  // 知识中心动作：导入参考文档
  const knowledgeAction = closest('[data-action]')
  if (knowledgeAction !== null && knowledgeAction.dataset.action === 'knowledge-import') {
    const input = el('knowledgeFileInput')
    const name = (input?.value ?? '').trim() || 'untitled-reference.pdf'
    const kind = /\.(csv|tsv|json)$/i.test(name) ? 'dataset' : /\.(pdf|docx?)$/i.test(name) ? 'protocol' : 'paper'
    DB.knowledge.refs.push({ refId: `ref-${DB.knowledge.refs.length}`, title: name, kind, source: '手动导入', versionId: 'v1', status: 'READY', cited: 0, excerpt: '（新导入文档，等待解析与引用）' })
    if (input !== null) input.value = ''
    renderKnowledge()
    showKnowledgeNotice(`已导入参考文档：${name}（${REF_KIND_TEXT[kind] ?? kind}）`)
    return
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
  // 尚未布局（宽度为 0）时 scrollHeight 失真（会被封顶到 max-height），跳过，待布局后由 applyColumns 重算
  if (composerInput.clientWidth === 0) return
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

// 向导 / SOP 对话内 chat 输入：Enter 发送 / Shift+Enter 换行 / IME 守卫（与主 composer 同规则）
document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.shiftKey) return
  if (event.isComposing || event.keyCode === 229) return
  const id = event.target?.id
  if (id === 'wizardChatInput') { event.preventDefault(); sendWizardChat() }
  else if (id === 'sopChatInput') { event.preventDefault(); sendSopChat() }
})

// 设备卡 / Skill 行键盘可达：焦点在其上时 Enter/Space 等同点击（打开详情 / 打开 skill.md 编辑器）；行内删除按钮走原生激活
function closestKeyActivatable(node) {
  return node?.closest?.('[data-device-detail], [data-edit-skill]') ?? null
}
document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  if (event.target?.closest?.('[data-action]') != null) return // 焦点在真实按钮上（如删除）：不拦截
  const target = closestKeyActivatable(event.target)
  if (target === null) return
  event.preventDefault()
  target.click()
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
