## Context

当前 `@deepseek-ai/dsh-experimental-lab-mvp-web` 只有只读 `snapshot()`，实验 bundle 也没有把实验能力挂到默认 Web profile。现有 DeepSeek Harness 已提供 `dsh.client` 动态浏览器模块、React/Slot UI、Connection、Agent preset、工具、审批、Session 和 Storage；实验领域已经提供 Knowledge、Planning、Skill、Device、Runtime Service 以及 Mock Provider。需要在这些能力之上增加一个可人工操作的首轮工作台。

页面的职责是让开发者能够从资料和实验需求开始，人工检查 Agent 生成的计划和步骤，再驱动 Mock Device 完成一次可审计的闭环。页面不直接读取 Provider 数据库、不直接控制设备，也不把 demo 中的 Space ATAC 或鼠脑空间转录组资料写入运行时代码。

## Goals / Non-Goals

**Goals:**

- 在 opt-in 的实验 Web overlay 中提供资料、需求、计划、确认、执行、验证和反馈六个可操作阶段。
- 让页面动作通过类型化的 Node Facade 调用现有实验 Service，并让所有有副作用的动作经过现有工具、审批和状态门禁。
- 复用 DeepSeek Harness 的 Agent 配置、preset、LLM adapter、Session、Storage 和 `dsh.client` 加载机制。
- 提供无模型消耗的本地演示路径和用户主动触发的 Agent 规划路径，二者使用相同的计划校验和执行门禁。
- 让每个生成步骤显示引用、Skill 修订、设备/人工操作类型、参数、前置条件和确认状态。
- 通过 keyless 单元、Host/Client 组合和浏览器流程测试证明页面不是静态状态模拟。

**Non-Goals:**

- 不修改默认 Harness Web profile，不改变通用 `agent-loop`、公开 API RPC map 或既有会话 UI 的语义。
- 不实现真实硬件、OCR、生产权限体系、远程调度或任意脚本/API 执行。
- 不把 HTML demo 直接迁移成最终页面，也不把任何示例资料、步骤、参数或设备名称硬编码到组件中。
- 不在浏览器端创建实验 Agent、访问 SQLite、执行 Skill 或保存权威实验状态。

## Decisions

### 1. Node Facade 与浏览器模块分离

继续扩展现有 `lab-mvp-web` Node half，使其提供快照和命令 Facade；新增符合 `packages/client/AGENTS.md` 约定的动态浏览器 UI 包，浏览器包只依赖类型化 HTTP 客户端和 Slot/UI 基础包。Node half 负责 Cordis Service 注入、参数校验和领域 Service 调用，浏览器 half 负责状态模型和渲染。

这样可以保留现有实验 bundle 的能力组合，不让浏览器包依赖实验 Provider；也避免把实验状态塞进通用会话组件。UI 包通过 `dsh.client` 的 `./client` 导出和 Web bundle roster 加载，Node half 的空 `apply` 只承担 Loader 组合，不在浏览器重复安装服务。

### 2. 使用实验命名空间 HTTP Facade，不扩张通用 API

在 `webServer` 上注册实验专用 `/api/lab` 前缀路由，使用 JSON 请求/响应和固定的命令判别字段。命令包含读取快照、导入资料、检索知识、提交需求、生成/校验计划、确认计划步骤、启动/停止运行、确认人工步骤、验证结果和生成报告。每个命令对应一个窄的输入输出类型，未知命令、无效 JSON、错误方法和非法状态返回稳定错误码。

首轮不把实验命令加入通用 API RPC map，因为实验包仍是 `experimental` opt-in 能力，扩大通用 RPC 会把实验领域带入默认 API 依赖图。路由只随实验 overlay 激活，并沿用 Web server 的生命周期注册和 loopback 部署约束；后续若实验能力进入正式 API，再单独设计公共 RPC。

### 3. Agent 规划复用 Harness 现有配置

“Agent 规划”命令由 Node Facade 调用现有 Agent/preset 组合或现有规划工具 Consumer。模型、provider、model、maxTokens、工具作用域、审批策略和 Session 均来自已有 Harness 配置；实验包不创建第二个 Agent loop、不新增模型配置中心，也不把 API key 发送到浏览器。

规划输出必须先通过现有 Planning Service 的确定性校验，再保存为非执行计划。无模型演示模式只使用显式注入的测试数据或已有本地 Provider 结果生成结构化计划，不伪装成模型结果；两种模式之后都走相同的引用、Skill、设备能力和确认门禁。

