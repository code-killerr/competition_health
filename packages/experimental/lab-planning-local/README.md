# @deepseek-ai/dsh-experimental-lab-planning-local
English | [中文](README.zh.md)

本地 Planner Provider 复用 Knowledge、Lab Skill 和 Lab Device Service，组装带引用、冲突、缺口和只读设备台账的规划上下文。

Agent 提交的计划和 Skill 草案会先保存为 `DRAFT`，并经过确定性校验；校验会保留请求所需来源、检查步骤引用归属，并验证每个 Skill 声明的参数约束。本 Provider 不审批、不锁定计划，也不执行设备操作。

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees approved plans, controlled run states, and bounded observations through the package typed service or `lab_*` tools.

#### Token effect

Only requested plan fields, current-step status, and bounded evidence are returned; local storage details remain host-side.

#### KV Cache effect

Stable experiment, plan, Skill revision, and run identifiers keep repeated step results compact and prefix-friendly.

## Known Limitations and Deferred Work

- This experimental package provides local typed contracts and does not claim production persistence, recovery, or hardware integration.
