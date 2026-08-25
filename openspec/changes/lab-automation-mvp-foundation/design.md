## Context

第一阶段要在 DeepSeek Harness 上验证通用实验自动化闭环。Harness 的运行时以 Cordis 插件为基本组合单位，已有 Agent、工具注册、Skill 指令发现、审批、会话事件、非会话存储、文件、子进程和沙箱等能力，但没有实验资料、实验动作、设备能力和执行图的领域模型。

现有 HTML 只表达流程参考，Space ATAC CSV、流程确认表、PDF 和鼠脑空间转录组只作为输入与测试数据。实现必须让资料驱动检索和计划生成，不能把示例名称、步骤或参数写入运行时逻辑。第一阶段同时需要保留人工确认和设备安全边界：模型可以提出声明式计划和 Skill 草案，但不能直接执行模型输出的任意代码或设备命令。

## Goals / Non-Goals

**Goals:**

- 建立 Knowledge、Lab Skill、Device、Runtime 四个完整的 Service Definition / Provider / Consumer 能力接缝。
- 贯通资料导入、RAG、意图解析、计划和步骤确认、受控执行、结果验证、报告与实验缓存。
- 让每个可执行步骤引用已批准的 Skill 修订，并在运行开始时锁定 Skill 快照。
- 使用 Mock Device 和受控操作执行器验证设备、人工操作、审批和失败安全停止语义。
- 将模型可见的检索引用、计划、确认、步骤结果和反馈写入 Session 事件，支持审计与上下文重建。
- 通过真实 Harness 组合测试和 keyless snapshot 验证从 Agent 工具到 Runtime 的闭环。

**Non-Goals:**

- 不把 Space ATAC 或鼠脑空间转录组实现为内置产品流程，不在代码中硬编码其资料、步骤或设备参数。
- 不修改 Harness `agent-loop`、`ctx.skills` 的既有语义，也不把实验 Skill 直接等同为指令 Skill。
- 不执行 Agent 生成的任意脚本、任意 API 请求或未注册设备命令；第一阶段只实现已安装且已批准的操作资源。
- 不建设真实硬件 Provider、跨进程分布式调度、生产权限体系、自动安全风险批准或大规模向量数据库。
- 不以现有 HTML 作为最终 UI 组件来源；Web Consumer 只需要证明入口、确认、运行状态和反馈可用。

## Decisions

### 1. 采用四个实验能力接缝，包全部放在 experimental

新增 `lab-domain`、`lab-knowledge`、`lab-knowledge-local`、`tool-lab-knowledge`、`lab-skill`、`lab-skill-local`、`lab-device`、`lab-device-mock`、`lab-runtime`、`lab-runtime-local`、`tool-lab`、`lab-mvp-web` 和 `lab-mvp`。领域包只放 branded ID、判别联合、单位量和规则；每个能力包按 Service Definition、Provider、Consumer 完整提供角色。

选择 Cordis 能力接缝而不是一个跨领域 `LabService`，因为资料、实验动作、设备通信和运行状态会分别替换 Provider。选择 `packages/experimental/` 而不是直接进入正式包，是因为第一阶段仍需验证领域模型，且实验 bundle 不应改变默认 profile 或被正式包依赖。

### 2. 不新增通用 BaseService 或 BaseRepository

Service Definition 使用窄接口，Provider 持有具体存储和生命周期，Consumer 只依赖服务。共享行为通过纯函数、校验器和注册表组合；不使用多层抽象继承。

这样可以遵循 Harness 的插件约定，减少空泛的基础类，并让不同 Provider 的失败语义显式化。只有当第二个独立 Provider 出现重复且稳定的协议时，才提升共享抽象。

### 3. Knowledge Provider 采用不可变资料 + SQLite 元数据 + FTS5/Embedding Adapter

原始资料以内容哈希标识并保持不可变；文档版本、解析状态、区块、事实、冲突、引用和确认记录由 Knowledge Provider 自有 SQLite 保存。关键词索引和向量索引是可删除、可重建的派生数据。首轮通过窄 `EmbeddingAdapter` 在 Provider 内完成小规模向量检索与统一重排，结构化过滤先于相似度排序。

不直接引入 PostgreSQL、pgvector 或远程 RAG 服务，因为首轮重点是知识引用和流程闭环，不是规模化部署；Provider 内部保留后续替换索引实现的接口。Docling 作为可配置解析模块由 `ctx.subprocess` 与沙箱调用，解析失败必须记录状态，不允许静默降级成不可信文本。

### 4. Lab Skill 与 Harness ctx.skills 分离并建立桥接

