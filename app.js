const demoState = {
  currentView: "overview",
  sopStage: -1,
  sopCompleted: false,
  sopTimer: null,
  dataLoaded: false,
  visionStatus: "PASS",
  visionConfidence: 0.93,
  visionRun: 1,
  registeredDevices: 9,
  evidenceCount: 8,
  sample: {
    nuclei: 182000,
    rate: 82,
    aggregation: 16,
    perReaction: 23500,
  },
};

const devices = [
  { id: "SS-HOLDER-01", name: "SeekSpace® 芯片夹", type: "空间芯片夹", role: "承载标记区 / 组织贴片", protocol: "器械登记", state: "已登记" },
  { id: "SEEK-DD-01", name: "SeekOne® 数字液滴仪", type: "液滴生成设备", role: "Chip S3 · 油包水生成", protocol: "原生程序 · 空间转录组", state: "已登记" },
  { id: "SEEK-CH-01", name: "SeekOne® DD 芯片夹具", type: "Chip Holder", role: "Chip S3 / Chip P 装载", protocol: "器械登记", state: "已登记" },
  { id: "CRYO-01", name: "冷冻切片机", type: "切片设备", role: "10–20 μm 组织切片", protocol: "只读状态采集", state: "已登记" },
  { id: "FLUO-01", name: "荧光显微镜", type: "成像设备", role: "拼接 · 芯片边缘 + 组织", protocol: "只读状态采集", state: "已登记" },
  { id: "CENT-01", name: "高速冷冻离心机", type: "离心设备", role: "4°C · 1,000 g · 5 min", protocol: "Dry-run adapter", state: "已登记" },
  { id: "COUNT-01", name: "细胞计数设备", type: "样本质检", role: "有核率 / 结团率", protocol: "只读状态采集", state: "已登记" },
  { id: "PCR-01", name: "PCR 仪 1 / 2", type: "温控设备", role: "片段化 · RT · 文库扩增", protocol: "Dry-run adapter", state: "已登记" },
  { id: "QSEP-01", name: "Qubit + 核酸片段分析仪", type: "文库质检", role: "浓度 · 片段峰型", protocol: "只读状态采集", state: "已登记" },
];

const sopSteps = [
  {
    code: "01",
    name: "芯片与设备注册",
    short: "注册",
    duration: "~10 min",
    gate: "空间芯片 2 个标记区；Space Holder、SeekOne DD、Chip S3 均完成绑定。",
    evidence: ["记录芯片编号与保存条件", "确认未使用标记区使用 Chip P 占位", "写入设备能力与接口策略"],
    reference: "SeekSpace 使用说明书 1.5、1.10–1.12",
  },
  {
    code: "02",
    name: "切片与组织贴片",
    short: "贴片",
    duration: "~50 min",
    gate: "OCT 包埋新鲜冷冻组织；切片 10–20 μm；单个标记区最多 3 张，贴片全程建议 ≤30 min。",
    evidence: ["记录样本来源、包埋与运输状态", "核对组织尺寸与标记区边界", "锁定切片厚度和相邻切片关系"],
    reference: "SeekSpace 使用说明书 Step 1-2–1-4",
  },
  {
    code: "03",
    name: "组织标记与荧光拍照",
    short: "标记",
    duration: "27 min",
    gate: "固定液浸没全部标记区；N-1 反应按 4°C / 37°C 程序运行；图像须同时覆盖芯片边缘与组织。",
    evidence: ["记录 37°C 烤片和固定时间", "采集 DAPI / ssDNA 拼接图像", "检查组织边界清晰且不过曝"],
    reference: "SeekSpace 使用说明书 Step 1-5–1-6",
  },
  {
    code: "04",
    name: "提核与核悬液质检",
    short: "提核 QC",
    duration: "~70 min",
    gate: "总细胞核 ≤200,000；单管片段化 1,000–25,000；有核率 >5%；结团率 <30%。",
    evidence: ["记录 1,000 g / 4°C / 5 min 离心", "40 μm 过滤并锁定最终体积", "计数设备上传有核率和结团率"],
    reference: "SeekSpace 使用说明书 1.13.6、Step 1-7–1-8",
  },
  {
    code: "05",
    name: "片段化与油包水标记",
    short: "DD 运行",
    duration: "60 min + 4.5 min",
    gate: "片段化 37°C / 60 min；单个油包水反应细胞核 ≤25,000；Chip S3 运行空间转录组程序。",
    evidence: ["锁定 Tn5 片段化反应体积 15 μL", "记录 Chip S3 标签 1 / 2 / 3 加样", "保存 SeekOne DD 运行 ID 与异常状态"],
    reference: "SeekSpace 使用说明书 Step 2–3",
  },
  {
    code: "06",
    name: "cDNA / 空间 / ATAC 建库",
    short: "建库",
    duration: "~13.5 h",
    gate: "按 Step 4–9 依次完成解交联、RT、预扩增、cDNA、空间标签与 ATAC 文库，并在节点留存产物。",
    evidence: ["记录每个停止点与冻存条件", "绑定磁珠纯化比例和 PCR 循环数", "四类文库分别进入 QC 门"],
    reference: "SeekSpace 使用说明书 Step 4–9",
  },
  {
    code: "07",
    name: "FASTQ 到空间结果",
    short: "数据",
    duration: "计算阶段",
    gate: "Expression FASTQ、Spatial FASTQ、HDMI FASTQ、Slide Image、gtf、genomeDir 齐全后进入 SeekSpace Tools。",
    evidence: ["校验输入文件和 sample sheet", "计算 barcode / 细胞识别 / 空间定位", "输出 matrix、zarr、html、image 等产物"],
    reference: "SeekSpace 使用说明书 附录 2–3",
  },
];

