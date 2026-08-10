import type {
  Device,
  Experiment,
  SopStep,
  TraceItem,
  Gate,
  Library,
  StageEvidence,
  AgentReferenceBasis,
  InputFile,
  Artifact,
  EventLogItem,
} from '@/types/experiment';

// 实验参考影像：真实医学/生物实验图片，避免占位图空置
const IMG = {
  chipDevice: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_e3a18542-fcfa-4dc9-9893-6a2ddbfd073f.jpg',
  labPipette: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_ac11f201-7be9-403d-a702-c54e4b8529dd.jpg',
  cryosection: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_509a57fc-6559-491d-a9e0-85d115f89e15.jpg',
  histology: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_add25e4e-9521-4142-8def-f14ee266f86a.jpg',
  fluorescence: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_19b753ec-20e5-43d2-a926-76d50f0a51a3.jpg',
  nucleiQC: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_a114d483-9239-4552-b78d-2294b66ff061.jpg',
  droplet: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_8328bbb9-c731-435a-b57b-f1c3c386e862.jpg',
  libraryPeak: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_7c28973a-997a-4555-9de0-d5beaaf77810.jpg',
  spatialMap: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_73770f8a-7d5b-494c-bcab-921c9d14fd6c.jpg',
  geneHeatmap: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_e4c421c3-31d7-4407-9443-5cc565a2d54f.jpg',
};

export const devices: Device[] = [
  { id: 'SS-HOLDER-01', name: 'SeekSpace® 芯片夹', type: '空间芯片夹', role: '承载标记区 / 组织贴片', protocol: '器械登记', state: '已登记', status: 'online' },
  { id: 'SEEK-DD-01', name: 'SeekOne® 数字液滴仪', type: '液滴生成设备', role: 'Chip S3 · 油包水生成', protocol: '原生程序 · 空间转录组', state: '已登记', status: 'online' },
  { id: 'SEEK-CH-01', name: 'SeekOne® DD 芯片夹具', type: 'Chip Holder', role: 'Chip S3 / Chip P 装载', protocol: '器械登记', state: '已登记', status: 'online' },
  { id: 'CRYO-01', name: '冷冻切片机', type: '切片设备', role: '10–20 μm 组织切片', protocol: '只读状态采集', state: '已登记', status: 'maintenance' },
  { id: 'FLUO-01', name: '荧光显微镜', type: '成像设备', role: '拼接 · 芯片边缘 + 组织', protocol: '只读状态采集', state: '已登记', status: 'online' },
  { id: 'CENT-01', name: '高速冷冻离心机', type: '离心设备', role: '4°C · 1,000 g · 5 min', protocol: 'Dry-run adapter', state: '已登记', status: 'online' },
  { id: 'COUNT-01', name: '细胞计数设备', type: '样本质检', role: '有核率 / 结团率', protocol: '只读状态采集', state: '已登记', status: 'online' },
  { id: 'PCR-01', name: 'PCR 仪 1 / 2', type: '温控设备', role: '片段化 · RT · 文库扩增', protocol: 'Dry-run adapter', state: '已登记', status: 'online' },
  { id: 'QSEP-01', name: 'Qubit + 核酸片段分析仪', type: '文库质检', role: '浓度 · 片段峰型', protocol: '只读状态采集', state: '已登记', status: 'offline' },
];

