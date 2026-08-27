# Agent Note: 本地 Docling PDF 录入

Status: implemented

[English](2026-08-27-local-docling-pdf-ingestion.md) | 中文

## Problem

实验知识库 Provider 已经负责保存不可变源字节、SQLite/FTS5 索引、引用和 SOP 草案数据，但默认实验组合没有生产级 PDF 解析器。把 PDF 字节当作普通文本会产生不可信的知识和引用。

## Decision

第一轮 PDF 录入通过现有 `DocumentParser` 接口使用本地 Docling Python runner。Node Host 将提交的字节写入权限受限的临时目录，通过 Harness subprocess 服务使用直接 argv 启动受信任的 Python 命令，校验带版本的 JSON 协议，并在运行结束后删除临时目录。浏览器和 Agent 输入不能选择可执行路径或 shell 参数。

包内 runner 使用 Docling 的快速文本层路径，关闭 OCR 和表格结构模型，输出文本标题和段落。适配器也可以接收后续 pipeline profile 产生的、经过校验的基础表格行，并将这些内容转换为现有 `ParsedDocumentBlock` 词汇，保留稳定位置、页码、标题路径、表头和行号。Provider 继续保存原始字节、内容哈希身份、录入生命周期、SQLite/FTS5 索引和引用投影，并通过录入状态暴露解析错误码。输入无效、运行时不可用、超时、进程失败、输出损坏和无文本内容都会显式失败；PDF 字节不会静默退回文本解码。

`lab-mvp` 通过 `docling: {}` opt-in 启用 Docling。Python 和 Docling 是部署依赖，不打包进 npm。只有 OCR 的文档、坐标审核、复杂表格恢复和沙箱策略调优留到后续生产变更。

## Alternatives considered

**远程 PDF 解析服务**：不采用，因为第一轮需要保持文档字节和解析过程在本地，避免新增网络数据处理和付费服务依赖。

**Node 内直接解析 PDF 或使用 `pdftotext`**：不采用，因为无法提供计划中的文档结构，并会在 Docling 之外形成第二套解析器约定。

**只使用 LLM 提取 PDF**：不采用，因为作为录入基础，模型输出确定性更低、会增加单文档成本，也无法替代用于引用和人工确认的稳定页/区块来源。

**Docling 不可用时把 PDF 当作文本**：不采用，因为二进制数据会被当成已验证的文档内容进入搜索。

## Consequences

当部署提供 Python 3.13.x 和 Docling 时，仓库现在具备可用的本地 PDF 录入路径；当运行时不存在时，也具备确定性的不可用路径。项目 setup 命令会将 Docling 2.123.0 和支持 SOCKS 的 httpx 安装到 `.venv`，真实运行 smoke 可通过 `pnpm run docling:smoke` 执行并自动选择 `DOCLING_PYTHON`。由于首次本地 CPU 模型初始化可能较慢，Adapter 默认超时为 10 分钟，并且支持部署配置覆盖。当前 JSON 适配器协议保持窄范围，后续可以在不改变 Knowledge Provider 边界的前提下增加坐标、OCR、警告、解析器版本持久化、表格模型和更丰富的审核数据。
