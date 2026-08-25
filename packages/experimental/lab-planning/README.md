# @deepseek-ai/dsh-experimental-lab-planning

规划阶段的 Service Definition。它只定义检索上下文、声明式计划提案和 Provider 接缝，不创建新的 Agent、模型配置或执行通道。

`lab-planning-local` 负责调用 Knowledge、Skill 和 Device Service；规划工具负责把 Agent 生成的结构化提案交给该 Service。计划和 Skill 在人工确认前保持非执行状态。
