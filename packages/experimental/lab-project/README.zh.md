# @deepseek-ai/dsh-experimental-lab-project

[English](README.md) | 中文

面向 opt-in 实验流程的持久化项目和多 Session 会话记录。

本包负责实验项目身份、明确的 Knowledge source/version 和设备关联、Session 标题/顺序、已批准共享事实、审计记录，以及可重建的计划/运行/报告证据投影。它复用现有 Storage Domain 生命周期；消息和工具事件仍以 Harness Session 日志为权威。

项目和 Agent 通过只读 `LabKnowledgeConsumer` 接缝消费知识，不解析文件、不访问 Knowledge Provider 数据库，也不实现检索。
