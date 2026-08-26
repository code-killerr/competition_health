## Context

`lab-knowledge-local` 已经拥有不可变原始资料、SQLite/FTS5、可选 Embedding Adapter、引用、冲突和人工确认模型，也定义了 `DocumentParser` 接口。当前 PDF 输入在没有外部配置 Parser 时明确失败；仓库中的 `docs/change_plan/pdf_knowledge/` 已有可用于开发验证的 PDF 资料，但现有测试 Parser 只生成固定的第一页夹具，不是生产解析器。

本变更负责完整的知识资料路径：PDF、CSV、TSV 和文本文件录入，同一 Knowledge Provider 中的解析/索引/召回，以及“从 PDF 引用生成 SOP 草案 → 人工补全/确认 → 发布为可用于规划的知识”的可追溯流程。CSV 继续作为便于填写和回归测试的输入格式，不与 PDF 建立强制的实体关系；鼠脑空间转录组仍是使用这些知识生成实验计划的真实业务输入，而不是解析器内置数据。

## Goals / Non-Goals

**Goals:**

- 在现有 `DocumentParser` 接缝后提供本地 Docling PDF 解析 Provider，保留原始字节、页面、区块、标题路径、坐标和稳定引用。
- 对解析、索引和可发布状态使用明确的生命周期，区分损坏 PDF、扫描件/OCR 缺失、解析警告和索引失败。
- 从带引用的 PDF 区块生成结构化 SOP 步骤草案、参数、前置条件、验收标准和待补全字段。
- 复用 DeepSeek Harness 的 Agent 配置、preset、LLM adapter、Session、Approval 和 Storage；所有模型输出先经过结构化校验，不能直接发布或执行。
- 支持人工修订、冲突确认、版本冻结和发布；只有人工确认后的 SOP 内容才能作为 `confirmed=true` 的规划知识。
- 让原始 PDF、解析块、SOP 草案、修订和发布版本在同一 Knowledge Provider 中可追溯、可重建。
- 提供文件优先的 Knowledge workspace，通过 typed Web Consumer 完成文件录入、生命周期查看、证据审核、冲突处理和召回验证。
- 提供可插拔 Embedding Adapter 和本地 SQLite 向量投影，支持 FTS5/向量混合召回；未配置 embedding 时保持明确可用的 FTS5-only 路径。
- 向 `lab-harness-native-workspace` 提供稳定的 Service/Facade DTO、能力状态、引用身份和 workspace slot，不承担全局侧栏、项目会话、Agent 对话和计划执行 UI。

**Non-Goals:**

- 首轮不做 OCR，不把图片或扫描件自动当成可信文本；这类文件记录 `OCR_REQUIRED` 或等价的明确失败状态。
- 不执行 PDF 中的脚本、链接、命令或 API 内容，也不根据 PDF 自动安装或执行实验 Skill。
- 不要求 CSV 和 PDF 之间存在业务建模关系，不把当前 CSV 的列名写死为 PDF 解析输出 schema。
- 不建设远程向量数据库、跨租户权限、生产文档协作、复杂版面还原或真实设备执行。
- 不实现项目/Session 关系、Harness 原生聊天、全局侧栏、计划确认卡片、Skill 激活或 Runtime 控制。

## Decisions

### 1. 复用现有 DocumentParser，增加受控 Docling PDF adapter

生产实现放在 `lab-knowledge-local` 的 Parser adapter 中，保持 `KnowledgeService` 与 Provider 的接缝不变。Host 通过 `ctx.subprocess` 在 sandbox 中调用本地 Python/Docling 运行时，输入使用已保存的不可变 PDF 字节，输出使用版本化的内部 Document IR。浏览器、Agent 和业务服务不得直接调用 Docling，也不得接收任意本地路径、shell 参数或 PDF 内的链接/脚本。

Docling 的具体运行时路径、模型缓存和资源限制由 Host 配置提供，不写入业务代码。部署必须在能力检查阶段报告 Docling 是否可用、版本、支持的输入类型和 OCR 能力；不可用时返回明确的 `PARSER_UNAVAILABLE`，不得退回到未声明的 `pdftotext` 或其他系统命令。

