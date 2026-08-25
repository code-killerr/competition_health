## Why

当前 Harness 已提供 Agent、工具、Skill 指令、审批、会话和插件组合能力，但还没有面向实验自动化的知识、设备、Skill 生命周期和运行时闭环。现在需要先建立一个通用、可审计、可人工确认的最小原型，验证“资料录入 → 知识召回 → Agent 规划 → 人工确认 → 受控执行 → 结果反馈”是否能够支撑真实实验需求。

## What Changes

- 新增实验知识库能力，支持用户登记 CSV、PDF 等资料，保存版本和解析状态，建立可重建的关键词/向量混合检索，并返回带来源的引用。
- 新增声明式 Lab Skill 能力，支持 Agent 生成 Skill 草案、确定性校验、人工批准、激活、运行时修订锁定和实验缓存沉淀。
- 新增实验规划与确认能力，支持解析用户实验意图、结合知识库生成计划和步骤、查询设备能力、报告缺失信息与冲突，并在执行前完成计划及 Skill 的人工确认。
- 新增受控执行与反馈能力，支持设备、人工确认和审批等可插拔操作执行器，记录步骤状态、回执、证据、结果验证、失败安全停止和最终反馈。
- 新增第一阶段实验包组合与最小交互 Consumer，所有新增包先位于 `packages/experimental/` 并保持 opt-in，不改变 Harness 默认 profile。
- Agent 接入复用 Harness 现有 `ctx.agents`、Agent preset、LLM adapter、`ctx.tools`、`ctx.skills`、`ctx.approval`、Session、`ctx.storage` 和 `ctx.subprocess` 配置；不新增实验专用 Agent 配置中心、Agent loop 或会话协议。
- 将示例 CSV、流程确认表、PDF 和鼠脑空间转录组用例纳入测试夹具或演示输入，不在 Agent prompt、领域类型、Provider 或 Runtime 中硬编码资料内容。
- **BREAKING**：第一阶段执行器不得运行模型生成的任意脚本或任意设备命令；动态脚本只能进入候选资产，只有已安装、已校验、已批准并由 Provider 注册的操作实现才能执行。

## Capabilities

### New Capabilities

- `knowledge-ingestion-and-retrieval`：资料导入、解析、版本、结构化事实、冲突、引用和混合检索。
- `declarative-lab-skill-lifecycle`：声明式实验 Skill 的生成、校验、批准、激活、快照、资源绑定和安全执行边界。
- `experiment-planning-and-confirmation`：用户意图解析、知识辅助计划生成、步骤校验、缺口处理和人工确认。
- `controlled-execution-and-feedback`：基于已批准计划的步骤执行、设备接入、人工操作、结果验证、停止、审计和反馈。

### Modified Capabilities

无。现有 OpenSpec 变更 `ai-native-experiment-workflow-demo` 只描述前端交互演示，本变更不修改它的需求，也不把它作为最终 UI 实现来源。

## Impact

- 新增 `packages/experimental/` 下的领域包、Knowledge、Lab Skill、Device、Runtime 的 Service Definition/Provider/Consumer，以及最小实验 bundle。
- 依赖并复用 Harness 的 Cordis 插件组合、`ctx.agents` 与 Agent preset、LLM adapter、`ctx.tools`、`ctx.skills`、`ctx.approval`、`ctx.storage`、Session 事件、`ctx.subprocess` 和沙箱能力；不修改 `agent-loop` 核心行为。
- 新增 Provider 自有的 SQLite 元数据和 FTS/向量派生索引，以及不可变原始资料和实验产物引用；索引与实验缓存必须可重建。
- 需要新增领域类型、工具 schema、会话事件、真实组合测试、keyless snapshot 和文档；首轮不引入真实硬件 Provider、生产级远程调度器或独立向量数据库。
