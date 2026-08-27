# Agent Note: Knowledge MVP 将 PDF 解析保留在可配置解析器接缝之后

Status: implemented

[English](2026-08-27-knowledge-mvp-parser-seam.md) | 中文

## 问题

第一版 Knowledge 必须证明真实实验室资料可以变成带引用、可审核的 SOP 步骤，但不应把生产级 PDF 解析、OCR、Embedding 或原生工作区变成演示闭环的前置条件。

## 决策

MVP 扩展现有的 `lab-knowledge-local` Provider、`lab-mvp-web` 协议和可选的 `ui-lab-workbench` overlay。PDF 字节通过已配置的 `DocumentParser` 接缝处理；CSV、TSV 和文本继续使用本地解析路径。SQLite 保存来源区块和紧凑的 SOP 草案，FTS5 返回确定性引用，发布操作把完成审核的 SOP 步骤投影为带有明确 `SOP_PUBLISHED` 来源标识的已确认检索结果。

第一版在解析器不可用或输入为空时返回可见失败，而不是宣称 PDF 已经就绪。SOP 草案保存来源版本标识、必填字段、缺失字段阻塞项和审核状态。只有完成审核且引用完整的草案才能发布；本 MVP 中发布后的步骤不可变。

## 考虑过的替代方案

**在第一版直接打包 Docling。** 这会在导入到 SOP 的工作流得到验证前引入新的运行时和部署路径依赖。保留可配置解析器接缝，把运行时选择交给生产化变更明确处理。

**使用 `pdftotext` 作为后备方案。** 宿主命令会引入未声明的行为，并丢失 Knowledge 工作流需要的页码、标题和区块引用数据。因此解析器缺失时保持为可操作的失败状态。

**先构建 Harness 原生工作区。** 现有 overlay 和类型化 `/api/lab` 路径已经可以演示目标用户流程。MVP 验证流程后，原生工作区可以复用相同的 Provider 方法。

## 后果

演示可以用确定性的 PDF fixture 字节和 fixture 解析器在无 Key 条件下运行；没有 PDF 适配器的干净部署会明确失败。FTS5 是第一版检索基线；Embedding 和混合召回留在本切片之外。紧凑的 SOP 记录适合原型，但不提供修订历史或完整审计记录。来源版本引用和明确来源标识为后续的过期投影处理和生产审核历史保留扩展点。

