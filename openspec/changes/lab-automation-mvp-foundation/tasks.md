## 1. I0 基线与领域骨架

- [x] 1.1 阅读并核对 `docs/architecture.md`、`packages/AGENTS.md`、`packages/experimental/AGENTS.md` 与第一轮敏捷开发规划，登记本变更的实现边界
- [ ] 1.2 创建 experimental 包骨架和 opt-in bundle，确保正式包不依赖实验包且默认 profile 不发生变化（部分完成：已有实验包和开发 Overlay；待补齐 `lab-runtime-local`、`tool-lab`、`lab-mvp-web`）
- [x] 1.3 在 `lab-domain` 定义 branded ID、单位量、领域判别联合、状态枚举和协议校验结果
- [x] 1.4 定义 Knowledge、Lab Skill、Device、Runtime 的 Service Definition、Provider 配置和生命周期错误
- [ ] 1.5 定义模型可见的 Session 事件、计划/确认/运行时间线事件和实验缓存投影字段（部分完成：事件类型已定义，当前仅有知识确认和计划提案实际写入；待补齐实验请求、审批、运行观察和缓存投影）
- [ ] 1.6 创建 Mock Provider 的真实 Cordis 组合测试夹具，证明四个能力接缝可以加载并按缺失配置失败（部分完成：已有 Service Definition/Mock Device 基础组合测试；待补齐四个 Provider 的完整组合和缺失配置失败断言）
- [x] 1.7 核对并固化 Harness Agent、Agent preset、LLM、Tool、Skill、Approval、Session、Storage 和 Subprocess 的复用边界，不新增实验专用 Agent 配置或 Agent loop

## 2. I1 知识录入与 RAG

- [ ] 2.1 实现不可变原始资料登记、内容哈希、文档版本和解析/索引状态持久化（部分完成：原始内容、哈希、版本和基础状态已持久化；待补齐来源 metadata 和明确的解析/索引阶段流转）
- [ ] 2.2 接入配置化文档解析模块，规范化 DocumentBlock、页码/区块引用、表格和解析失败状态（部分完成：已有文本/CSV 解析和可配置 PDF 解析接缝；待补齐表格/页码语义和真实 PDF 验证）
- [x] 2.3 实现 Knowledge Provider 自有 SQLite 元数据、FTS5 索引和索引重建命令
- [x] 2.4 实现可选 EmbeddingAdapter、结构化过滤、关键词/向量统一重排和带引用检索结果
- [ ] 2.5 实现事实确认、冲突记录、未确认状态和引用完整性校验（部分完成：确认、冲突和未知引用校验已存在；待阻断 OPEN 冲突事实被直接确认，并补齐冲突关联过滤）
- [x] 2.6 暴露知识录入、状态、检索、冲突和事实确认工具，并新增 Agent scope 组合测试
- [ ] 2.7 用 Space ATAC CSV、流程确认表、至少一个 PDF 和鼠脑用例输入完成资料切换测试，验证运行时代码无固定资料内容

## 3. I2 Lab Skill 与设备接入

- [ ] 3.1 实现声明式 LabSkillDefinition、SkillRevision、操作绑定、资源引用和参数约束校验（部分完成：已有 Skill 草案、修订和操作绑定；待补齐输入/输出、适用条件、参数约束、完成条件和失败策略）
- [ ] 3.2 实现 `DRAFT → VALIDATED → HUMAN_APPROVED → ACTIVE → RETIRED` 状态机及审批审计
- [x] 3.3 实现已激活 Skill 到 Harness `ctx.skills` 的说明桥接，并保持两类 Skill 的职责和接口语义分离
- [ ] 3.4 实现候选脚本/API 资源登记和未安装资源阻断，覆盖模型输出不可直接执行的测试
- [x] 3.5 实现 LabDevice Service、Capability/Lease/Receipt/Stop 类型及 Mock Device Provider
- [ ] 3.6 为设备租约冲突、幂等键、健康检查、停止和通信失败补充 focused tests

## 4. I3 Agent 规划与人工确认

- [x] 4.1 实现实验请求、目标/样本/约束/预期产物和缺失信息领域对象
- [ ] 4.2 基于现有 Agent preset/loader 和 `setup(agentCtx)` 组装阶段化 Knowledge、Planning、Approval、Device capability 工具；复用 `ctx.tools` 的 schema、scope、取消和审计语义，不新增 Agent 配置中心
- [ ] 4.3 实现 Planner 的检索上下文组装、引用/假设/缺口输出和声明式 Skill 草拟入口（部分完成：已有检索上下文、引用/缺口和结构化草案工具；待补齐真实 Agent 意图到计划审查组合和计划持久化）
- [ ] 4.4 实现确定性计划校验：依赖、单位、参数、引用、设备能力、操作绑定和 Skill 状态（部分完成：已有依赖、单位、输入、设备、操作和 Skill 状态基础校验；待补齐计划状态、来源引用一致性和完整参数约束校验）
- [ ] 4.5 实现计划与 Skill 的人工确认、拒绝/修改后的新修订和审批事件
- [ ] 4.6 实现计划批准后的 plan revision 锁定，并证明未批准计划不能创建可运行实例
- [ ] 4.7 增加从用户意图到计划审查的真实 Harness 组合测试和 keyless snapshot

## 5. I4 受控执行、验证与反馈

- [ ] 5.1 实现 ExecutionGraph，从批准的 plan revision 和 Skill snapshot 生成不可变运行输入
- [ ] 5.2 实现 `device`、`human`、`approval` Operation Executor Registry 及取消、幂等和结构化 Observation
- [ ] 5.3 实现 Lab Runtime 的运行、步骤推进、等待确认、安全停止、失败阻断和终态转换
- [ ] 5.4 实现设备执行路径，确保所有设备动作经过 Lab Device Service 且不接受任意模型命令
- [ ] 5.5 实现结果验证器、证据引用、失败策略、重规划请求、报告和最终反馈
- [ ] 5.6 实现 Session 事件、SQLite 权威记录与 `ctx.storage` 实验缓存投影的重建路径
- [ ] 5.7 实现最小 Web Consumer：资料状态、计划/Skill 审查、步骤确认、设备状态、运行时间线和反馈
- [ ] 5.8 通过端到端真实组合测试回放“录入 → 召回 → 规划 → 确认 → 执行 → 验证 → 反馈”闭环

## 6. 首轮验收与交付

- [ ] 6.1 执行受影响包的 focused tests、真实组合测试、keyless snapshot、typecheck 和 lint
- [ ] 6.2 验证 OpenSpec change、文档链接、任务与实际包边界一致，并更新第一轮敏捷开发规划的状态
- [ ] 6.3 记录首轮未覆盖项：真实设备 Provider、脚本/API 安装审查、远程 RAG、跨进程恢复和生产权限
- [ ] 6.4 输出第一轮演示说明、测试数据矩阵、已知限制和下一阶段候选 backlog
