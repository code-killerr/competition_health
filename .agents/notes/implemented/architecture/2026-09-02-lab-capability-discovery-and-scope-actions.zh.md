---
title: LABWEAVE 能力发现与 Host 管理的项目范围动作
kind: architecture
status: implemented
date: 2026-09-02
---

# LABWEAVE 能力发现与 Host 管理的项目范围动作

## 问题

根级 Knowledge 页面依赖 Experiment，导致 Experiment 创建前无法录入或检索知识。Devices 页面只展示 Experiment 范围记录，也没有 Project 操作。Agent 可以查询单条 Knowledge 记录，却无法在规划前发现已有知识资料和已配置设备能力。

## 决策

Knowledge 导入、设备注册、Project 范围和授权继续由 Host 服务负责。根级页面使用全局 Knowledge 快照。新增只读 `lab_knowledge_catalog` 和 `lab_device_catalog` Agent 工具。Devices 与 Knowledge 页面只能通过 Host action 更新 Project 范围；Agent 可以发现并规划这些记录，但不能导入字节、预约或控制设备，也不能绕过审批门禁。

## 结果

Knowledge 和已配置设备在 Experiment 创建前即可被发现。Project 的资料和设备选择通过现有 Host `project-scope-update` 操作持久化并保持 Session 范围。LABWEAVE 可以在生成计划前读取当前能力，同时执行和审批的所有权不变。
