## Why

当前 Knowledge MVP 已经具备文件字节导入、SQLite/FTS5、引用和 SOP 发布闭环，但默认运行环境没有真正的 PDF 解析器，上传 PDF 只能进入 parser unavailable 失败状态。现在需要补齐第一轮可用的本地 Docling Adapter，让真实文本型 PDF 能进入知识库并服务后续 SOP 草案和实验步骤生成。

## What Changes

- 新增本地 Docling PDF Adapter，实现现有 `DocumentParser` 接口并由 Harness Host 通过受控子进程调用 Python/Docling；沙箱策略调优留到后续轮次。
- 增加受信任的 Docling 运行时配置和能力检查，明确报告运行时不可用、版本和支持能力。
- 对上传的 PDF 字节执行基础类型、大小和 PDF 文件头校验，先保存不可变源文件，再执行解析和索引。
- 将 Docling 输出转换为现有 `ParsedDocumentBlock`，首轮保留页面、标题路径、正文、基础表格和可追溯区块位置。
- 复用现有 Knowledge Provider、FTS5 和 `/api/lab` Web 录入流程，真实 PDF 解析成功后可检索并显示引用。
- 增加真实 PDF 的 keyless/可用运行时测试路径，以及 Docling 不可用、无文本内容和解析失败的可操作状态。
- 本轮不实现 OCR、坐标高亮、复杂表格恢复、完整 ParseRun 审计、Embedding 混合检索、不可变 SOP 修订和 Harness 原生 Workspace。

## Capabilities

### New Capabilities

- `pdf-docling-ingestion`: 使用本地 Docling 将受控 PDF 字节解析为带页面和区块引用的 Knowledge 内容，并接入现有录入、索引和状态流程。

### Modified Capabilities

无。现有 `knowledge-mvp-loop` 已在 `pdf-knowledge-parser-mvp` 中定义，本 Change 通过现有 Provider 和 Web Facade 接缝补充真实 PDF Parser，不改变已发布的 MVP 业务闭环语义。

## Impact

- 影响 `packages/experimental/lab-knowledge-local` 的 Parser 适配和 Provider 组合、`packages/experimental/lab-mvp` 的实验 Bundle 配置，以及相关测试和中英文文档。
- 需要本地 Python/Docling 运行时或等价的受控运行时入口；浏览器、Agent 和 PDF 内容不能直接提供 shell 参数或任意本地路径。
- 不新增远程 PDF 服务，不新增第二套 Knowledge Provider，不改变默认 Web profile。