export const sopSteps: SopStep[] = [
  {
    code: '01',
    name: '芯片与设备注册',
    short: '注册',
    duration: '~10 min',
    gate: '空间芯片 2 个标记区；Space Holder、SeekOne DD、Chip S3 均完成绑定。',
    evidence: ['记录芯片编号与保存条件', '确认未使用标记区使用 Chip P 占位', '写入设备能力与接口策略'],
    reference: 'SeekSpace 使用说明书 1.5、1.10–1.12',
  },
  {
    code: '02',
    name: '切片与组织贴片',
    short: '贴片',
    duration: '~50 min',
    gate: 'OCT 包埋新鲜冷冻组织；切片 10–20 μm；单个标记区最多 3 张，贴片全程建议 ≤30 min。',
    evidence: ['记录样本来源、包埋与运输状态', '核对组织尺寸与标记区边界', '锁定切片厚度和相邻切片关系'],
    reference: 'SeekSpace 使用说明书 Step 1-2–1-4',
  },
  {
    code: '03',
    name: '组织标记与荧光拍照',
    short: '标记',
    duration: '27 min',
    gate: '固定液浸没全部标记区；N-1 反应按 4°C / 37°C 程序运行；图像须同时覆盖芯片边缘与组织。',
    evidence: ['记录 37°C 烤片和固定时间', '采集 DAPI / ssDNA 拼接图像', '检查组织边界清晰且不过曝'],
    reference: 'SeekSpace 使用说明书 Step 1-5–1-6',
  },
  {
    code: '04',
    name: '提核与核悬液质检',
    short: '提核 QC',
    duration: '~70 min',
    gate: '总细胞核 ≤200,000；单管片段化 1,000–25,000；有核率 >5%；结团率 <30%。',
    evidence: ['记录 1,000 g / 4°C / 5 min 离心', '40 μm 过滤并锁定最终体积', '计数设备上传有核率和结团率'],
    reference: 'SeekSpace 使用说明书 1.13.6、Step 1-7–1-8',
  },
  {
    code: '05',
    name: '片段化与油包水标记',
    short: 'DD 运行',
    duration: '60 min + 4.5 min',
    gate: '片段化 37°C / 60 min；单个油包水反应细胞核 ≤25,000；Chip S3 运行空间转录组程序。',
    evidence: ['锁定 Tn5 片段化反应体积 15 μL', '记录 Chip S3 标签 1 / 2 / 3 加样', '保存 SeekOne DD 运行 ID 与异常状态'],
    reference: 'SeekSpace 使用说明书 Step 2–3',
  },
  {
    code: '06',
    name: 'cDNA / 空间 / ATAC 建库',
    short: '建库',
    duration: '~13.5 h',
    gate: '按 Step 4–9 依次完成解交联、RT、预扩增、cDNA、空间标签与 ATAC 文库，并在节点留存产物。',
    evidence: ['记录每个停止点与冻存条件', '绑定磁珠纯化比例和 PCR 循环数', '四类文库分别进入 QC 门'],
    reference: 'SeekSpace 使用说明书 Step 4–9',
  },
  {
    code: '07',
    name: 'FASTQ 到空间结果',
    short: '数据',
    duration: '计算阶段',
    gate: 'Expression FASTQ、Spatial FASTQ、HDMI FASTQ、Slide Image、gtf、genomeDir 齐全后进入 SeekSpace Tools。',
    evidence: ['校验输入文件和 sample sheet', '计算 barcode / 细胞识别 / 空间定位', '输出 matrix、zarr、html、image 等产物'],
    reference: 'SeekSpace 使用说明书 附录 2–3',
  },
];

export const traceItems: TraceItem[] = [
  { title: 'Goal parser', detail: '解析：空间 ATAC + 转录组一次实验', status: 'done' },
  { title: 'SOP retriever', detail: '载入 v20260717 · 63 个规则节点', status: 'done' },
  { title: 'Device matcher', detail: '匹配 9 个已登记设备 · 0 个缺口', status: 'done' },
  { title: 'QC gate', detail: '核悬液 + 四类文库门槛', status: 'done' },
  { title: 'Vision gate', detail: '影像输入 → 多模态视觉模型 → SOP 规则门', status: 'done' },
  { title: 'Artifact linker', detail: '等待数据产物加载', status: 'pending' },
];

export const gates: Gate[] = [
  { name: '设备注册', value: '9 / 9 devices bound', detail: '设备能力与接口策略已记录', status: 'PASS' },
  { name: '样本入场', value: 'RIN 8.2 · 14 μm', detail: 'OCT 包埋样本符合入场门槛', status: 'PASS' },
  { name: '核悬液 QC', value: '82% nuclei rate', detail: '182,000 总量 · 16% 结团率', status: 'PASS' },
  { name: '数据契约', value: '6 / 6 inputs mapped', detail: 'FASTQ、图像和参考文件已定义', status: 'PASS' },
];

