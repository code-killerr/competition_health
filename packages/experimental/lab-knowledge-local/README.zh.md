# @deepseek-ai/dsh-experimental-lab-knowledge-local

[English](README.md) | 中文

第一阶段 Provider-owned 本地知识库。它在 SQLite 中保存不可变资料内容和文档元数据，使用 FTS5 为文本区块建索引，返回带版本的引用，并支持重建派生索引。

第一增量支持类文本文件和 CSV 字节。没有配置解析器时，PDF 会保留为失败导入，不会猜测生成文本。

## 模型体验

本 Provider 不新增工具或提示词。Knowledge Consumer 接收带文档版本、位置、确认状态和得分的有边界摘录。

### Token 影响

检索结果受请求 limit 限制，并带有计划审查所需的引用。

### KV Cache 影响

FTS 和可选 Embedding 索引属于可重建 Provider 数据，不是模型上下文，也不是实验事实的第二来源。

## 已知限制与暂缓事项

- EmbeddingAdapter 是可选能力；配置后向量会保存到可重建的 SQLite 表，并按配置权重与 FTS5 得分统一排序。
- DocumentParser 是可选接缝，可提供 PDF、页码和表格区块；未支持的 PDF 仍明确标记为失败导入。
- SQLite 打开后使用同步 API，面向本地原型。
