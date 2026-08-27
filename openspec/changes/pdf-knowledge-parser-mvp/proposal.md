## Why

当前实验 Knowledge 已经具备 SQLite、FTS5、CSV/TSV/文本解析、引用和 Web Facade 基础，但真实 PDF 资料还不能稳定走完“导入 → 解析 → 检索 → SOP 草案 → 人工发布”的业务闭环。原有 `pdf-knowledge-parser` 方案覆盖了生产化后续的大量治理工作，不适合作为第一个敏捷原型；本变更先复用现有能力，交付一个可演示、可验证的最小纵切面。

## What Changes

- 在现有 `DocumentParser` 接缝后接入最小可用的本地 PDF 解析路径；PDF 解析失败时明确返回失败状态，不伪造可检索内容。
- 保留现有 PDF、CSV、TSV 和文本的字节导入、内容哈希去重、SQLite 存储和 FTS5 检索，并补齐 PDF 页码/标题/区块引用。
- 将导入生命周期收敛为首版需要的 `QUEUED → PARSING → READY/FAILED`，保留可操作的错误信息和重试入口，不在本版实现完整 ParseRun/OCR/复杂错误目录。
- 增加最小 SOP 草案记录：从带引用的检索结果形成步骤草案，支持人工编辑、确认和发布；未发布内容不得进入规划检索。
- 复用当前 `/api/lab` 与 `ui-lab-workbench` overlay 增加文件导入、检索引用和 SOP 审核操作，不等待 Harness 原生 Workspace 改造。
- 第一版明确采用 FTS5-only；Embedding、混合召回、坐标高亮、冲突工作流、原生 Workspace 和完整 Session/Approval 审计留到后续生产化变更。
- 添加一个真实 PDF 的 keyless 端到端测试，验证导入、引用检索、SOP 发布和发布结果检索。

## Capabilities

### New Capabilities

- `knowledge-mvp-loop`: 面向实验原型的资料导入、PDF/CSV/TSV/文本解析、SQLite/FTS5 引用检索以及 SOP 草案审核发布闭环。

### Modified Capabilities

无。本变更通过现有实验 Knowledge Service 和 Web Consumer 扩展原型能力，不修改仓库主规格目录中的既有能力要求。

## Impact

- 影响 `packages/experimental/lab-domain`、`packages/experimental/lab-knowledge`、`packages/experimental/lab-knowledge-local`、`packages/experimental/lab-mvp-web`、`packages/client/ui-lab-workbench` 及其测试。
- 复用现有 SQLite/FTS5 和 `DocumentParser`，不新增远程向量数据库，不引入第二套 Knowledge Provider。
- 保留原 `pdf-knowledge-parser` 作为后续生产化路线；本变更不实现完整 Docling 运行时治理、Embedding 配置、OCR、复杂审核和 Harness 原生项目工作区。