export const libraries: Library[] = [
  { name: 'cDNA 产物', value: '1.32 ng/μL', peak: '主峰 520 bp', rule: '≥1 ng/μL · 200–2,500 bp', status: 'PASS', marker: 'cDNA', bars: [54, 70, 44, 34, 26] },
  { name: '表达文库', value: '8.6 ng/μL', peak: '主峰 612 bp', rule: '≥5 ng/μL · 300–1,000 bp', status: 'PASS', marker: 'RNA', bars: [82, 65, 72, 55, 43] },
  { name: '空间标签文库', value: '2.4 ng/μL', peak: '主峰 272 bp', rule: '≥1 ng/μL · 220–330 bp', status: 'PASS', marker: 'SPATIAL', bars: [66, 90, 74, 48, 31] },
  { name: 'ATAC 文库', value: '4.1 ng/μL', peak: '主峰 410 bp', rule: '200–1,000 bp · 建议 <600 bp', status: 'PASS', marker: 'ATAC', bars: [72, 58, 86, 62, 51] },
];

export const stageEvidence: StageEvidence[] = [
  {
    code: '01', title: '芯片与设备注册', short: '注册',
    configTitle: '设备 / 芯片身份识别', configRule: '识别设备主体、Chip Holder 和运行程序入口，再与注册表规则匹配。',
    gate: '设备 ID、芯片夹与程序入口匹配。',
    processLabel: '设备与芯片注册', processCaption: '识别 SeekOne DD 设备主体、托盘和可用上机入口。',
    processImage: IMG.chipDevice, processSource: 'SeekOne DD p.14',
    resultLabel: '设备状态识别', resultCaption: '设备、夹具和程序入口均可回链到设备注册表。',
    resultImage: IMG.labPipette, resultSource: 'SeekOne DD p.14',
    checks: [{ object: 'dd_device', detail: 'SeekOne DD 设备主体', confidence: 0.99 }, { object: 'chip_holder', detail: '芯片夹 / 托盘状态', confidence: 0.97 }, { object: 'run_entry', detail: '空间转录组程序入口', confidence: 0.96 }],
    processMarkers: [{ label: '设备主体', status: 'PASS', confidence: 0.99, left: '15%', top: '15%', width: '70%', height: '70%' }],
    resultMarkers: [{ label: '程序入口', status: 'PASS', confidence: 0.96, left: '14%', top: '13%', width: '72%', height: '70%' }],
  },
  {
    code: '02', title: '切片与组织贴片', short: '贴片',
    configTitle: '组织边界 / 贴片覆盖识别', configRule: '识别组织是否进入标记区，检查切片平整度和边界完整性。',
    gate: 'OCT 包埋组织；切片 10–20 μm；贴片完成后进入标记。',
    processLabel: '切片与组织贴片', processCaption: '识别切片台、组织块和贴片操作区域。',
    processImage: IMG.cryosection, processSource: 'SeekSpace p.26',
    resultLabel: '贴片覆盖识别', resultCaption: '组织边界清晰，未见明显脱落或超出标记区的阻断异常。',
    resultImage: IMG.histology, resultSource: 'SeekSpace p.26',
    checks: [{ object: 'tissue_section', detail: '组织切片主体', confidence: 0.96 }, { object: 'tissue_boundary', detail: '组织边界完整性', confidence: 0.94 }, { object: 'chip_region', detail: '标记区覆盖关系', confidence: 0.92 }],
    processMarkers: [{ label: '组织切片', status: 'PASS', confidence: 0.96, left: '38%', top: '22%', width: '50%', height: '55%' }],
    resultMarkers: [{ label: '组织边界', status: 'PASS', confidence: 0.94, left: '34%', top: '20%', width: '55%', height: '58%' }],
  },
  {
    code: '03', title: '组织标记与荧光拍照', short: '成像',
    configTitle: '荧光图像 / 组织边界识别', configRule: '识别 DAPI / ssDNA 图像中的组织主体、标记区和边界清晰度。',
    gate: '图像需覆盖芯片边缘与组织，避免过曝和长时间照射。',
    processLabel: '荧光拍照', processCaption: '识别显微镜载台、芯片夹和成像位置。',
    processImage: IMG.fluorescence, processSource: 'SeekSpace p.31',
    resultLabel: 'DAPI 组织图像', resultCaption: '组织主体和边界被识别，图像可进入空间定位与分割流程。',
    resultImage: IMG.fluorescence, resultSource: 'SeekSpace p.31',
    checks: [{ object: 'spatial_chip', detail: '芯片边缘 / 标记区', confidence: 0.98 }, { object: 'tissue_boundary', detail: 'DAPI 组织边界', confidence: 0.95 }, { object: 'image_quality', detail: '清晰度 / 过曝检查', confidence: 0.93 }],
    processMarkers: [{ label: '成像载台', status: 'PASS', confidence: 0.98, left: '19%', top: '18%', width: '64%', height: '62%' }],
    resultMarkers: [{ label: '组织主体', status: 'PASS', confidence: 0.95, left: '8%', top: '10%', width: '83%', height: '78%' }, { label: '边界清晰', status: 'PASS', confidence: 0.93, left: '18%', top: '19%', width: '63%', height: '60%' }],
  },
  {
    code: '04', title: '提核与核悬液质检', short: '提核 QC',
    configTitle: '核悬液 / 计数结果识别', configRule: '识别计数设备、计数视野和核悬液状态，再校验有核率与结团率门槛。',
    gate: '总核数 ≤200,000；有核率 >5%；结团率 <30%。',
    processLabel: '细胞核计数', processCaption: '识别细胞计数设备与上样位置，绑定样本核悬液 QC。',
    processImage: IMG.nucleiQC, processSource: 'SeekSpace p.35',
    resultLabel: '核悬液 QC 结果', resultCaption: '识别计数区域，并将 82% 有核率、16% 结团率回写规则门。',
    resultImage: IMG.nucleiQC, resultSource: 'SeekSpace p.35',
    checks: [{ object: 'counter_device', detail: '细胞计数设备', confidence: 0.99 }, { object: 'nuclei_field', detail: '计数视野 / 核悬液', confidence: 0.92 }, { object: 'qc_gate', detail: '有核率 82% · 结团率 16%', confidence: 0.95 }],
    processMarkers: [{ label: '计数设备', status: 'PASS', confidence: 0.99, left: '10%', top: '14%', width: '80%', height: '68%' }],
    resultMarkers: [{ label: '计数区域', status: 'PASS', confidence: 0.92, left: '42%', top: '35%', width: '38%', height: '38%' }, { label: '82% nuclei', status: 'PASS', confidence: 0.95, left: '12%', top: '11%', width: '35%', height: '16%' }],
  },
  {
    code: '05', title: '片段化与油包水标记', short: 'DD 运行',
    configTitle: 'Chip S3 / 液滴运行识别', configRule: '识别加样位置、芯片孔位和 DD 运行状态，检查是否进入空间转录组程序。',
    gate: '片段化单管 1,000–25,000；单个油包水反应 ≤25,000。',
    processLabel: 'Chip S3 加样', processCaption: '识别芯片孔位、移液器和加样区域，作为 DD 运行前置证据。',
    processImage: IMG.droplet, processSource: 'SeekSpace p.41',
    resultLabel: 'DD 运行状态', resultCaption: 'Chip Holder 与空间转录组程序状态通过，结果回链到运行 ID。',
    resultImage: IMG.droplet, resultSource: 'SeekOne DD p.14',
    checks: [{ object: 'chip_wells', detail: 'Chip S3 孔位 / 加样区域', confidence: 0.97 }, { object: 'chip_holder', detail: '夹具闭合与水平状态', confidence: 0.95 }, { object: 'droplet_run', detail: '空间转录组运行入口', confidence: 0.94 }],
    processMarkers: [{ label: '加样孔位', status: 'PASS', confidence: 0.97, left: '28%', top: '28%', width: '55%', height: '54%' }],
    resultMarkers: [{ label: '空间程序', status: 'PASS', confidence: 0.94, left: '16%', top: '19%', width: '68%', height: '59%' }],
  },
  {
    code: '06', title: 'cDNA / 空间 / ATAC 建库', short: '建库',
    configTitle: '文库峰型 / 主峰范围识别', configRule: '识别文库峰图、主峰位置和异常峰，再与说明书浓度与片段范围比较。',
    gate: 'cDNA、表达、空间标签和 ATAC 文库分别进入质量门。',
    processLabel: '建库产物', processCaption: '以已绑定的 DD 运行结果作为建库产物来源。',
    processImage: IMG.droplet, processSource: 'SeekOne DD p.14',
    resultLabel: '文库峰图 QC', resultCaption: '识别主峰 174–437 bp 区间及整体峰型，进入文库放行。',
    resultImage: IMG.libraryPeak, resultSource: 'SeekOne DD p.20',
    checks: [{ object: 'library_trace', detail: '峰图主体 / 低噪声', confidence: 0.97 }, { object: 'main_peak', detail: '主峰范围与峰位', confidence: 0.94 }, { object: 'library_rule', detail: '浓度 / 片段范围校验', confidence: 0.92 }],
    processMarkers: [{ label: '建库来源', status: 'PASS', confidence: 0.97, left: '14%', top: '18%', width: '71%', height: '62%' }],
    resultMarkers: [{ label: '主峰范围', status: 'PASS', confidence: 0.94, left: '28%', top: '15%', width: '43%', height: '69%' }, { label: '峰型通过', status: 'PASS', confidence: 0.92, left: '57%', top: '5%', width: '28%', height: '18%' }],
  },
  {
    code: '07', title: 'FASTQ 到空间结果', short: '数据',
    configTitle: '空间定位 / 结果图像识别', configRule: '识别组织区域与空间信号，再校验 FASTQ、图像、参考文件和结果产物是否完整。',
    gate: 'Expression、Spatial、HDMI、Slide Image、gtf、genomeDir 齐全。',
    processLabel: '空间结果输入', processCaption: 'DAPI 图像作为空间定位与组织分割的原始输入。',
    processImage: IMG.spatialMap, processSource: 'SeekSpace p.31',
    resultLabel: '空间定位结果', resultCaption: '组织边界、空间区域和下游矩阵产物完成关联。',
    resultImage: IMG.geneHeatmap, resultSource: 'SeekSpace p.31',
    checks: [{ object: 'tissue_segmentation', detail: '组织分割结果', confidence: 0.95 }, { object: 'spatial_localization', detail: '空间标签定位', confidence: 0.93 }, { object: 'data_contract', detail: '6 / 6 输入与产物回链', confidence: 0.98 }],
    processMarkers: [{ label: '原始图像', status: 'PASS', confidence: 0.95, left: '8%', top: '10%', width: '83%', height: '78%' }],
    resultMarkers: [{ label: '空间区域', status: 'PASS', confidence: 0.93, left: '18%', top: '18%', width: '62%', height: '59%' }, { label: '结果已回链', status: 'PASS', confidence: 0.98, left: '64%', top: '7%', width: '26%', height: '16%' }],
  },
];