const traceItems = [
  ["Goal parser", "解析：空间 ATAC + 转录组一次实验", "done"],
  ["SOP retriever", "载入 v20260717 · 63 个规则节点", "done"],
  ["Device matcher", "匹配 9 个已登记设备 · 0 个缺口", "done"],
  ["QC gate", "核悬液 + 四类文库门槛", "done"],
  ["Vision gate", "影像输入 → 多模态视觉模型 → SOP 规则门", "done"],
  ["Artifact linker", "等待数据产物加载", "pending"],
];

const gates = [
  ["设备注册", "9 / 9 devices bound", "设备能力与接口策略已记录"],
  ["样本入场", "RIN 8.2 · 14 μm", "OCT 包埋样本符合入场门槛"],
  ["核悬液 QC", "82% nuclei rate", "182,000 总量 · 16% 结团率"],
  ["数据契约", "6 / 6 inputs mapped", "FASTQ、图像和参考文件已定义"],
];

const libraries = [
  { name: "cDNA 产物", value: "1.32 ng/μL", peak: "主峰 520 bp", rule: "≥1 ng/μL · 200–2,500 bp", status: "PASS", marker: "cDNA" },
  { name: "表达文库", value: "8.6 ng/μL", peak: "主峰 612 bp", rule: "≥5 ng/μL · 300–1,000 bp", status: "PASS", marker: "RNA" },
  { name: "空间标签文库", value: "2.4 ng/μL", peak: "主峰 272 bp", rule: "≥1 ng/μL · 220–330 bp", status: "PASS", marker: "SPATIAL" },
  { name: "ATAC 文库", value: "4.1 ng/μL", peak: "主峰 410 bp", rule: "200–1,000 bp · 建议 <600 bp", status: "PASS", marker: "ATAC" },
];

