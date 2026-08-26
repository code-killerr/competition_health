# @deepseek-ai/dsh-experimental-lab-planning
English | [中文](README.zh.md)

规划阶段的 Service Definition。它只定义检索上下文、声明式计划提案和 Provider 接缝，不创建新的 Agent、模型配置或执行通道。

`lab-planning-local` 负责调用 Knowledge、Skill 和 Device Service；规划工具负责把 Agent 生成的结构化提案交给该 Service。计划和 Skill 在人工确认前保持非执行状态。

计划提案由确定性校验器检查 DRAFT 状态、检索来源和 Skill 参数约束；该 Service Definition 不负责审批、锁定或执行。

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