`ctx.skills`继续负责模型可发现的指令 Skill；`LabSkillService`负责实验动作定义和生命周期。声明式 `LabSkillDraft` 至少包含适用条件、输入输出、参数约束、操作列表、完成条件、失败策略、知识引用和资源引用。生命周期固定为 `DRAFT → VALIDATED → HUMAN_APPROVED → ACTIVE → RETIRED`。

没有匹配 Skill 时，Planner 可以生成草案，但草案不能执行。已激活实验 Skill 的说明可以投影到 Harness Skill 指令目录，但桥接不改变 `ctx.skills` 的加载语义。首轮采用候选脚本资产而不是自动脚本执行，以便后续加入静态分析、人工审查和资源安装流程。

### 5. 计划先校验再确认，Runtime 不调用模型

Planner 负责意图解析、检索、计划草拟、Skill 草拟和解释缺口；确定性 Validator 检查引用、参数、依赖、操作绑定、设备能力、风险和状态。只有计划及其全部 Skill 修订都处于人工批准状态，`LabRunService.startRun` 才能成功。

Runtime 从已批准计划生成 `ExecutionGraph`，运行时锁定计划、Skill 修订和输入快照。Runtime 只调用注册的 Operation Executor，不读取原始 SOP、不直接调用 LLM、不接受任意设备命令。选择这种分离，是为了让模型的概率性输出不进入不可逆实验动作；代价是首轮需要更完整的确认和阻塞状态。

### 6. 操作执行器采用判别标签注册表

首轮实现 `device`、`human` 和 `approval` 执行器；`script` 和 `api` 只实现资源清单、参数校验和未安装时的明确阻断。每个执行器接收 run ID、step ID、Skill revision、标准化参数、幂等键和取消信号，返回结构化 Observation 或明确错误，不能自行推进后继步骤。

设备操作必须经过 `LabDeviceService`，由 Device Provider 管理能力、健康、租约、执行、停止和释放。Mock Provider 提供可配置设备、结构化回执、幂等和故障注入；真实设备接入留给后续 Provider。

### 7. 领域权威数据、Session 审计和实验缓存分工

原始资料和大产物保存在不可变文件存储；知识元数据和 Skill 修订由对应 Provider 的 SQLite 负责；计划、运行状态和步骤结果由 Runtime 负责；模型可见事件、人工确认和运行时间线写入 Session；当前实验缓存通过 `ctx.storage` 保存可重建投影、检索引用、Skill 快照和产物引用。

缓存不是第二事实来源。Runtime 发生状态变化时先写领域事件/权威记录，再更新缓存投影；缓存损坏时从事件、数据库和文件引用重建。这样既能支持 Agent 后续操作读取当前实验上下文，也避免缓存与运行状态长期分叉。

### 8. 工具按阶段暴露，Web Consumer 只做最小证明

知识工具负责导入、状态、搜索、冲突和事实确认；规划工具负责实验登记、计划草拟与校验、Skill 草拟与校验、人工审批请求和设备只读查询；执行工具负责启动、状态、人工步骤确认、停止和报告。工具输出使用结构化结果并将模型可见内容记录到 Session。

工具不是独立的 Agent 配置入口。`tool-lab-knowledge` 和 `tool-lab` 必须作为普通 Harness 工具 Consumer，通过现有 `ctx.tools.register()` 注册到对应 Agent scope，并由 Agent preset 的组合决定可见范围；不得在实验包中复制一套工具注册表或 prompt 组装器。

Web Consumer 先实现资料状态、计划审查、步骤确认、设备状态、运行时间线和最终反馈的最小入口，不能把 HTML demo 的静态流程转成运行时事实。UI 只通过 Consumer/事件读取状态，不直接访问数据库或设备。

### 8.1 复用 Harness Agent 配置与基础能力

实验系统复用 DeepSeek Harness 的 Agent 配置和运行时，不新增 `LabAgentService`、实验专用模型配置、第二套 Agent loop 或并行会话协议。接入规则如下：

