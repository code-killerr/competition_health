## Why

当前 Knowledge Provider 已定义 `DocumentParser` 接缝，但没有默认的生产 PDF 解析实现；现有 PDF 资料无法从文件进入可检索知识库。需要把“PDF 原文保留 → 通过本地 Docling 解析并定位引用 → 生成 SOP 草案和缺口 → 在平台内人工补全 → 知识发布”的过程落地，才能让后续 Web 原型使用真实知识资料，而不是依赖硬编码 CSV 或静态 demo 状态。

## What Changes

- 新增本地生产 PDF Parser Provider，通过 Harness Host 的受控子进程调用 Docling，支持文本型 PDF 的页面、标题、段落和基础表格区块抽取，并保留可追溯的页码/区块引用。
- 将 PDF、CSV、TSV 和文本文件通过 typed Web Consumer 录入同一 Knowledge Provider，原始字节按内容身份不可变保存，解析文本、结构化区块和索引作为可重建派生数据保存。
- 为每次解析保存版本化的 ParseRun、解析器版本、配置摘要、警告、错误码、重试次数和时间信息；对解析失败、扫描件/OCR 缺失、损坏文件和无法定位引用的情况记录明确状态，不静默降级为可信知识。
- 新增基于 PDF 引用生成 SOP 步骤草案、参数约束、验收标准和待补全字段的结构化流程。
- 新增平台内基于页面证据的人工补全、确认、冲突处理和发布状态，只有人工确认后的内容才能进入可用于计划生成的知识范围；CSV 不作为人工审核入口。
- 增加解析能力状态、文件类型/大小/文件头校验、稳定错误协议和派生数据原子重建策略。
- 原始 PDF、SOP 草案、人工修订和发布版本之间保留来源、版本和审计关系；CSV 仍作为测试输入，不作为运行时固定格式。
- 新增文件优先的 Knowledge 工作区，负责上传、状态、重试、证据浏览、冲突处理、SOP 审核和检索结果展示；它通过 Harness 公共 workspace slot 接入，但不负责全局侧栏和 Agent 对话。
- 完成可插拔 Embedding Adapter、SQLite 本地向量投影和 FTS5/向量混合召回；未配置 embedding 时明确保持 FTS5-only，不引入远程向量数据库，也不把聊天模型当作 embedding 模型。
- 复用现有 Knowledge Service、SQLite/FTS5、Session 事件、Approval、Storage 和 Harness credential 配置，不新增第二套知识库。

## Capabilities

### New Capabilities

- `production-pdf-ingestion`: PDF 文件登记、解析、引用定位、失败状态和可重建索引。
- `sop-draft-and-human-completion`: 从 PDF 引用形成 SOP 草案、缺口、人工补全、冲突确认和知识发布。
- `lab-knowledge-workspace`: PDF/CSV/TSV/文本文件录入、来源状态、证据浏览、冲突和发布 SOP 展示。
- `lab-semantic-retrieval`: 可选 embedding 配置、本地向量投影、混合召回、确定性 FTS5 降级和引用结果。

### Modified Capabilities

- `knowledge-ingestion-and-retrieval`: 将 PDF 从“需外部配置 Parser 才能处理”提升为首轮可用的本地资料类型，并要求检索结果区分原文、草案和人工确认版本。

## Impact

- 影响 `packages/experimental/lab-knowledge-local`、Knowledge 领域类型、工具 Consumer、`packages/experimental/lab-mvp-web` 的 Knowledge Facade、Knowledge workspace slot contributor、Session 事件和本地数据目录。
- 需要接入本地 Python/Docling 运行时或等价的受控子进程适配器，但解析器必须隐藏在现有 `DocumentParser` 接口之后，并通过 `ctx.subprocess` 与 sandbox 执行。
- 需要新增解析、引用完整性、草案状态机、人工修订和知识发布测试，并使用仓库中的 PDF 资料集进行 keyless 验证。
- 需要提供稳定的 Knowledge Consumer 接口，至少覆盖能力状态、来源/版本、检索、引用、冲突、SOP 修订和发布状态，供 `lab-harness-native-workspace` 只读消费和绑定项目范围。
- 不执行 PDF 中的脚本/API 内容，不自动把模型生成的任意步骤变成可执行 Skill；真实硬件和 OCR 服务仍保持后续可插拔。