Docling 输出转为稳定的 `ParsedDocumentBlock`：每个区块记录页面、阅读顺序、标题路径、原文和可用坐标；表格保留表头、行、列和单元格引用。只有输出通过确定性结构校验时才标记为 `table`；无法可靠识别时保存为带页码的普通文本并写入解析警告，而不是猜测列值。首轮不负责 OCR，但应识别无文本层的输入并返回 `OCR_REQUIRED`。

### 2. 使用分层数据模型，区分来源、解析结果和知识策展

解析流程使用以下层次，任何下游投影都不得反向覆盖上层数据：

```text
SourceDocument/SourceVersion  不可变 PDF 原文和来源元数据
        ↓
ParseRun + DocumentIR       一次解析的版本化结果和运行记录
        ↓
ParsedDocumentBlock         可引用的页面/区域/表格区块
        ↓
CandidateFact/SopDraft      带证据的候选事实和 SOP 草案
        ↓
SopRevision                 人工修改、冲突处理和审核修订
        ↓
PublishedKnowledge          可用于规划的发布投影
```

FTS5、Embedding 和 SOP 检索投影均为可重建派生数据。原始文件、人工修订和发布决定是权威数据；LLM 输出只属于候选草案，不能替代来源或发布状态。

### 3. 版本化解析运行和 Document IR

每次解析都创建 `ParseRun`，至少记录 `parseRunId`、`sourceVersionId`、内容哈希、解析器名称/版本、配置摘要、Document IR schema 版本、开始/结束时间、尝试次数、状态、警告和错误。解析结果还要记录页数、文本层/OCR 来源、文档语言（如可识别）和输出产物引用。

`ParsedDocumentBlock` 的坐标使用带页面尺寸、旋转角和坐标系的 `bbox`，并保留标题路径、阅读顺序、来源字符区间、结构类型、置信度（如解析器提供）、表格关系和警告。解析块的稳定身份由 source version、页面、解析结果版本和确定性位置共同决定，不能只依赖展示序号。

### 4. 原始资料不可变，解析和索引可重建

继续以内容哈希作为文档版本身份，原始 PDF 字节保存于现有 `document_versions.content`。原始文件保存成功后才创建 ParseRun；解析、区块、FTS5、Embedding 和 SOP 检索投影都使用事务或临时产物完成后再切换，避免查询到半份结果。

导入状态扩展为可表达“已登记、解析中、索引中、可检索、需要 OCR、失败”。失败版本不进入已确认知识；同一内容哈希重复导入返回既有版本。解析重试从不可变字节重新开始，不修改原始资料。

### 5. SOP 草案是知识策展对象，不是可执行 Skill

在现有 Knowledge Service 的类型和本地 Provider 中增加 SOP 草案/修订接口。草案包含来源版本、引用区块、步骤顺序、步骤意图、输入和参数、前置条件、完成标准、风险提示、Skill 绑定候选、缺口和假设。每个非来源字段都必须有一个或多个引用，或明确标记为 `MISSING`/`ASSUMPTION`。

草案生成使用现有 Harness Agent 配置，模型只接收解析后的带引用区块和结构化输出 schema；模型不可访问原始文件路径、shell 或设备。输出经过确定性 schema、引用存在性、引用范围和参数单位校验后才保存为草案。模型不可用时记录“待生成/待人工处理”，不生成伪造步骤。

### 6. 采用不可变修订和明确发布状态

SOP 草案修订状态为 `DRAFT → NEEDS_COMPLETION → IN_REVIEW → APPROVED → PUBLISHED`，并支持 `REJECTED`。人工补全不会覆盖原版本，而是创建下一修订并保存操作者、时间、字段变更、说明和使用的引用。存在未解决冲突、缺少必填字段、缺少引用或校验失败时不能进入 `APPROVED/PUBLISHED`。

发布时把规范化 SOP 步骤投影到同一 SQLite 知识索引，并保留 `sopDraftId/sopRevisionId`、来源 PDF 版本和引用区块。原始 PDF 仍可检索为来源证据，但只有已发布步骤和明确人工确认的来源事实进入计划阶段的确认知识过滤；发布动作通过现有 Approval/Session 记录。

### 7. 使用稳定错误协议和明确重试语义

Parser、OCR、索引和草案生成错误统一保存 `code`、`message`、`phase`、`retryable`、`details` 和 `parseRunId`。文件本身无效、加密、格式不支持或超过业务限制的错误不可通过盲目重试解决；运行时不可用、超时、临时 IO 和索引故障可以由服务按策略重试。错误状态不能产生可用于规划的确认知识。