- Agent 创建和恢复使用 `ctx.agents.create()` / `ctx.agents.resume()`；模型路由只使用已有 `agentOptions.provider`、`agentOptions.model` 和 `agentOptions.maxTokens`，由现有 LLM adapter 和部署配置解析。
- Agent 能力通过创建时的 `setup(agentCtx)` 组装；需要实验工具时，由现有 `ctx.agentPresets.mount(agentCtx, presetId)` 或已有 preset 组合提供，不在 Runtime 内部创建 Agent。
- 规划工具和执行工具使用 `ctx.tools.register()` 的既有 schema、执行、取消、超时、审计和展示协议；按阶段限制使用现有 `ctx.tools.restrict()` 或 preset scope 机制完成。
- 模型可发现的操作指导继续使用 `ctx.skills`；`LabSkillService` 只负责实验动作定义、版本和执行绑定。两者的桥接只能投影已批准内容，不能替换 Harness Skill 加载语义。
- 计划确认、风险操作和人工步骤复用 `ctx.approval.request()` 及现有 answerer/policy；不新增实验专用审批总线。
- 实验审计和模型可见状态复用 Session 事件与 `ctx.sessions`；实验缓存复用 `ctx.storage` 的可重建投影能力。Provider 自有 SQLite 只保存其领域权威数据，不作为通用 Agent 存储替代品。
- 文档解析、候选资源和已安装操作需要子进程或沙箱时，复用 `ctx.subprocess` 及既有沙箱能力；不让模型直接获得任意 shell、设备命令或 API 客户端。

因此，实验包只补充实验领域 Service Definition、Provider、Consumer 和工具 schema；Agent 的模型、preset、工具作用域、Skill 目录、审批、会话、存储和进程能力均由 Harness 现有配置决定。首轮组合测试必须覆盖“使用既有 Agent preset 创建 Agent → 看到实验工具 → 调用实验服务 → 事件写入现有 Session”的路径。

### 9. 采用五个纵向增量而不是先横向铺满基础设施

- I0：基线、领域对象、状态机、工具/事件协议和 Mock 组合骨架。
- I1：资料导入、解析状态、SQLite 元数据、FTS/Embedding 检索和引用。
- I2：Lab Skill 生命周期、资源校验、设备服务和 Mock Device。
- I3：Agent 意图解析、计划校验、Skill 草拟、人工确认和计划锁定。
- I4：ExecutionGraph、执行器、结果验证、停止、报告、实验缓存和端到端闭环。

每个增量都必须有窄测试和至少一个真实组合测试，避免等到所有基础模块完成后才发现服务接口不适配 Agent 或 Web Consumer。

## Risks / Trade-offs

- [文档解析和向量依赖增加运行环境复杂度] → 通过可配置解析模块、明确失败状态和 Provider 内窄 Adapter 隔离；首轮可使用稳定的关键词检索加可选 Embedding 实现。
- [混合检索可能返回与实验上下文不匹配的内容] → 先做权限/有效状态/实验上下文硬过滤，结果必须带版本和页块引用，并把低置信度与冲突交给人工确认。
- [声明式 Skill 无法覆盖真实设备复杂动作] → 首轮只验证设备、人工和审批执行器；复杂硬件脚本/API 作为已安装资源逐步增加 Provider。
- [人工确认增加流程时延] → 将确认点集中在计划、Skill 激活、风险操作和人工结果，未确认状态可恢复且不会触发设备命令。
- [Session、SQLite、缓存存在状态不同步风险] → 明确权威数据归属，运行实例锁定快照，缓存只做可重建投影，并为重建和幂等编写测试。
- [首轮包数量较多导致组合成本上升] → 使用纵向增量和最小 Mock Provider，避免提前实现远程部署、真实硬件和通用公共抽象。

## Migration Plan

1. 先按 I0 建立 experimental 包骨架、领域类型、事件和组合夹具，不修改默认 profile。
2. 按 I1–I4 逐步启用本地 Provider、工具和最小 Web Consumer；每个增量通过 focused tests、真实组合测试和对应 snapshot 后再进入下一增量。
3. 使用 Space ATAC CSV、流程确认表、PDF 与鼠脑空间转录组建立测试输入矩阵，验证资料切换后运行时协议不变。
4. 发生回滚时从 bundle 组合中移除实验包；原始资料、旧 demo 和 Harness 默认能力不受影响。首轮数据库格式不承诺外部兼容，Provider 负责删除或重建其本地索引。
5. 首轮验收后再根据第二个真实设备或第二个知识 Provider 的需求，决定是否提升 Embedding、设备协议或实验领域类型为正式公共能力。

## Open Questions

- 首轮运行入口采用现有 ACP/headless 示例组合还是新增独立实验 Web 入口，需要在 I0 组合测试中确认；两者都应复用同一服务和工具。
- 默认 Embedding Adapter 是否使用本地模型、已配置的 DeepSeek 服务或仅启用关键词检索，需要结合运行环境依赖和数据安全要求确定；这不改变 Knowledge Service 接口。
- `api` 与 `script` 资源的安装、签名和静态审查流程属于后续增量；第一阶段只要求未安装资源明确阻断，不能自动执行。
