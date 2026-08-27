# Agent Note: Project 壳层负责展示上下文

Status: implemented

[English](2026-08-28-lab-project-shell-showcase-context.md) | 中文

## 问题

实验室浏览器已经具备公开 Knowledge 和生命周期能力，但按阶段组织的工作台会让 Project 身份、已选来源和基于引用的规划与当前展示页面脱节。

## 决定

Workbench 负责维护类型化的 Project 壳层页面状态，并将当前 Project、Experiment、已选 READY 来源记录和引用回调传给公开 Knowledge workspace slot。Project 导航使用应用动作和客户端导航事件，不再依赖 URL hash。Knowledge workspace 继续通过公开 `/api/lab` 路径执行录入、检索和 SOP 命令，不访问 Provider 或存储实现。计划生成使用 workspace 回传的引用，并保留人工批准这一显式动作。

现有阶段动作仍由 Project 页面复用，因此生命周期行为和无密钥 fixture 继续使用当前 Facade 与 Session 路径。诊断 JSON 预览仍可用于开发检查，但来源选择和计划审阅的主要控件使用结构化记录。

## 曾考虑的替代方案

**继续使用七阶段 hash 导航作为产品壳层。** 拒绝，因为它会把流程呈现为相互分离的实验，也无法让稳定的 Project 页面负责上下文。

**让 Knowledge workspace 独立持久化 Project 归属。** 拒绝，因为 Project 范围属于 Host 管理的 Project 路径；workspace 只通过 owner 回调报告已选的公开来源记录。

**保留 raw JSON 计划编辑器作为主要无密钥路径。** 拒绝，因为展示应验证基于引用的规划和显式审阅，不应要求用户编辑不透明 ID。

## 后果

展示入口现在统一为一条连续的 Project 流程，同时继续复用已有后端服务和命令。公开 Knowledge contribution 仍可独立替换，旧的独立 Knowledge 测试也可在没有 owner 上下文时渲染。本 OpenSpec 中完整的 Experiment、Run 和 Artifact 持久化仍属于后续任务。