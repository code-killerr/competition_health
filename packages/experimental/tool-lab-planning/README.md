# @deepseek-ai/dsh-experimental-tool-lab-planning
English | [中文](README.zh.md)

按既有 Harness Agent scope 提供规划阶段工具：检索规划上下文、读取设备能力、提交结构化计划和 Skill 草案。

工具复用 `ctx.tools` 的 schema、scope、取消和审计语义；提案只会产生 `DRAFT` 记录和 `lab/plan/proposed` Session 事件，不会审批、锁定、启动或执行设备。

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
