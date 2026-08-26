## 1. I0 基线与领域骨架

- [x] 1.1 阅读并核对 `docs/architecture.md`、`packages/AGENTS.md`、`packages/experimental/AGENTS.md` 与第一轮敏捷开发规划，登记本变更的实现边界
- [x] 1.2 创建 experimental 包骨架和 opt-in bundle，确保正式包不依赖实验包且默认 profile 不发生变化
- [x] 1.3 在 `lab-domain` 定义 branded ID、单位量、领域判别联合、状态枚举和协议校验结果
- [x] 1.4 定义 Knowledge、Lab Skill、Device、Runtime 的 Service Definition、Provider 配置和生命周期错误
- [x] 1.5 定义模型可见的 Session 事件、计划/确认/运行时间线事件和实验缓存投影字段
- [x] 1.6 创建 Mock Provider 的真实 Cordis 组合测试夹具，证明四个能力接缝可以加载并按缺失配置失败
- [x] 1.7 核对并固化 Harness Agent、Agent preset、LLM、Tool、Skill、Approval、Session、Storage 和 Subprocess 的复用边界，不新增实验专用 Agent 配置或 Agent loop

## 2. I1 知识录入与 RAG

- [x] 2.1 实现不可变原始资料登记、内容哈希、文档版本和解析/索引状态持久化
- [x] 2.2 接入配置化文档解析模块，规范化 DocumentBlock、页码/区块引用、表格和解析失败状态（已补齐 CSV/TSV 表格行列语义、解析失败状态、页码/标题引用持久化和本地 PDF 字节验证；生产 PDF 文本引擎仍由配置化 DocumentParser 提供）
- [x] 2.3 实现 Knowledge Provider 自有 SQLite 元数据、FTS5 索引和索引重建命令
- [x] 2.4 实现可选 EmbeddingAdapter、结构化过滤、关键词/向量统一重排和带引用检索结果
- [x] 2.5 实现事实确认、冲突记录、未确认状态和引用完整性校验
- [x] 2.6 暴露知识录入、状态、检索、冲突和事实确认工具，并新增 Agent scope 组合测试
- [x] 2.7 用 Space ATAC CSV、流程确认表、至少一个 PDF 和鼠脑用例输入完成资料切换测试，验证运行时代码无固定资料内容（已覆盖本地 PDF 资料集、CSV/流程确认角色、鼠脑文本输入和按文档过滤的检索）

## 3. I2 Lab Skill 与设备接入

- [x] 3.1 实现声明式 LabSkillDefinition、SkillRevision、操作绑定、资源引用和参数约束校验
- [x] 3.2 实现 Lab Skill 生命周期状态机及审批审计
- [x] 3.3 实现已激活 Skill 到 Harness `ctx.skills` 的说明桥接，并保持两类 Skill 的职责和接口语义分离
- [x] 3.4 实现候选脚本/API 资源登记和未安装资源阻断，覆盖模型输出不可直接执行的测试（已加入候选/安装资源注册表，Skill 校验阻断未安装资源，Runtime 保持脚本/API 非可执行）
- [x] 3.5 实现 LabDevice Service、Capability/Lease/Receipt/Stop 类型及 Mock Device Provider
- [x] 3.6 为设备租约冲突、幂等键、健康检查、停止和通信失败补充 focused tests（Mock Device 已覆盖配置化健康状态、租约冲突、幂等、停止/释放和通信失败）

## 4. I3 Agent 规划与人工确认

- [x] 4.1 实现实验请求、目标/样本/约束/预期产物和缺失信息领域对象
- [x] 4.2 基于现有 Agent preset/loader 和 `setup(agentCtx)` 组装阶段化 Knowledge、Planning、Approval、Device capability 工具；复用 `ctx.tools` 的 schema、scope、取消和审计语义，不新增 Agent 配置中心（补齐计划/Skill 审核工具，并覆盖现有及后续 Agent scope）
- [x] 4.3 实现 Planner 的检索上下文组装、引用/假设/缺口输出和声明式 Skill 草拟入口（补齐提案保存、重新校验、Web 审核读取和真实 Harness 组合测试）
- [x] 4.4 实现确定性计划校验：依赖、单位、参数、引用、设备能力、操作绑定和 Skill 状态（补齐 DRAFT 状态门禁、必需来源引用与计划/步骤引用一致性、Skill 参数约束和稳定字段级错误；覆盖领域与规划 Provider 测试）
- [x] 4.5 实现计划与 Skill 的人工确认、拒绝/修改后的新修订和审批事件（补齐 Skill 三段式审核、计划状态更新、拒绝原因、supersedesPlanId 修订血缘和 Session 审计事件）
- [x] 4.6 实现计划批准后的 plan revision 锁定，并证明未批准计划不能创建可运行实例（Runtime 仅接受精确的已批准 planId；启动时暴露 LOCKED 状态和冻结 ExecutionGraph，新增未批准/错误修订回归测试）
- [x] 4.7 增加从用户意图到计划审查的真实 Harness 组合测试和 keyless snapshot

## 5. I4 受控执行、验证与反馈

- [x] 5.1 实现 ExecutionGraph，从批准的计划修订和 Skill snapshot 生成不可变运行输入
- [x] 5.2 实现 device、human、approval Operation Executor Registry 及取消、幂等和结构化 Observation
- [x] 5.3 实现 Lab Runtime 的运行、步骤推进、等待确认、安全停止、失败阻断和终态转换
- [x] 5.4 实现设备执行路径，确保所有设备动作经过 Lab Device Service 且不接受任意模型命令
- [x] 5.5 实现结果验证器、证据引用、失败策略、重规划请求、报告和最终反馈
- [x] 5.6 实现 Session 事件、SQLite 权威记录与 `ctx.storage` 实验缓存投影的重建路径
- [x] 5.7 实现最小 Web Consumer：资料状态、计划/Skill 审查、步骤确认、设备状态、运行时间线和反馈
- [x] 5.8 通过端到端真实组合测试回放“录入 → 召回 → 规划 → 确认 → 执行 → 验证 → 反馈”闭环

## 6. 首轮验收与交付

- [x] 6.1 执行受影响包的 focused tests、真实组合测试、keyless snapshot、typecheck 和 lint（focused tests 34 项通过；typecheck 和 lint 通过）
- [x] 6.2 验证 OpenSpec change、文档链接、任务与实际包边界一致，并更新第一轮敏捷开发规划的状态（OpenSpec、文档链接、模块图、相关双语配对检查通过；仓库全量 doc-sync 仍受既有未配对文档影响）
- [x] 6.3 记录首轮未覆盖项：真实设备 Provider、脚本/API 安装审查、远程 RAG、跨进程恢复和生产权限
- [x] 6.4 输出第一轮演示说明、测试数据矩阵、已知限制和下一阶段候选 backlog（已补充 `examples/lab-agent/README.md` 及中文说明）