// 视觉结果复核启用的步骤索引（0-based）
const visualReviewStages = new Set([2, 5, 6]);
stageEvidence.forEach((stage, index) => {
  stage.resultReview = visualReviewStages.has(index);
});

export const agentReferenceBasis: AgentReferenceBasis[] = [
  { label: '设备 / 芯片身份', value: '确认设备主体、Chip Holder、程序入口与注册表 / 运行 ID 一致；设备图片本身不作为实验结果。', source: 'SeekSpace 1.10–1.12' },
  { label: '贴片条件', value: '确认 OCT 包埋新鲜冷冻组织、切片厚度 10–20 μm、组织进入标记区且贴片过程受控。', source: 'SeekSpace Step 1-2–1-4' },
  { label: '图像可用性', value: '确认 DAPI / ssDNA 图像覆盖芯片边缘与组织，组织边界可识别、无明显过曝，可作为 Slide Image 输入。', source: 'SeekSpace Step 1-5–1-6 / 附录 3' },
  { label: '核悬液门槛', value: '确认标记区总核数 ≤200,000、单管片段化 1,000–25,000、有核率 >5%、结团率 <30%。', source: 'SeekSpace Step 1-7–1-8 / Step 2' },
  { label: 'DD 运行条件', value: '确认 Chip S3 加样、Chip Holder 状态、空间转录组程序和运行 ID；单个油包水反应细胞核 ≤25,000。', source: 'SeekSpace Step 2–3' },
  { label: '文库质量门', value: 'cDNA ≥1 ng/μL、200–2,500 bp；表达 ≥5 ng/μL、300–1,000 bp；空间 ≥1 ng/μL、220–330 bp；ATAC 200–1,000 bp，建议 <600 bp。', source: 'SeekSpace Step 7–9' },
  { label: '数据契约', value: '确认 Expression / Spatial / HDMI FASTQ、Slide Image、gtf、genomeDir 齐全，并能回链 matrix、zarr、html、image 产物。', source: 'SeekSpace 附录 2–3' },
];

