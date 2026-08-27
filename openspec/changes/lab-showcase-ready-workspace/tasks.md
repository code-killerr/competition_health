## 1. 收敛现有能力并建立统一原型基线

- [ ] 1.1 对照当前代码重新核验 `pdf-knowledge-parser-mvp`、`pdf-docling-ingestion-mvp` 与 `lab-harness-native-workspace` 的任务状态，撤销与事实不符的完成标记，并记录本变更实际依赖的未完成项。
- [x] 1.2 完成可被 Knowledge、Project 与 Planning 共同使用的公开能力测试夹具，证明浏览器侧只消费公开记录和命令，不直接访问 Provider 或存储实现。
- [x] 1.3 将独立 Knowledge workspace contribution 挂载到现有 `examples/lab-web` Harness 布局，替换实验工作台中的 Knowledge 占位视图和哈希导航。
- [x] 1.4 增加无模型密钥的组合测试：导入来源、等待 READY 版本、加入 Project、检索确认引用并生成可人工审阅的 Plan。
- [ ] 1.5 完成三个前置变更各自适用的测试、文档与 OpenSpec 核验，在前置状态与实现一致后再开始统一原型的数据模型改造。

## 2. 建立可持续的 Project、Experiment、Run 与 Artifact 数据关系

- [ ] 2.1 扩展 LabProject 持久化模型和公开视图，保存可选的 branded Workspace ID；由 Host 生成 Project ID，并提升所属预发布存储 schema 版本。
- [ ] 2.2 增加 Project-owned Experiment 与 SessionExperimentLink 记录、状态转换、持久化服务和事件，覆盖创建、继续、审阅与派生关系。
- [ ] 2.3 将 Runtime 的单 Run 状态改为 Experiment 下有序、不可变的 Run 集合，保存 Plan 修订、启动 Session、重试来源、时间、执行图、观察和反馈，并限制同一 Experiment 仅有一个非终态 Run。
- [ ] 2.4 增加 Artifact manifest 记录和存储接口，保存 Run、类型、显示名、授权位置、摘要、媒体类型、大小和创建时间，并让观察与报告引用 Artifact ID。
- [ ] 2.5 为跨 Session 可见的 Project、Experiment、Run 与 Artifact 变化补齐 Session 事件或可重建投影；同步 TypeScript 与 Python SDK 的事件输出和预期结果。
- [ ] 2.6 为新关系、生命周期、失败时序与预发布 schema 拒绝行为增加聚焦单元和持久化测试，并撰写同一 PR 内的 proposed Agent Note。

## 3. 扩展统一 Facade 与 Agent 可用命令

- [ ] 3.1 扩展 `/api/lab` Project 命令，支持生成式创建、列表、打开、归档、关联 Workspace、显式 attach/detach Session，并在 cwd 不匹配时返回可操作错误而不改变 Session cwd。
- [ ] 3.2 增加 Experiment 创建、列表、打开、派生、设为当前上下文及 Session 关系命令，所有参数和返回值使用 branded ID 与 typed records。
- [ ] 3.3 扩展 Run 命令，支持列表、打开、启动、停止、重试和同一 Experiment 内比较；重试必须创建新 Run 并保留来源。
- [ ] 3.4 增加 Artifact 与 Evidence 列表、预览元数据、打开或下载授权命令，不向浏览器暴露任意本地文件访问或 HTML 执行能力。
- [ ] 3.5 更新 Agent 工具和上下文组装：只注入当前 Project 已批准的 Knowledge、设备、Experiment 与 Plan 修订；创建 Experiment、批准 Plan 和启动 Run 继续要求明确的人类确认。
- [ ] 3.6 为 Facade、权限失败、缺失 capability、cwd 冲突、并发 Run 和跨 Project 上下文隔离增加协议与组合测试。

## 4. 将 `examples/lab-web` 改造成唯一产品原型入口

- [x] 4.1 为 `examples/lab-web` 提供一个有文档的启动命令和完整 patch composition，在同一 Host 中装配 sidebar、workspace、conversation、Knowledge、Project、Planning、Device、Runtime 与 Evidence 能力。
- [x] 4.2 通过现有 Harness layout slots 注册 Projects、Knowledge 和 Devices 全局导航，删除产品流程对实验工作台内部哈希链接的依赖。
- [x] 4.3 实现统一 Project shell：稳定 Project 头部及 Overview、Conversations、Experiments、Runs、Evidence 页面，并在切换页面后恢复有效的 Project 和 Session 上下文。
- [ ] 4.4 复用现有 WorkspaceBrowser 和 Session 导航实现 Project 创建、Workspace 选择、新建 Project Session、匹配 Session attach/detach 与不可用 Workspace relink 流程。
- [ ] 4.5 在现有 conversation composer 上方增加紧凑上下文条，显示 Project、Workspace 目录、Experiment、已选 Knowledge、设备和临时附件，并区分 Project 继承范围与 Session 本地范围。
- [x] 4.6 将全部可见文案放入 locale dictionaries，复用现有 token 和 primitives，完成键盘焦点、语义状态、窄桌面/平板单栏回退与明确返回路径。

