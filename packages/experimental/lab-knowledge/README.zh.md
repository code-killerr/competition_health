# @deepseek-ai/dsh-experimental-lab-knowledge

[English](README.md) | 中文

面向版本化实验资料录入、带引用检索、冲突记录和人工确认的 Service Definition。

本包不选择解析器、数据库或 Embedding 实现；当前本地 Provider 已负责可配置解析器、SQLite/FTS5、可选 Embedding、确认和冲突记录。

## 模型体验

后续知识工具会暴露导入状态、带引用证据、冲突和确认状态。本 Service Definition 本身不新增工具或提示词。

### Token 影响

检索证据的大小由 Provider 和 Consumer 决定；引用是必要字段，用于区分来源事实和假设。

### KV Cache 影响

检索结果应按请求生成。导入和确认事实由 Session 事件与 Provider 存储负责，不能隐藏在提示词缓存中。

## 已知限制与暂缓事项

- 当前不在包内嵌入任何资料夹具。