const stageEvidence = [
  {
    code: "01", title: "芯片与设备注册", short: "注册", configTitle: "设备 / 芯片身份识别", configRule: "识别设备主体、Chip Holder 和运行程序入口，再与注册表规则匹配。", gate: "设备 ID、芯片夹与程序入口匹配。", processLabel: "设备与芯片注册", processCaption: "识别 SeekOne DD 设备主体、托盘和可用上机入口。", processImage: "./assets/pdf/pdf_seekone_dd_instrument.jpg", processSource: "SeekOne DD p.14", resultLabel: "设备状态识别", resultCaption: "设备、夹具和程序入口均可回链到设备注册表。", resultImage: "./assets/pdf/pdf_seekone_dd_run_screen.jpg", resultSource: "SeekOne DD p.14", checks: [{ object: "dd_device", detail: "SeekOne DD 设备主体", confidence: 0.99 }, { object: "chip_holder", detail: "芯片夹 / 托盘状态", confidence: 0.97 }, { object: "run_entry", detail: "空间转录组程序入口", confidence: 0.96 }], processMarkers: [{ label: "设备主体", status: "PASS", confidence: 0.99, left: "15%", top: "15%", width: "70%", height: "70%" }], resultMarkers: [{ label: "程序入口", status: "PASS", confidence: 0.96, left: "14%", top: "13%", width: "72%", height: "70%" }],
  },
  {
    code: "02", title: "切片与组织贴片", short: "贴片", configTitle: "组织边界 / 贴片覆盖识别", configRule: "识别组织是否进入标记区，检查切片平整度和边界完整性。", gate: "OCT 包埋组织；切片 10–20 μm；贴片完成后进入标记。", processLabel: "切片与组织贴片", processCaption: "识别切片台、组织块和贴片操作区域。", processImage: "./assets/pdf/pdf_seekspace_tissue_mount.jpg", processSource: "SeekSpace p.26", resultLabel: "贴片覆盖识别", resultCaption: "组织边界清晰，未见明显脱落或超出标记区的阻断异常。", resultImage: "./assets/pdf/pdf_seekspace_tissue_mount.jpg", resultSource: "SeekSpace p.26", checks: [{ object: "tissue_section", detail: "组织切片主体", confidence: 0.96 }, { object: "tissue_boundary", detail: "组织边界完整性", confidence: 0.94 }, { object: "chip_region", detail: "标记区覆盖关系", confidence: 0.92 }], processMarkers: [{ label: "组织切片", status: "PASS", confidence: 0.96, left: "38%", top: "22%", width: "50%", height: "55%" }], resultMarkers: [{ label: "组织边界", status: "PASS", confidence: 0.94, left: "34%", top: "20%", width: "55%", height: "58%" }],
  },
  {
    code: "03", title: "组织标记与荧光拍照", short: "成像", configTitle: "荧光图像 / 组织边界识别", configRule: "识别 DAPI / ssDNA 图像中的组织主体、标记区和边界清晰度。", gate: "图像需覆盖芯片边缘与组织，避免过曝和长时间照射。", processLabel: "荧光拍照", processCaption: "识别显微镜载台、芯片夹和成像位置。", processImage: "./assets/pdf/pdf_seekspace_fluorescence_setup.jpg", processSource: "SeekSpace p.31", resultLabel: "DAPI 组织图像", resultCaption: "组织主体和边界被识别，图像可进入空间定位与分割流程。", resultImage: "./assets/pdf/pdf_seekspace_dapi_result.jpg", resultSource: "SeekSpace p.31", checks: [{ object: "spatial_chip", detail: "芯片边缘 / 标记区", confidence: 0.98 }, { object: "tissue_boundary", detail: "DAPI 组织边界", confidence: 0.95 }, { object: "image_quality", detail: "清晰度 / 过曝检查", confidence: 0.93 }], processMarkers: [{ label: "成像载台", status: "PASS", confidence: 0.98, left: "19%", top: "18%", width: "64%", height: "62%" }], resultMarkers: [{ label: "组织主体", status: "PASS", confidence: 0.95, left: "8%", top: "10%", width: "83%", height: "78%" }, { label: "边界清晰", status: "PASS", confidence: 0.93, left: "18%", top: "19%", width: "63%", height: "60%" }],
  },
  {
    code: "04", title: "提核与核悬液质检", short: "提核 QC", configTitle: "核悬液 / 计数结果识别", configRule: "识别计数设备、计数视野和核悬液状态，再校验有核率与结团率门槛。", gate: "总核数 ≤200,000；有核率 >5%；结团率 <30%。", processLabel: "细胞核计数", processCaption: "识别细胞计数设备与上样位置，绑定样本核悬液 QC。", processImage: "./assets/pdf/pdf_seekspace_nuclei_counter.jpg", processSource: "SeekSpace p.35", resultLabel: "核悬液 QC 结果", resultCaption: "识别计数区域，并将 82% 有核率、16% 结团率回写规则门。", resultImage: "./assets/pdf/pdf_seekspace_nuclei_counter.jpg", resultSource: "SeekSpace p.35", checks: [{ object: "counter_device", detail: "细胞计数设备", confidence: 0.99 }, { object: "nuclei_field", detail: "计数视野 / 核悬液", confidence: 0.92 }, { object: "qc_gate", detail: "有核率 82% · 结团率 16%", confidence: 0.95 }], processMarkers: [{ label: "计数设备", status: "PASS", confidence: 0.99, left: "10%", top: "14%", width: "80%", height: "68%" }], resultMarkers: [{ label: "计数区域", status: "PASS", confidence: 0.92, left: "42%", top: "35%", width: "38%", height: "38%" }, { label: "82% nuclei", status: "PASS", confidence: 0.95, left: "12%", top: "11%", width: "35%", height: "16%" }],
  },
  {
    code: "05", title: "片段化与油包水标记", short: "DD 运行", configTitle: "Chip S3 / 液滴运行识别", configRule: "识别加样位置、芯片孔位和 DD 运行状态，检查是否进入空间转录组程序。", gate: "片段化单管 1,000–25,000；单个油包水反应 ≤25,000。", processLabel: "Chip S3 加样", processCaption: "识别芯片孔位、移液器和加样区域，作为 DD 运行前置证据。", processImage: "./assets/pdf/pdf_seekspace_dd_chip_loading.jpg", processSource: "SeekSpace p.41", resultLabel: "DD 运行状态", resultCaption: "Chip Holder 与空间转录组程序状态通过，结果回链到运行 ID。", resultImage: "./assets/pdf/pdf_seekone_dd_run_screen.jpg", resultSource: "SeekOne DD p.14", checks: [{ object: "chip_wells", detail: "Chip S3 孔位 / 加样区域", confidence: 0.97 }, { object: "chip_holder", detail: "夹具闭合与水平状态", confidence: 0.95 }, { object: "droplet_run", detail: "空间转录组运行入口", confidence: 0.94 }], processMarkers: [{ label: "加样孔位", status: "PASS", confidence: 0.97, left: "28%", top: "28%", width: "55%", height: "54%" }], resultMarkers: [{ label: "空间程序", status: "PASS", confidence: 0.94, left: "16%", top: "19%", width: "68%", height: "59%" }],
  },
  {
    code: "06", title: "cDNA / 空间 / ATAC 建库", short: "建库", configTitle: "文库峰型 / 主峰范围识别", configRule: "识别文库峰图、主峰位置和异常峰，再与说明书浓度与片段范围比较。", gate: "cDNA、表达、空间标签和 ATAC 文库分别进入质量门。", processLabel: "建库产物", processCaption: "以已绑定的 DD 运行结果作为建库产物来源。", processImage: "./assets/pdf/pdf_seekone_dd_run_screen.jpg", processSource: "SeekOne DD p.14", resultLabel: "文库峰图 QC", resultCaption: "识别主峰 174–437 bp 区间及整体峰型，进入文库放行。", resultImage: "./assets/pdf/pdf_seekone_library_qc.png", resultSource: "SeekOne DD p.20", checks: [{ object: "library_trace", detail: "峰图主体 / 低噪声", confidence: 0.97 }, { object: "main_peak", detail: "主峰范围与峰位", confidence: 0.94 }, { object: "library_rule", detail: "浓度 / 片段范围校验", confidence: 0.92 }], processMarkers: [{ label: "建库来源", status: "PASS", confidence: 0.97, left: "14%", top: "18%", width: "71%", height: "62%" }], resultMarkers: [{ label: "主峰范围", status: "PASS", confidence: 0.94, left: "28%", top: "15%", width: "43%", height: "69%" }, { label: "峰型通过", status: "PASS", confidence: 0.92, left: "57%", top: "5%", width: "28%", height: "18%" }],
  },
  {
    code: "07", title: "FASTQ 到空间结果", short: "数据", configTitle: "空间定位 / 结果图像识别", configRule: "识别组织区域与空间信号，再校验 FASTQ、图像、参考文件和结果产物是否完整。", gate: "Expression、Spatial、HDMI、Slide Image、gtf、genomeDir 齐全。", processLabel: "空间结果输入", processCaption: "DAPI 图像作为空间定位与组织分割的原始输入。", processImage: "./assets/pdf/pdf_seekspace_dapi_result.jpg", processSource: "SeekSpace p.31", resultLabel: "空间定位结果", resultCaption: "组织边界、空间区域和下游矩阵产物完成关联。", resultImage: "./assets/pdf/pdf_seekspace_dapi_result.jpg", resultSource: "SeekSpace p.31", checks: [{ object: "tissue_segmentation", detail: "组织分割结果", confidence: 0.95 }, { object: "spatial_localization", detail: "空间标签定位", confidence: 0.93 }, { object: "data_contract", detail: "6 / 6 输入与产物回链", confidence: 0.98 }], processMarkers: [{ label: "原始图像", status: "PASS", confidence: 0.95, left: "8%", top: "10%", width: "83%", height: "78%" }], resultMarkers: [{ label: "空间区域", status: "PASS", confidence: 0.93, left: "18%", top: "18%", width: "62%", height: "59%" }, { label: "结果已回链", status: "PASS", confidence: 0.98, left: "64%", top: "7%", width: "26%", height: "16%" }],
  },
];