## 5. 把 Knowledge 与对话规划接入同一连续流程

- [ ] 5.1 完成 Knowledge 页面中的来源导入、解析状态、失败重试、检索和 SOP 审阅，并从 Project 上下文提供“加入/移出当前 Project”操作。
- [x] 5.2 用可选择的 READY 来源记录替换手输文档 ID、版本 ID 等主流程控件；保留必要的开发诊断信息但不让 raw JSON 成为唯一表示。
- [ ] 5.3 在现有 conversation renderer 中实现 Agent 澄清、Experiment 建议、带引用 Plan、修订差异、验证结果和审批状态卡片，不创建第二套聊天界面。
- [ ] 5.4 让 Plan、对话和报告中的引用跳转到同一 Knowledge source/version/location 详情，并在 Knowledge contribution 不可用时保留引用身份和明确状态。
- [ ] 5.5 增加 Project Overview 的目标、Workspace、当前工作、待人工操作、最近 Evidence 与 capability 状态摘要，所有摘要链接到其权威详情页。

## 6. 完成 Experiment、Run、Evidence 与报告展示

- [ ] 6.1 实现 Experiment 列表和详情，展示目标、来源 Session、派生关系、Plan 修订、Runs、Evidence 和关联 Conversations，并提供在新 Session 中继续的入口。
- [ ] 6.2 实现 Run 列表和详情，结构化展示 Overview、Parameters、Steps、Evidence、Logs 与 Timeline；启动、确认步骤、停止和重试动作遵循当前审批与 Runtime 状态。
- [ ] 6.3 实现同一 Experiment 内两个已完成 Run 的比较，展示参数、状态、耗时、观察和 Artifact 元数据差异，不生成不存在的指标。
- [ ] 6.4 实现 Project Evidence 与 Artifact 详情，按 Experiment、Run、步骤和类型分组，复用安全文本、JSON、图片预览及 Host 授权的打开/下载动作。
- [ ] 6.5 实现证据支持的报告视图，保留 Plan 修订、Run、Observation、Artifact、操作者与时间引用，并对缺失、失败或模拟结果作真实标识。
- [x] 6.6 删除已被上述页面取代的七阶段主导航、手输 Project/Experiment ID 和浏览器本地 JSON 主流程；独立 HTML 演示仅保留为不参与产品导航的视觉参考。

## 7. 构建可重复演示与验收证据

- [x] 7.1 配置确定性的 keyless Knowledge、模型和设备 Providers，使其通过真实 Facade、Session 日志、Project、审批、Runtime 与浏览器 contributions 产生演示数据，并在 UI 中明确标记演示环境。
- [ ] 7.2 增加一个浏览器端到端验收：启动同一个 `examples/lab-web`，从普通对话或 New Project 进入，选择 Workspace，导入并选择来源，创建带引用 Experiment/Plan，批准并执行 Run，最后查看 Evidence 和报告。
- [ ] 7.3 验收测试在跨 Projects、Knowledge、Conversation、Experiment、Run、Evidence 页面跳转时断言相同的 Host-backed ID 和状态，禁止使用页面专属浏览器数据副本或再次手输 ID。
- [ ] 7.4 通过真实 runnable example 增加或更新 keyless snapshot，覆盖关键模型可见输入、审批、运行结果和报告输出。
- [ ] 7.5 在明确配置凭据与本地 Docling runtime 时运行同一 UI 流程的 opt-in smoke；缺少条件时必须报告为 skipped，不得回退为浏览器预置结果。
- [ ] 7.6 在常用桌面宽度、窄桌面/平板宽度和纯键盘路径完成浏览器验证，并保存一组稳定截图或演示 GIF 作为展示手册素材。

## 8. 收尾、文档与发布前核验

- [ ] 8.1 更新受影响包的 README、JSDoc、架构/开发文档和中英文站点映射，说明单一原型入口、对象关系、启动方式、keyless/real 模式和已知非生产能力。
- [x] 8.2 编写一份不依赖开发者内部术语的演示手册，包含准备条件、单命令启动、五至十分钟完整讲解路径、预期状态和故障恢复入口。
- [ ] 8.3 运行与改动面匹配的聚焦测试、浏览器验收、snapshot、TypeScript/Python SDK 投影检查、typecheck、build、hygiene、文档与 OpenSpec 校验，并记录实际运行命令。
- [ ] 8.4 从干净的 keyless 状态完成一次计时演练，确认一个应用、一条连续状态链和一个报告结果可独立展示；随后在可用环境执行 opt-in real-capability 演练。
- [ ] 8.5 核对所有空态、加载态、失败态、capability 缺失态和模拟标识，确认没有把 mock、skipped、浏览器预置或未实现动作呈现为真实生产能力。
- [ ] 8.6 仅在实现、文档、Agent Note、演示素材和全部适用验证一致后，将本变更交给 `openspec-verify-change` 验收并准备归档。
