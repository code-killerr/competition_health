# @deepseek-ai/dsh-experimental-tool-lab-knowledge

[English](README.md) | 中文

基于 `ctx.labKnowledge` 的 Agent 作用域知识工具。插件复用 Harness Agent 生命周期，通过 `agent.ctx.tools.register()` 为已有 Agent 和后续创建的 Agent 注册工具。

## 工具

- `lab_knowledge_import` 登记本地资料路径并返回不可变文档/版本状态。
- `lab_knowledge_status` 查询解析和索引状态。
- `lab_knowledge_search` 返回带版本、位置、得分和确认状态的知识引用。
- `lab_knowledge_conflicts` 列出需要人工处理的冲突。
- `lab_knowledge_confirm` 记录具名人工对引用事实的确认。

本包不选择模型、provider、preset、API Key 或 Session 实现，这些仍由 DeepSeek Harness 配置负责；本包也不执行文档解析器、脚本、设备命令或模型生成的任意输出。

## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