首轮错误码至少包含 `PARSER_UNAVAILABLE`、`PDF_INVALID`、`PDF_CORRUPT`、`PDF_PASSWORD_PROTECTED`、`PDF_UNSUPPORTED`、`PDF_EMPTY`、`OCR_REQUIRED`、`OCR_FAILED`、`PDF_PARSE_TIMEOUT`、`PDF_RESOURCE_LIMIT`、`PDF_OUTPUT_INVALID`、`PDF_IO_ERROR` 和 `INDEX_FAILED`。警告至少区分 `TEXT_EXTRACTION_INCOMPLETE`、`READING_ORDER_UNCERTAIN`、`TABLE_STRUCTURE_UNCERTAIN`、`FIGURE_TEXT_UNEXTRACTED` 和 `OCR_LOW_CONFIDENCE`。

### 8. 文件导入安全和解析能力显式化

入口只接受浏览器上传的受控字节或已授权的 Storage 引用，不接受任意本地文件路径。导入阶段校验文件大小、扩展名、MIME 类型和 PDF 文件头；校验失败不创建可检索版本。解析任务使用受限的输入目录、CPU/内存/时间上限，不向 Docling 传递用户可控的 shell 选项。

Provider 提供解析能力查询，返回 Docling 是否安装、版本、支持格式、OCR 是否可用、资源限制和当前索引模式。能力不可用时 UI 应在导入前或失败后给出可行动的状态，而不是静默切换解析器。

### 9. 人工审核使用平台内证据视图

Web 通过现有 Facade 获取文档页、区块和候选字段，审核者可以在页面预览中定位引用、查看坐标高亮、修改值/单位、标记缺失或假设、处理冲突并提交修订。CSV 只保留为测试和导出格式，不作为审核和批量补全主入口。每个审核写操作都使用现有 Session/Approval/Storage 审计，并保留操作者、时间、字段变更和说明。

### 10. 不在本变更复制 Agent 或 Harness 工作区基础设施

本变更增加 Parser、文件录入、知识策展、Provider 存储、Embedding Adapter、召回和 Knowledge workspace/Consumer 入口。模型、Agent preset、Session、Approval、Storage 和 SQLite 生命周期继续复用 Harness/Knowledge 现有能力；不创建第二套 Agent loop、全局 sidebar、项目会话或对话 composer。解析与草案生成的测试默认 keyless：使用真实 PDF 字节验证解析，用确定性 draft fixture 或 fake Agent 验证持久化和状态机；真实模型只在显式 e2e 中调用。

### 11. Knowledge workspace 由本变更实现，Harness 外壳由另一变更装配

本变更提供独立的 Knowledge workspace contributor，负责 PDF/CSV/TSV/文本文件选择与拖放、受限上传、文档/版本列表、解析与索引状态、重试、引用证据、冲突、SOP 修订/发布和检索调试。浏览器只调用 typed Web Facade，不导入 Provider、SQLite 或 Docling。Knowledge source 上传与普通 Agent 消息附件保持不同命令路径。

`lab-harness-native-workspace` 只负责把该 contributor 挂载到 Harness workspace/layout，并在全局侧栏提供 Knowledge 入口。双方在 Service/Facade DTO、capability version、source/version/citation ID 和 workspace slot ID 上对接；本变更不得实现全局侧栏、项目列表或对话布局。

并行施工时，Knowledge Facade DTO/命令放在独立的 knowledge protocol 模块，Knowledge workspace 放在独立 contributor/package；不得把 PDF/召回逻辑继续堆入共享的单文件 Web protocol 或 Harness 项目工作区组件。共享入口只负责组合导出和注册，最后由联合集成任务更新。

### 12. Embedding 和混合召回完全归属 Knowledge Provider

Embedding Adapter 由 trusted Host 配置 provider、endpoint、model、credential reference、vector dimension、timeout/retry 和关键词/向量权重。Provider 记录模型与维度元数据，在导入或重建时生成向量，在查询时合并归一化 FTS5 与 cosine 分数，并先应用文档/版本/确认/冲突过滤。项目层只能传入稳定的 source/version scope，不参与排序实现。