export const inputFiles: InputFile[] = [
  { name: 'Expression FASTQ', file: 'expression.clean_R1/R2.fastq.gz', status: 'required' },
  { name: 'Spatial FASTQ', file: 'spatial.clean_R1/R2.fastq.gz', status: 'required' },
  { name: 'HDMI FASTQ', file: 'hdmi.clean_R1/R2.fastq.gz', status: 'required' },
  { name: 'Slide Image', file: 'tissue_DAPI.tiff · tissue_HE.tiff', status: 'required' },
  { name: 'Reference', file: 'human.gtf · genomeDir/', status: 'required' },
  { name: 'Sample sheet', file: 'SS-20260810-01.sample.csv', status: 'linked' },
];

export const artifacts: Artifact[] = [
  { name: 'aligned.bam', detail: '空间 / 转录组比对结果', type: 'BAM' },
  { name: 'filtered_feature_bc_matrix', detail: '细胞表达矩阵', type: 'MATRIX' },
  { name: 'spatial_clusters.zarr', detail: '空间聚类与定位', type: 'ZARR' },
  { name: 'qc_report.html', detail: '可审计质控报告', type: 'HTML' },
  { name: '_DAPI.png · _HE_TIMG.png', detail: '图像与组织分割结果', type: 'IMAGE' },
  { name: 'vision_review.json', detail: 'PDF 原图、视觉识别与规则门结论', type: 'VISION' },
];

