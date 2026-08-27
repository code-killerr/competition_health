## Context

`lab-knowledge-local` 已经通过 `DocumentParser` 接缝支持可配置的文档解析，并拥有不可变源文件、SQLite/FTS5、引用和 SOP MVP 能力。当前默认实验 Bundle 没有 Docling 运行时；PDF 只能在测试中使用确定性夹具 Parser，真实导入会以 parser unavailable 失败。

本变更为第一轮补齐一个可运行的本地 Docling Adapter。浏览器和 Agent 仍只调用现有 Knowledge Service/Web Facade；Node Host 负责准备受控输入、通过 Host subprocess 启动本地 Python/Docling、读取结构化输出并注入 `DocumentParser`。本轮以文本型 PDF 为目标，优先打通真实文件导入、解析、索引和引用检索；沙箱策略调优不阻塞本轮。

## Goals / Non-Goals

**Goals:**

- 在本地 Host 中运行已安装的 Python/Docling，不调用远程 PDF 服务。
- 让默认实验 Bundle 能配置并探测 Docling，然后把真实文本型 PDF 解析为现有 `ParsedDocumentBlock`。
- 保存 PDF 原始字节，校验输入，执行 `QUEUED → PARSING → INDEXING → READY/FAILED` 生命周期。
- 保留页面、标题路径、正文、基础表格和稳定区块位置，供当前 FTS5、引用和 SOP MVP 使用。
- 对 Docling 不可用、输入无效、无可提取文本、超时和非零退出提供明确失败状态。
- 通过现有 `/api/lab` 和工作台完成文件选择、状态查看、检索和引用展示。

**Non-Goals:**

- 不在本轮实现 OCR 引擎；扫描型或无文本 PDF 返回明确的 `OCR_REQUIRED` 或等价失败状态。
- 不实现坐标高亮、复杂表格恢复、图片理解、公式识别和完整 Document IR 治理。
- 不实现完整 ParseRun 审计、Embedding 混合召回、不可变 SOP 多修订历史或 Harness 原生 Workspace。
- 不允许浏览器、PDF 内容或 Agent 传入任意 shell 参数、URL 或本地路径。

## Decisions

### 1. 通过现有 `DocumentParser` 接缝接入 Docling

Docling Adapter 负责把运行时调用和 Docling 输出转换为 Provider 已理解的 `ParsedDocumentBlock`；Knowledge Provider 继续负责源文件、SQLite、FTS5、确认和 SOP。这样首轮不会产生第二套 Knowledge Provider。

备选方案是让 `LocalKnowledgeProvider` 直接导入 Python 或直接解析 PDF。该方案会把运行时、数据库和文档业务耦合在一起，降低测试性并破坏现有 Provider 边界，因此不采用。

### 2. Node Host 通过受控子进程调用本地 Python/Docling

Adapter 使用 Host 的子进程能力，输入是 Provider 已保存的临时 PDF 文件，输出是受版本约束的 JSON 文档结果。运行时路径、Python 入口、超时、文件大小和临时目录属于受信任 Host 配置；不接受来自浏览器或模型的命令行参数。沙箱策略调优属于后续轮次。

备选方案是让 Node 直接依赖一个 PDF npm 包或使用未声明的 `pdftotext`。这无法提供 Docling 的结构化输出，并会使生产行为与计划不一致，因此不采用。

### 3. 首轮只映射稳定的文本字段，保留基础表格协议

Docling 输出转换为现有字段：`location`、`content`、`kind`、`page`、`titlePath`、基础表头和行号。包内第一轮 runner 使用关闭 OCR/表格模型的快速文本层配置，优先保证本地 CPU 解析链路可用；Adapter 仍保留经过校验的基础表格字段，后续表格 pipeline profile 可以复用。无法可靠转换为表格时保存带页面位置的普通文本，并记录警告；不猜测列值。坐标、OCR 置信度和复杂布局字段留给后续生产变更。

### 4. 运行时不可用时显式失败，不静默降级

导入阶段通过解析器可用性和进程启动结果报告 Docling 运行时、版本和支持的 PDF 类型；导入阶段区分输入错误、运行时不可用、执行超时、无文本内容和输出无效。没有可用 Docling 时不退回到 `pdftotext`，也不把 PDF 字节当作普通文本发布。

### 5. 复用现有 Web 录入闭环

现有浏览器文件字节上传、导入状态、FTS5 查询和引用展示继续作为用户入口。适配器完成后，同一流程可以从真实 PDF 得到 `READY` 和带页面引用的检索结果；不新增 CSV 中间审核流程。

## Risks / Trade-offs

- [本地机器未安装 Docling 或模型缓存未准备好] → 在导入结果中显示可操作错误，并保留测试 Parser 作为测试依赖，不伪造生产 READY。
- [不同 Docling 版本的输出字段变化] → 固定 Adapter 支持的输出版本，解析未知字段时失败并记录版本；在后续变更中增加 Parser 版本和 IR 版本治理。
- [超大或恶意 PDF 消耗资源] → 在 Provider/Host 入口限制文件大小、页数、超时和临时目录，并限制子进程权限。
- [复杂表格映射错误] → 首轮只发布通过基础结构校验的表格，否则保存普通文本并提示人工确认。
- [全仓类型检查存在与本变更无关的配置问题] → 运行相关包的 focused tests/typecheck，并单独记录全仓门禁结果。

## Migration Plan

1. 增加 Docling Adapter、Host 配置和能力检查，但默认 Web profile 继续不启用实验 Bundle。
2. 在实验 Bundle 中将 Docling Adapter 注入 `lab-knowledge-local`，保留无 Docling 环境的显式能力失败。
3. 先运行 Parser/Provider focused tests，再运行一个本地 Docling 真实 PDF smoke；环境不可用时测试必须验证稳定失败状态。
4. 保留现有数据库表和 CSV/TSV/文本行为；新字段以兼容方式加入，旧测试 Parser 仍可用于无 Python 依赖的测试。
5. 回滚时移除 Docling Adapter 的组合和配置，已有文本/CSV/TSV 与测试 Parser 不受影响。

## Open Questions

- 目标开发机和部署环境是否统一使用已安装的 Python 虚拟环境，还是由 Host 提供固定 Docling runner 路径？本轮通过配置字段隔离该选择，不阻塞 Adapter 接口。
- 真实 smoke 使用哪一份本地 PDF 作为固定样本？优先使用 `docs/change_plan/pdf_knowledge/` 中存在且可读取的文本型 PDF。
