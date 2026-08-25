# @deepseek-ai/dsh-experimental-lab-planning-local

本地 Planner Provider 复用 Knowledge、Lab Skill 和 Lab Device Service，组装带引用、冲突、缺口和只读设备台账的规划上下文。

Agent 提交的计划和 Skill 草案会先保存为 `DRAFT`，并经过确定性校验；本 Provider 不审批、不锁定计划，也不执行设备操作。