export const eventLog: EventLogItem[] = [
  { time: '14:32:08', event: 'RUN_CREATED', detail: '创建实验 SS-20260810-01', actor: 'system' },
  { time: '14:32:15', event: 'DEVICE_BOUND', detail: '9 个设备能力卡写入注册表', actor: 'registry' },
  { time: '14:32:29', event: 'SAMPLE_ACCEPTED', detail: 'Tissue_A · 样本门槛 PASS', actor: 'sample' },
  { time: '14:33:04', event: 'SOP_DRY_RUN', detail: 'SeekOne DD 空间转录组程序已模拟运行', actor: 'runner' },
  { time: '14:33:32', event: 'QC_COMPUTED', detail: 'cDNA / RNA / Spatial / ATAC 四类文库 PASS', actor: 'qc' },
  { time: '14:34:10', event: 'DATA_LINKED', detail: '6 个输入文件与 6 类产物建立关联', actor: 'data' },
  { time: '14:34:22', event: 'VISION_REVIEW', detail: '4 / 4 关键对象识别 · SOP 规则门 PASS', actor: 'vision-gate' },
];

export const spatialMapValues = [
  0, 1, 1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 1, 2, 3, 3, 3, 2, 1, 0, 0, 0, 1, 2, 2, 3, 3, 2, 1, 0, 0, 0, 1, 1, 2, 3, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 1, 1, 2, 1, 0, 0, 0, 0, 0,
];

export const expressionGenes: [string, number][] = [
  ['EPCAM', 86],
  ['VIM', 72],
  ['MKI67', 61],
  ['COL1A1', 48],
  ['GAPDH', 92],
];

// 信号条关键约束
export const signalItems = [
  { number: '01', title: '空间芯片', detail: '2 个标记区域 · 5.5 × 15 mm' },
  { number: '02', title: '核悬液', detail: '1,000–25,000 / 管 · 结团率 < 30%' },
  { number: '03', title: '油包水', detail: '单个反应细胞核 ≤ 25,000' },
  { number: '04', title: '分析输入', detail: 'Expression · Spatial · HDMI · TIFF' },
];

const defaultSample = { nuclei: 182000, rate: 82, aggregation: 16, perReaction: 23500 };

