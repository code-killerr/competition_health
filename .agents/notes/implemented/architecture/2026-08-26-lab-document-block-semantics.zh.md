# Agent Note: Knowledge 区块保留表格行语义

Status: implemented

[English](2026-08-26-lab-document-block-semantics.md) | 中文

## Problem

Knowledge 检索必须保留足够的文档结构，使引用能够定位表格行或页面区块。把 CSV 行当作不透明文本会丢失列上下文，而假定每个首行都是表头又会丢弃有效的无表头数据。PDF 提取也必须保持为显式 Provider 选择，不能隐式降级为文本解析。

## Decision

`ParsedDocumentBlock` 携带 `kind`、`page`、`titlePath`、`tableHeaders` 和 `tableRow`。`LocalKnowledgeProvider` 将表格字段与区块一起持久化，并在 `KnowledgeSearchResult` 中返回。内置 CSV 和 TSV 解析保留每个非空行，分配稳定的 `columnN` 表头，将列和值格式化后写入 FTS，并处理带引号的分隔符和换行。带引号字段格式错误时，资料会在发布前导入失败。配置化 `DocumentParser` 负责 PDF 文本、页码、标题和真实表格提取；没有该解析器的 PDF 仍然明确导入失败。

## Alternatives considered

**把分隔文本行当作普通文本。** 这样会丢失引用中的列身份，并使表格结果无法与普通文本区分，因此保留结构化表格元数据。

**始终把首行当作表头。** 无表头 CSV 是有效输入，现有实验资料也使用这种形式，因此内置解析器保留全部行并生成稳定的列名。

**在本地 Provider 中内置 PDF 引擎。** 这会强制引入较重的运行时依赖并弱化解析失败语义，因此 PDF 提取继续位于配置化解析器接口之后。

## Consequences

表格检索结果包含足够元数据，Consumer 可以渲染行并引用其逻辑位置。外部解析器可以提供领域表头和页面区块，而无需改变 Provider 的 SQLite 结构。Consumer 必须区分生成的 `columnN` 表头和文档解析器提供的表头。没有配置解析器时，本地 Provider 仍不会发布 PDF 提取文本。

## Testing

Provider 聚焦测试覆盖带引号的 CSV 字段、带引号的换行、TSV 行、稳定表格元数据、格式错误的表格失败、持久化的页码/标题字段，以及现有 PDF 解析器成功和失败路径。PDF 测试数据测试通过配置化解析器接缝导入本地资料集，并验证按文档范围隔离的检索。