const visualReviewStages = new Set([2, 5, 6]);
stageEvidence.forEach((stage, index) => { stage.resultReview = visualReviewStages.has(index); });

const agentReferenceBasis = [
  { label: "设备 / 芯片身份", value: "确认设备主体、Chip Holder、程序入口与注册表 / 运行 ID 一致；设备图片本身不作为实验结果。", source: "SeekSpace 1.10–1.12" },
  { label: "贴片条件", value: "确认 OCT 包埋新鲜冷冻组织、切片厚度 10–20 μm、组织进入标记区且贴片过程受控。", source: "SeekSpace Step 1-2–1-4" },
  { label: "图像可用性", value: "确认 DAPI / ssDNA 图像覆盖芯片边缘与组织，组织边界可识别、无明显过曝，可作为 Slide Image 输入。", source: "SeekSpace Step 1-5–1-6 / 附录 3" },
  { label: "核悬液门槛", value: "确认标记区总核数 ≤200,000、单管片段化 1,000–25,000、有核率 >5%、结团率 <30%。", source: "SeekSpace Step 1-7–1-8 / Step 2" },
  { label: "DD 运行条件", value: "确认 Chip S3 加样、Chip Holder 状态、空间转录组程序和运行 ID；单个油包水反应细胞核 ≤25,000。", source: "SeekSpace Step 2–3" },
  { label: "文库质量门", value: "cDNA ≥1 ng/μL、200–2,500 bp；表达 ≥5 ng/μL、300–1,000 bp；空间 ≥1 ng/μL、220–330 bp；ATAC 200–1,000 bp，建议 <600 bp。", source: "SeekSpace Step 7–9" },
  { label: "数据契约", value: "确认 Expression / Spatial / HDMI FASTQ、Slide Image、gtf、genomeDir 齐全，并能回链 matrix、zarr、html、image 产物。", source: "SeekSpace 附录 2–3" },
];

const inputFiles = [
  ["Expression FASTQ", "expression.clean_R1/R2.fastq.gz", "required"],
  ["Spatial FASTQ", "spatial.clean_R1/R2.fastq.gz", "required"],
  ["HDMI FASTQ", "hdmi.clean_R1/R2.fastq.gz", "required"],
  ["Slide Image", "tissue_DAPI.tiff · tissue_HE.tiff", "required"],
  ["Reference", "human.gtf · genomeDir/", "required"],
  ["Sample sheet", "SS-20260810-01.sample.csv", "linked"],
];

const artifacts = [
  ["aligned.bam", "空间 / 转录组比对结果", "BAM"],
  ["filtered_feature_bc_matrix", "细胞表达矩阵", "MATRIX"],
  ["spatial_clusters.zarr", "空间聚类与定位", "ZARR"],
  ["qc_report.html", "可审计质控报告", "HTML"],
  ["_DAPI.png · _HE_TIMG.png", "图像与组织分割结果", "IMAGE"],
  ["vision_review.json", "PDF 原图、视觉识别与规则门结论", "VISION"],
];