### 4. 使用轮询快照完成首轮状态同步

浏览器通过 `get-snapshot` 读取权威状态并在命令完成后刷新；运行中以受控间隔轮询运行状态，不新增 WebSocket/SSE 协议。快照由 `LabMvpWebService` 从 Knowledge、Planning、Device、Runtime 和报告服务组装，必要的 Session/cache 信息只作为投影返回。

轮询足以验证首轮人工操作闭环，且能复用现有 HTTP carrier；当运行事件模型和客户端订阅需求稳定后，再单独评估事件推送，不在本变更提前建设并发连接生命周期。

### 5. UI 采用页面级工作台和单向状态流

浏览器状态集中在 `LabWorkbenchStore`：快照、当前实验、当前阶段、请求草稿、待确认步骤、命令 pending/error 和最后一次操作结果由一个 store 管理。页面组件只通过 store 读取和发出命令，不持有数据库对象或 Provider 引用。阶段导航显示真实状态并允许返回审查，但只有领域状态满足条件时才能继续执行。

视觉上复用 demo 的深色边栏、暖色内容区和琥珀色重点状态作为参考；组件文案、状态徽标和数据行由运行时状态驱动。缺失资料、冲突、解析失败、未安装 Skill、无设备和模型不可用都显示为可操作的阻断原因，不通过额外兜底文案掩盖状态。

### 6. 测试数据与真实资料解耦

demo CSV、流程确认表、PDF 和鼠脑空间转录组只作为测试输入。测试/开发 overlay 可以提供显式的“加载测试数据”夹具，但夹具位于测试或开发组合，不进入领域服务和生产 UI 组件。页面默认显示当前数据库和设备状态；没有数据时显示空状态并引导用户导入或登记需求。

## Risks / Trade-offs

- [实验 Facade 可能逐渐变成第二套领域服务] → Facade 只编排现有 Service，禁止写入 Provider 数据库和重复实现计划/运行规则；每个命令都保持窄接口并保留领域错误。
- [轮询导致运行状态有短暂延迟] → 命令完成后立即刷新，运行中使用可配置的轮询间隔，并在停止/失败后立即结束轮询；事件推送留作后续变更。
- [Agent 输出仍可能缺少引用或参数] → Facade 不直接接受模型文本，先通过结构化输出校验和现有计划验证；缺口进入非执行状态，页面显示具体字段。
- [动态客户端包增加 Web roster 和构建配置] → 按现有 `dsh.client`、`./client`、module-table 和 Slot 规则接入，并增加模块加载组合测试，避免只在运行时发现 bundle 缺失。
- [首轮 UI 仍依赖 Mock Device] → 页面明确展示 Provider/设备来源和能力状态；真实硬件只作为后续可替换 Provider，不在 UI 中假设具体设备。

## Migration Plan

1. 先扩展 `lab-mvp-web` Facade、DTO 和 `/api/lab` 路由，保持只读 `snapshot()` 兼容，并为每个命令补充 Host 组合测试。
2. 新增浏览器工作台包、Slot/roster 配置和 overlay 组合；先接入只读快照，再逐个接入导入、规划、确认、执行和反馈命令。
3. 将无模型演示夹具放入 keyless 测试/开发组合，确认页面使用真实 Service 状态后，再在显式配置下验证 Agent 规划。
4. 运行客户端构建、Host/Client 组合、keyless 浏览器流程和实验领域 focused tests；所有通过后才把该 overlay 作为第一阶段手工测试入口。
5. 回滚时从 Web overlay 和 bundle roster 移除浏览器包及路由；实验 Provider 数据和既有 Harness Web profile 不受影响。

## Open Questions

- 首轮工作台是挂到现有 Web shell 的一个 root Slot，还是由页面级 route/overlay 独占工作区，需要根据当前 Web shell 可用 Slot 在实现阶段选择；两者都不改变 Facade 协议。
- Agent 规划命令具体使用既有哪个 preset，需要在当前配置中确认可用的 preset 名称；如果没有实验 preset，先复用工具作用域创建最小组合，不新增 Agent 类型。
- 首轮是否允许从浏览器上传大文件，需要在实现时遵守现有 request body 限制；超出限制时返回明确错误，不引入大文件传输协议。
