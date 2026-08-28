# @deepseek-ai/dsh-experimental-tool-lab-knowledge

[English](README.md) | 中文

基于 ctx.labKnowledge 的 Agent 作用域只读知识工具。插件复用 Harness Agent 生命周期，通过 agent.ctx.tools.register() 为已有 Agent 和后续创建的 Agent 注册工具。

## 工具

- lab_knowledge_status 查询解析和索引状态。
- lab_knowledge_search 返回带版本、位置、得分和确认状态的知识引用。
- lab_knowledge_conflicts 列出需要人工处理的冲突。

资料录入、事实确认、SOP 管理、解析和检索归独立 Knowledge 工作台及其公开 Service/Facade 负责。本 Consumer 只暴露实验规划所需的只读记录。

本包不选择模型、provider、preset、API Key 或 Session 实现，这些仍由 DeepSeek Harness 配置负责；本包不执行文档解析器、脚本、设备命令或模型生成的任意输出。

## 模型体验

### 受控实验上下文

#### 模型可见内容

模型通过只读的 `lab_knowledge_search` 和 `lab_knowledge_conflicts` 工具看到带引用的摘录、不可变的来源/版本标识、确认状态和开放冲突。

#### Token 影响

只返回请求的引用字段和有界状态数据；本地存储细节留在宿主侧。

#### KV Cache 影响

稳定的来源、版本、引用和冲突标识让重复检索结果更紧凑，并保持前缀友好。

## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