const eventLog = [
  ["14:32:08", "RUN_CREATED", "创建实验 SS-20260810-01", "system"],
  ["14:32:15", "DEVICE_BOUND", "9 个设备能力卡写入注册表", "registry"],
  ["14:32:29", "SAMPLE_ACCEPTED", "Tissue_A · 样本门槛 PASS", "sample"],
  ["14:33:04", "SOP_DRY_RUN", "SeekOne DD 空间转录组程序已模拟运行", "runner"],
  ["14:33:32", "QC_COMPUTED", "cDNA / RNA / Spatial / ATAC 四类文库 PASS", "qc"],
  ["14:34:10", "DATA_LINKED", "6 个输入文件与 6 类产物建立关联", "data"],
  ["14:34:22", "VISION_REVIEW", "4 / 4 关键对象识别 · SOP 规则门 PASS", "vision-gate"],
];

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function showToast(message, tone = "default") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function switchView(viewName) {
  demoState.currentView = viewName;
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  $$("[data-view-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === viewName));
  if (viewName === "data") renderDataView();
  if (viewName === "audit") renderAuditView();
}

function renderRunMap() {
  const map = $("#runMap");
  map.innerHTML = sopSteps.map((step, index) => {
    const state = index < demoState.sopStage || (demoState.sopCompleted && index === demoState.sopStage) ? "complete" : index === demoState.sopStage ? "active" : "pending";
    return `<button class="map-step ${state}" data-step-index="${index}" type="button"><span class="map-step-number">${step.code}</span><span><strong>${step.short}</strong><small>${step.duration}</small></span><i>${state === "complete" ? "✓" : state === "active" ? "●" : "·"}</i></button>${index < sopSteps.length - 1 ? `<span class="map-connector ${index < demoState.sopStage ? "complete" : ""}"></span>` : ""}`;
  }).join("");
  $$("[data-step-index]", map).forEach((button) => button.addEventListener("click", () => {
    renderSopStage(Number(button.dataset.stepIndex));
    switchView("sop");
  }));
}

function renderTrace() {
  $("#traceList").innerHTML = traceItems.map(([label, detail, state], index) => `<div class="trace-item ${state}"><span class="trace-index">${String(index + 1).padStart(2, "0")}</span><div><strong>${label}</strong><small>${detail}</small></div><i>${state === "done" ? "✓" : "·"}</i></div>`).join("");
}

function renderGates() {
  $("#gateList").innerHTML = gates.map(([title, value, detail]) => `<div class="gate-row"><span class="gate-check">✓</span><div><strong>${title}</strong><small>${detail}</small></div><span class="gate-value">${value}</span></div>`).join("");
}

function renderDeviceGrid() {
  $("#deviceGrid").innerHTML = devices.map((device, index) => `<div class="device-card"><div class="device-card-top"><span class="device-type-index">${String(index + 1).padStart(2, "0")}</span><span class="device-status"><i></i>${device.state}</span></div><h4>${escapeHtml(device.name)}</h4><p>${escapeHtml(device.role)}</p><div class="device-card-foot"><span>${escapeHtml(device.id)}</span><b>${escapeHtml(device.protocol)}</b></div></div>`).join("");
  $("#registeredCount").textContent = String(devices.length).padStart(2, "0");
  $("#readyCount").textContent = String(devices.filter((device) => device.state === "已登记").length).padStart(2, "0");
}

function renderSampleChecklist() {
  const { nuclei, rate, aggregation, perReaction } = demoState.sample;
  const checks = [
    ["组织来源", "OCT 包埋新鲜冷冻组织", true, "适用样本类型"],
    ["RNA 预检", "RIN 8.2", true, "建议 RIN / RQN ≥ 7"],
    ["标记区总核数", `${nuclei.toLocaleString()} / 200,000`, nuclei <= 200000, "单个标记区上限"],
    ["单管片段化", `${perReaction.toLocaleString()} / 25,000`, perReaction >= 1000 && perReaction <= 25000, "单管投入范围"],
    ["有核率", `${rate}% / > 5%`, rate > 5, "影响捕获细胞数与基因数"],
    ["结团率", `${aggregation}% / < 30%`, aggregation < 30, "超过门槛需过滤后合并"],
  ];
  $("#sampleChecklist").innerHTML = checks.map(([name, value, pass, rule]) => `<div class="check-row"><span class="check-state ${pass ? "pass" : "fail"}">${pass ? "✓" : "!"}</span><div><strong>${name}</strong><small>${rule}</small></div><b class="${pass ? "pass-text" : "fail-text"}">${value}</b></div>`).join("");
  const pass = checks.every((item) => item[2]);
  $("#sampleGateBadge").textContent = pass ? "PASS" : "HOLD";
  $("#sampleGateBadge").className = pass ? "pass-text" : "fail-text";
  $("#nucleiCount").textContent = nuclei.toLocaleString();
  $("#nucleiRate").textContent = rate;
  $("#perReaction").textContent = perReaction.toLocaleString();
  $("#aggregation").textContent = `${aggregation}%`;
  $(".gauge-bar span").style.width = `${Math.min((nuclei / 200000) * 100, 100)}%`;
  $("#gateSummary").textContent = pass ? "4 / 4 PASS" : "3 / 4 HOLD";
  $("#gateSummary").className = pass ? "pass-text" : "fail-text";
}

function renderSopTimeline() {
  $("#sopTimeline").innerHTML = sopSteps.map((step, index) => {
    const state = index < demoState.sopStage || (demoState.sopCompleted && index === demoState.sopStage) ? "complete" : index === demoState.sopStage ? "active" : "pending";
    return `<button class="sop-step ${state}" type="button" data-sop-index="${index}"><span class="sop-step-icon">${state === "complete" ? "✓" : step.code}</span><div><strong>${step.name}</strong><small>${step.reference}</small></div><b>${state === "complete" ? "DONE" : state === "active" ? "RUNNING" : step.duration}</b></button>`;
  }).join("");
  $("#sopProgressText").textContent = `${demoState.sopCompleted ? sopSteps.length : Math.max(demoState.sopStage, 0)} / ${sopSteps.length}`;
  $$("[data-sop-index]").forEach((button) => button.addEventListener("click", () => renderSopStage(Number(button.dataset.sopIndex))));
}

function renderSopStage(index) {
  if (index < sopSteps.length - 1) demoState.sopCompleted = false;
  demoState.sopStage = Math.max(-1, Math.min(index, sopSteps.length - 1));
  const evidenceIndex = demoState.sopStage < 0 ? 0 : demoState.sopStage;
  renderEvidence(evidenceIndex);
  renderVisionGate(evidenceIndex);
  renderRunMap();
  renderSopTimeline();
  if (demoState.sopStage < 0) {
    $("#sopDetailTitle").textContent = "等待启动";
    $("#sopDetailState").textContent = "PENDING";
    $("#sopDetailState").className = "pending-text";
    $("#sopDetailCode").textContent = "Step 0";
    $("#sopDetailDuration").textContent = "—";
    $("#sopDetailGate").textContent = "选择左侧任意步骤查看对应的设备、样本和数据约束。";
    $("#sopDetailEvidence").innerHTML = "";
    return;
  }
  const step = sopSteps[demoState.sopStage];
  const running = demoState.sopTimer !== null && demoState.sopStage < sopSteps.length - 1;
  $("#sopDetailTitle").textContent = step.name;
  $("#sopDetailState").textContent = running ? "RUNNING" : demoState.sopCompleted ? "COMPLETED" : "READY";
  $("#sopDetailState").className = running ? "active-text" : demoState.sopCompleted ? "pass-text" : "pending-text";
  $("#sopDetailCode").textContent = `Step ${step.code}`;
  $("#sopDetailDuration").textContent = step.duration;
  $("#sopDetailGate").textContent = step.gate;
  $("#sopDetailEvidence").innerHTML = step.evidence.map((item) => `<li>${item}</li>`).join("");
  $("#sopDetailReference").textContent = `Reference: ${step.reference}`;
}

function renderEvidence(index = 0) {
  const evidence = stageEvidence[Math.max(0, Math.min(index, stageEvidence.length - 1))];
  const markerHtml = (marker) => {
    const style = [`left:${marker.left}`, `top:${marker.top}`, marker.width ? `width:${marker.width}` : "", marker.height ? `height:${marker.height}` : ""].filter(Boolean).join(";");
    return `<span class="evidence-marker ${marker.kind === "line" ? "line-marker" : "box-marker"} ${marker.status.toLowerCase()}" style="${style}"><b>${marker.label}</b><small>${marker.status} · ${Math.round(marker.confidence * 100)}%</small></span>`;
  };
  $("#evidenceStageName").textContent = `${evidence.code} · ${evidence.title}`;
  $("#evidenceStageCount").textContent = `STEP ${evidence.code} / ${String(stageEvidence.length).padStart(2, "0")}`;
  $("#evidenceProcessImage").src = evidence.processImage;
  $("#evidenceProcessImage").alt = `${evidence.title}过程影像`;
  $("#evidenceProcessSource").textContent = evidence.processSource;
  $("#evidenceProcessLabel").textContent = evidence.processLabel;
  $("#evidenceProcessCaption").textContent = evidence.processCaption;
  $("#evidenceResultImage").src = evidence.resultImage;
  $("#evidenceResultImage").alt = `${evidence.title}结果影像`;
  $("#evidenceResultSource").textContent = evidence.resultSource;
  $("#evidenceResultLabel").textContent = evidence.resultLabel;
  $("#evidenceResultCaption").textContent = evidence.resultCaption;
  $("#evidenceResultMarkers").innerHTML = evidence.resultMarkers.map(markerHtml).join("");
  $("#evidenceStepCode").textContent = evidence.code;
  $("#evidenceGateLabel").textContent = `过程影像 · ${evidence.processLabel}`;
  $("#evidenceGateRule").textContent = `${evidence.processSource} · 仅作为 SOP 操作参照，不参与结果放行。`;
  $("#evidenceGateStatus").textContent = "LINKED";
  $("#evidenceGateStatus").className = "doc-tag";
  $("#evidenceThumbs").innerHTML = stageEvidence.map((item, itemIndex) => `<button class="evidence-thumb ${itemIndex === index ? "active" : ""}" data-evidence-index="${itemIndex}" type="button"><img src="${item.processImage}" alt=""><span><b>${item.code}</b>${item.short}</span><small>${itemIndex === index ? "当前步骤" : item.processSource}</small></button>`).join("");
  $$('[data-evidence-index]').forEach((button) => button.addEventListener("click", () => renderSopStage(Number(button.dataset.evidenceIndex))));
}

function renderVisionGate(stageIndex = 0) {
  const evidence = stageEvidence[Math.max(0, Math.min(stageIndex, stageEvidence.length - 1))];
  const panel = $(".vision-gate-panel");
  const enabled = evidence.resultReview;
  panel.classList.toggle("is-hidden", !enabled);
  panel.setAttribute("aria-hidden", String(!enabled));
  traceItems[4][1] = enabled ? `${evidence.title} · 结果图像进入视觉模型与规则门` : `${evidence.title} · 本步骤无视觉结果校验，已跳过`;
  traceItems[4][2] = "done";
  renderTrace();
  if (!enabled) return;
  const status = demoState.visionStatus;
  const statusNode = $("#visionStatus");
  statusNode.textContent = status;
  statusNode.className = status === "PASS" ? "pass-text" : status === "ANALYZING" ? "active-text" : "fail-text";
  $("#visionConfidence").textContent = `${Math.round(demoState.visionConfidence * 100)}%`;
  $("#visionConfigTitle").textContent = evidence.configTitle;
  $("#visionConfigRule").textContent = evidence.configRule;
  $("#agentBasisLabel").textContent = `当前步骤：${evidence.title} · 对应依据高亮`;
  $("#agentReferenceList").innerHTML = agentReferenceBasis.map((basis, basisIndex) => `<div class="agent-reference-row ${basisIndex === stageIndex ? "current" : ""}"><b>${basisIndex === stageIndex ? "✓" : String(basisIndex + 1).padStart(2, "0")}</b><div><strong>${basis.label}</strong><small>${basis.value}</small></div><span>${basis.source}</span></div>`).join("");
  $("#visionChecks").innerHTML = evidence.checks.map((check) => `<div class="vision-check-row"><span class="vision-check-icon">${status === "PASS" ? "✓" : "·"}</span><div><strong>${check.object}</strong><small>${check.detail}</small></div><span class="vision-check-confidence">${Math.round(check.confidence * 100)}%</span><b class="${status === "PASS" ? "pass-text" : "pending-text"}">${status === "PASS" ? "PASS" : "WAIT"}</b></div>`).join("");
}

function renderFileList() {
  $("#fileList").innerHTML = inputFiles.map(([name, file, status]) => `<div class="file-row"><span class="file-icon">${status === "required" ? "↗" : "↳"}</span><div><strong>${name}</strong><small>${file}</small></div><span class="file-state ${demoState.dataLoaded ? "linked" : "waiting"}">${demoState.dataLoaded ? "LINKED" : "WAITING"}</span></div>`).join("");
}

function renderLibraryGrid() {
  $("#libraryGrid").innerHTML = libraries.map((library, index) => `<div class="library-card"><div class="library-card-top"><span class="library-marker marker-${library.marker.toLowerCase()}">${library.marker}</span><span class="library-status">${demoState.dataLoaded ? library.status : "WAITING"}</span></div><h4>${library.name}</h4><strong>${library.value}</strong><span>${library.peak}</span><small>${library.rule}</small><div class="library-bars"><i style="height:${[54, 82, 66, 72][index]}%"></i><i style="height:${[70, 65, 90, 58][index]}%"></i><i style="height:${[44, 72, 74, 86][index]}%"></i><i style="height:${[34, 55, 48, 62][index]}%"></i><i style="height:${[26, 43, 31, 51][index]}%"></i></div></div>`).join("");
}

function renderSpatialMap() {
  const values = [0, 1, 1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 1, 2, 3, 3, 3, 2, 1, 0, 0, 0, 1, 2, 2, 3, 3, 2, 1, 0, 0, 0, 1, 1, 2, 3, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 1, 1, 2, 1, 0, 0, 0, 0, 0];
  $("#spatialMap").innerHTML = values.map((value, index) => `<span class="spot spot-${value}" style="--delay:${index * 9}ms"></span>`).join("");
}

function renderExpressionChart() {
  const genes = [["EPCAM", 86], ["VIM", 72], ["MKI67", 61], ["COL1A1", 48], ["GAPDH", 92]];
  $("#expressionChart").innerHTML = genes.map(([gene, value]) => `<div class="bar-row"><span>${gene}</span><div><i style="width:${value}%"></i></div><b>${value}</b></div>`).join("");
}

function renderDataView() {
  renderFileList();
  renderLibraryGrid();
  renderSpatialMap();
  renderExpressionChart();
  const banner = $("#dataStatusBanner");
  banner.classList.toggle("ready", demoState.dataLoaded);
  $("#dataStatusTitle").textContent = demoState.dataLoaded ? "数据已载入，QC 计算完成" : "数据尚未载入";
  $("#dataStatusText").textContent = demoState.dataLoaded ? "6 个输入文件已映射到 SeekSpace Tools，四类文库均通过 QC 门槛，PDF 原图与视觉复核结果已回链。" : "加载后将展示 FASTQ / 图像输入、四类文库 QC 和空间定位预览。";
  $("#dataStatusRight").textContent = demoState.dataLoaded ? "READY" : "WAITING";
  $("#dataMode").textContent = demoState.dataLoaded ? "已计算 · 文档字段映射" : "文档字段映射";
}

function renderAuditView() {
  $("#artifactList").innerHTML = artifacts.map(([name, detail, type]) => `<div class="artifact-row"><span class="artifact-type">${type}</span><div><strong>${name}</strong><small>${detail}</small></div><span class="artifact-linked">${demoState.dataLoaded ? "LINKED" : "PENDING"}</span></div>`).join("");
  $("#eventTable").innerHTML = eventLog.map(([time, event, detail, actor]) => `<div class="event-row"><time>${time}</time><span class="event-code">${event}</span><div><strong>${detail}</strong><small>actor: ${actor} · hash: SS-${time.replace(/:/g, "")}</small></div><span class="event-check">✓</span></div>`).join("");
}

function updateEvidence(count = 8) {
  demoState.evidenceCount = count;
  $("#evidenceCount").textContent = String(count).padStart(2, "0");
  $("#evidenceProgress").style.width = `${Math.min((count / 10) * 100, 100)}%`;
}

function runSopSequence() {
  window.clearInterval(demoState.sopTimer);
  demoState.sopTimer = null;
  demoState.sopStage = -1;
  demoState.sopCompleted = false;
  renderSopStage(0);
  switchView("sop");
  $("#runState").textContent = "RUNNING";
  $("#headerStatus").textContent = "SOP dry-run 进行中";
  $("#headerTime").textContent = "设备调用已锁定 · 仅生成执行证据";
  let stage = 0;
  demoState.sopTimer = window.setInterval(() => {
    stage += 1;
    renderSopStage(stage);
    updateEvidence(Math.min(8 + stage, 10));
    if (stage >= sopSteps.length - 1) {
      window.clearInterval(demoState.sopTimer);
      demoState.sopTimer = null;
      demoState.sopCompleted = true;
      renderSopStage(sopSteps.length - 1);
      $("#runState").textContent = "COMPLETE";
      $("#headerStatus").textContent = "SOP dry-run 已完成";
      $("#headerTime").textContent = "可进入数据质控与报告";
      traceItems[5][1] = "数据产物已关联，等待 QC 结果";
      traceItems[5][2] = "done";
      renderTrace();
      showToast("SOP dry-run 完成：设备、样本和执行证据已串联", "success");
    }
  }, 620);
}

function loadDemoData() {
  const button = $("#loadData");
  button.disabled = true;
  button.textContent = "计算中…";
  window.setTimeout(() => {
    demoState.dataLoaded = true;
    button.disabled = false;
    button.textContent = "重新加载数据";
    renderDataView();
    traceItems[5][1] = "6 个输入文件已链接，QC 产物可追溯";
    traceItems[5][2] = "done";
    renderTrace();
    updateEvidence(10);
    $("#runState").textContent = "COMPLETE";
    showToast("数据已加载：四类文库 QC 均为 PASS", "success");
  }, 780);
}

function rerunVisionReview() {
  const button = $("#rerunVision");
  const stageIndex = demoState.sopStage < 0 ? 0 : demoState.sopStage;
  if (!stageEvidence[stageIndex].resultReview) {
    showToast("当前步骤无视觉结果校验，已按 SOP 跳过", "default");
    return;
  }
  button.disabled = true;
  button.textContent = "分析中…";
  demoState.visionStatus = "ANALYZING";
  renderEvidence(stageIndex);
  renderVisionGate(stageIndex);
  traceItems[4][1] = `${stageEvidence[stageIndex].title}影像已送入多模态视觉模型`;
  traceItems[4][2] = "active";
  renderTrace();
  window.setTimeout(() => {
    demoState.visionStatus = "PASS";
    demoState.visionRun += 1;
    demoState.visionConfidence = 0.93;
    button.disabled = false;
    button.textContent = "重新分析影像 →";
    renderEvidence(stageIndex);
    renderVisionGate(stageIndex);
    traceItems[4][1] = `${stageEvidence[stageIndex].title} · 识别与规则门 PASS`;
    traceItems[4][2] = "done";
    renderTrace();
    updateEvidence(10);
    showToast("视觉模型完成影像复核：关键对象与 SOP 规则均通过", "success");
  }, 920);
}

function validateSample() {
  renderSampleChecklist();
  const pass = demoState.sample.nuclei <= 200000 && demoState.sample.rate > 5 && demoState.sample.aggregation < 30;
  showToast(pass ? "样本门槛通过，可以放行 Step 2" : "样本被拦截：请先调整核悬液 QC", pass ? "success" : "warning");
}

function exportReport() {
  const activeEvidence = stageEvidence[demoState.sopStage < 0 ? 0 : demoState.sopStage];
  const report = {
    run_id: "SS-20260810-01",
    purpose: "科研用途",
    source_documents: ["SeekSpace 使用说明书-20260717", "SeekOne DD 使用说明书-20250117", "CG000632 FFPE Sample Prep"],
    devices_registered: devices.length,
    sample: demoState.sample,
    sop_stage: demoState.sopStage + 1,
    data_loaded: demoState.dataLoaded,
    vision_review: {
      enabled: activeEvidence.resultReview,
      status: activeEvidence.resultReview ? demoState.visionStatus : "NOT_APPLICABLE",
      confidence: activeEvidence.resultReview ? demoState.visionConfidence : null,
      model: "Multimodal Vision Adapter",
      stage: activeEvidence.title,
      process_image: activeEvidence.processSource,
      result_image: activeEvidence.resultReview ? activeEvidence.resultSource : null,
      checks: activeEvidence.resultReview ? activeEvidence.checks.map(({ object, detail, confidence }) => ({ object, detail, confidence, status: "PASS" })) : [],
    },
    stage_vision_reviews: stageEvidence.map((evidence) => ({ stage: evidence.code, title: evidence.title, process_image: evidence.processSource, result_image: evidence.resultReview ? evidence.resultSource : null, review_enabled: evidence.resultReview, gate: evidence.resultReview ? "PASS" : "NOT_APPLICABLE" })),
    agent_reference_basis: agentReferenceBasis,
    source_images: [
      "SeekSpace 使用说明书 p.26–27 / p.31 / p.35",
      "SeekOne DD 使用说明书 p.14 / p.20",
    ],
    library_qc: libraries.map(({ name, value, peak, status }) => ({ name, value, peak, status })),
    artifacts: artifacts.map(([name, detail, type]) => ({ name, detail, type })),
    generated_at: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "seekspace-report.json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("实验报告已生成（JSON）", "success");
}

function registerDevice(event) {
  event.preventDefault();
  const name = $("#deviceName").value.trim();
  const type = $("#deviceType").value;
  const id = $("#deviceSerial").value.trim() || `LAB-DEMO-${devices.length + 1}`;
  const protocol = $("#deviceProtocol").value;
  if (!name || !id) return;
  devices.push({ id, name, type, role: "用户注册设备 · 待补充能力", protocol, state: "已登记" });
  demoState.registeredDevices = devices.length;
  traceItems[2][1] = `匹配 ${devices.length} 个已登记设备 · 0 个缺口`;
  renderDeviceGrid();
  $("#deviceForm").reset();
  $("#registerFormPanel").classList.add("submitted");
  showToast(`${name} 已加入设备注册表`, "success");
  updateEvidence(Math.min(demoState.evidenceCount + 1, 10));
}

function bindRange(id, outputId, suffix, key, formatter = (value) => value) {
  const input = $(id);
  input.addEventListener("input", () => {
    const value = Number(input.value);
    demoState.sample[key] = value;
    $(outputId).textContent = `${formatter(value)}${suffix}`;
  });
}

function init() {
  renderRunMap();
  renderTrace();
  renderGates();
  renderDeviceGrid();
  renderSampleChecklist();
  renderSopStage(-1);
  renderVisionGate();
  renderDataView();
  renderAuditView();
  updateEvidence();

  $$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  $("#runDemo").addEventListener("click", runSopSequence);
  $("#startDemo").addEventListener("click", runSopSequence);
  $("#jumpData").addEventListener("click", () => switchView("data"));
  $("#runSop").addEventListener("click", runSopSequence);
  $("#rerunVision").addEventListener("click", rerunVisionReview);
  $("#loadData").addEventListener("click", loadDemoData);
  $("#validateSample").addEventListener("click", validateSample);
  $("#deviceForm").addEventListener("submit", registerDevice);
  $("#toggleRegister").addEventListener("click", () => $("#registerFormPanel").scrollIntoView({ behavior: "smooth", block: "center" }));
  $("#exportReport").addEventListener("click", exportReport);
  bindRange("#nucleiSlider", "#nucleiOutput", "", "nuclei", (value) => value.toLocaleString());
  bindRange("#rateSlider", "#rateOutput", "%", "rate");
  bindRange("#aggregationSlider", "#aggregationOutput", "%", "aggregation");
}

init();