未配置 adapter 时 Provider 明确报告 `fts5-only`；配置不完整时启动校验失败；运行时失败时保留来源和 FTS5 投影并暴露可重试状态。聊天 `llm-deepseek` 配置不得被隐式当作 embedding 接口，首轮不增加远程向量数据库。

## Risks / Trade-offs

- [PDF 版面和表格结构差异很大] → 首轮保证文本、页码、坐标和区块引用，表格只在确定性规则通过时结构化；无法可靠还原时保留警告并要求人工补全。
- [Docling 运行时或模型缓存不可用] → 通过 Host 能力检查和稳定的 `PARSER_UNAVAILABLE` 暴露问题；不增加隐藏的系统命令回退。
- [Docling 升级可能改变文本顺序] → 记录 parser name/version、配置摘要和 IR schema 版本，使用页/区块引用和固定 fixtures 做回归；升级时重新构建派生索引，不覆盖原始版本。
- [模型可能输出无来源或超出原文的步骤] → 所有字段强制引用或缺口标记，发布前做引用完整性和人工审批，模型输出不直接进入 Runtime。
- [SOP 表格扩展 SQLite schema] → 使用现有 Provider 本地 schema 版本/幂等迁移，旧文档和索引可从原始字节重建；不承诺外部数据库兼容。
- [PDF 字节和解析产物占用本地存储] → 原始资料按内容哈希去重，派生索引可删除重建；首轮不复制原始文件到第二个数据库。
- [使用者误把 PDF 原文当成已确认知识] → 检索结果明确区分来源、草案、确认和发布状态，规划工具默认请求确认过滤，并在工具输出中带状态。
- [并行开发修改同一前端或 Facade] → 本变更只修改 Knowledge DTO、命令和 workspace contributor；Harness 工作区线只消费公开接口。双方先冻结 capability version、opaque IDs 和 fixture，再分别施工。

## Migration Plan

1. 扩展领域状态、引用/来源元数据、ParseRun、DocumentIR 和 Knowledge Service/Provider 类型，保持 CSV 和现有 fixture Parser 可用。
2. 增加 Docling Host adapter、能力检查、解析元数据迁移和真实 PDF keyless 解析回归；先只验证导入、页码、坐标、文本、警告和失败状态。
3. 增加安全导入、原子派生写入、错误码/重试语义和从不可变字节重建的测试。
4. 完成 Embedding Adapter、SQLite 向量元数据、混合召回和明确的 FTS5-only 路径；默认测试不访问网络或收费模型。
5. 增加 SOP 草案持久化、Agent 结构化生成、平台内证据审核、人工修订/冲突校验和发布投影；用 fake Agent 完成 keyless 状态机测试。
6. 扩展现有 Knowledge 工具和 Web Facade，并实现 Knowledge workspace contributor；冻结 capability version、source/version/citation ID 和 fixture 供 `lab-harness-native-workspace` 消费。
7. 选择一份 PDF 资料完成平台内手工演练，再将 PDF 资料集加入可重复测试矩阵；CSV 仍作为独立测试输入和导出格式，不建立强制映射。
8. 与 Harness 工作区线执行联合 smoke：挂载 Knowledge workspace、绑定项目 source scope、Agent 召回已发布 SOP 并生成待人工确认计划。
9. 回滚时移除生产 Parser/策展/Embedding Provider 和 Knowledge workspace 的 opt-in 配置即可；原始版本、现有 CSV 流程和旧测试 Parser 不被删除，派生表可重建。

## Open Questions

- Docling 的 Python 版本、模型缓存方式、运行时打包和资源限制需要在实现任务开始时验证；如果本地运行时不可用，应返回能力错误，不得添加隐藏的系统命令回退。
- 首轮 SOP 草案生成的 Agent preset 名称需要从现有配置中确认；没有可复用 preset 时只增加最小 preset 组合，不创建实验专用 Agent loop。
- 首轮真实 embedding provider/model 仍由用户通过 `.env`/trusted Host 配置选择；未选择前必须完成 FTS5-only 路径和 fake adapter 测试，不能阻塞文件录入与关键词召回。
- Knowledge workspace 发布的 slot ID 与 Facade capability version 需要在并行施工前冻结；建议由本变更提供，`lab-harness-native-workspace` 只声明依赖并在不可用时显示明确状态。
