# @deepseek-ai/dsh-experimental-tool-lab-planning

按既有 Harness Agent scope 提供规划阶段工具：检索规划上下文、读取设备能力、提交结构化计划和 Skill 草案。

工具复用 `ctx.tools` 的 schema、scope、取消和审计语义；提案只会产生 `DRAFT` 记录和 `lab/plan/proposed` Session 事件，不会审批、锁定、启动或执行设备。