export const mockExperiments: Experiment[] = [
  {
    id: 'SS-20260810-01', name: '肝脏空间 ATAC 实验', status: 'RUNNING', sampleType: '新鲜冷冻肝脏组织', target: '空间转录组 · 2 区',
    progress: 57, sopStage: 3, sopCompleted: false, dataLoaded: false, evidenceCount: 9,
    visionStatus: 'PASS', visionConfidence: 0.93, createdAt: '2026-08-10 14:32', sample: defaultSample,
  },
  {
    id: 'SS-20260809-02', name: '小鼠大脑皮层图谱', status: 'COMPLETE', sampleType: '小鼠大脑皮层', target: '空间转录组 · 4 区',
    progress: 100, sopStage: 6, sopCompleted: true, dataLoaded: true, evidenceCount: 10,
    visionStatus: 'PASS', visionConfidence: 0.96, createdAt: '2026-08-09 09:15', sample: defaultSample,
  },
  {
    id: 'SS-20260808-03', name: '结直肠癌组织测序', status: 'READY', sampleType: 'FFPE 结直肠癌组织', target: '空间 ATAC · 2 区',
    progress: 0, sopStage: -1, sopCompleted: false, dataLoaded: false, evidenceCount: 4,
    visionStatus: 'PASS', visionConfidence: 0.93, createdAt: '2026-08-08 16:40', sample: defaultSample,
  },
  {
    id: 'SS-20260807-04', name: '胚胎心脏发育研究', status: 'RUNNING', sampleType: '小鼠胚胎心脏', target: '空间转录组 · 3 区',
    progress: 28, sopStage: 1, sopCompleted: false, dataLoaded: false, evidenceCount: 6,
    visionStatus: 'PASS', visionConfidence: 0.93, createdAt: '2026-08-07 11:20', sample: defaultSample,
  },
  {
    id: 'SS-20260805-05', name: '肾脏切片质控分析', status: 'ARCHIVED', sampleType: '新鲜冷冻肾脏组织', target: '空间转录组 · 2 区',
    progress: 100, sopStage: 6, sopCompleted: true, dataLoaded: true, evidenceCount: 10,
    visionStatus: 'PASS', visionConfidence: 0.95, createdAt: '2026-08-05 08:05', sample: defaultSample,
  },
  {
    id: 'SS-20260803-06', name: '肺腺癌活检空间图谱', status: 'COMPLETE', sampleType: '肺腺癌活检组织', target: '空间 ATAC · 2 区',
    progress: 100, sopStage: 6, sopCompleted: true, dataLoaded: true, evidenceCount: 10,
    visionStatus: 'PASS', visionConfidence: 0.94, createdAt: '2026-08-03 13:50', sample: defaultSample,
  },
];

const traceTitles = [
  { title: 'Goal Parser', detail: '解析实验目标与文档门槛' },
  { title: 'SOP Retriever', detail: '检索 SeekSpace 使用说明书' },
  { title: 'Device Matcher', detail: '匹配已注册设备能力' },
  { title: 'QC Gate', detail: '核悬液 QC 门槛校验' },
  { title: 'Vision Gate', detail: '多模态视觉结果复核' },
  { title: 'Artifact Linker', detail: '产物与来源文件链接' },
];

export function deriveTraceItems(exp: Experiment): TraceItem[] {
  const doneCount = exp.sopCompleted ? 6 : Math.max(0, exp.sopStage + 1);
  return traceTitles.map((t, i) => ({
    title: t.title,
    detail: t.detail,
    status: i < doneCount ? 'done' : i === doneCount ? 'active' : 'pending',
  }));
}

export function traceScore(exp: Experiment): number {
  return Math.min(99, 80 + exp.evidenceCount + (exp.dataLoaded ? 5 : 0) + (exp.sopCompleted ? 8 : 0));
}

export function deriveLibraryQC(exp: Experiment): { name: string; value: number }[] {
  const base = exp.sample.rate;
  return [
    { name: 'cDNA 文库', value: Math.round(base * 0.28 + (exp.dataLoaded ? 2 : 0) + 1) },
    { name: '表达文库', value: Math.round(base * 0.32 + (exp.dataLoaded ? 3 : 0)) },
    { name: '空间标签文库', value: Math.round(base * 0.24 + (exp.dataLoaded ? 2 : 0)) },
    { name: 'ATAC 文库', value: Math.round(base * 0.2 + (exp.dataLoaded ? 1 : 0)) },
  ];
}