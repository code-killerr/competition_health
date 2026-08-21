## Why

现有页面以 W1–W7、数字员工、模板编号和设备适配等内部技术概念为主，用户难以快速理解产品能完成什么。需要将演示重构为 AI Native 的实验工作台，用一套完整空间转录组实验直观呈现 Agent 如何从实验目标形成计划、优化执行并处理异常。

## What Changes

- 在原文件同目录新建独立演示文件夹，保留原 HTML 不变。
- 将产品主流程拆分为“规划阶段”和“执行阶段”两个一级模块。
- 规划阶段使用对话推进目标理解、信息补齐、Workflow 选择和计划优化。
- 增加可收起的实验任务空间，展示规划完善度、当前计划、待补齐信息和本轮变化。
- 执行阶段提供独立的执行监控页面，展示完整实验进度、当前 Workflow、步骤、Executor、资源占用、结果和异常。
- 执行阶段保留 Agent 对话，可通过模拟对话触发重新生成后续执行步骤。
- 增加独立的步骤编排页面，以前端模拟方式支持调整步骤顺序和 Executor。
- 增加全局项目管理，确保每个实验作为独立项目管理规划、执行、结果和归档。
- 侧栏区分“全局工作台”和“当前实验项目”：知识库、Agent、Workflow、设备接入、人员权限为跨项目通用能力，规划确认、执行监控、步骤编排和实验归档属于单个项目。
- 将知识库、Agent、Workflow、设备接入和人员权限补成可操作的配置流程，而非空白或静态说明页。
- 配置页内部不再重复渲染全局模块菜单，改为单列流程内容；具体内容对齐原 HTML 的 F1–F5 建库、9 个数字员工、SOP 编译、F3 设备台账与 T7 手工回报。
- 主项目发现知识或 Workflow 缺口时，可从对话跳转补齐并将发布状态回填规划；其他信息完整项目按已有 Workflow 正常执行。
- 用步骤并行、资源接力和批次合并三个示例展示 Agent 的优化能力。
- 用异常结果触发重规划并返回执行的演示闭环，最终生成归档结果。
- 移除主流程中 W1–W7、9 个数字员工、模板编号和底层设备适配器等技术主叙事。

## Capabilities

### New Capabilities

- `ai-native-experiment-planning`: 对话驱动的实验目标理解、信息补齐、计划完善度、Workflow 选择和三类计划优化演示。
- `experiment-execution-monitoring`: 完整空间转录组实验的流程执行、Workflow 监控、结果判断、异常重规划和归档演示。
- `manual-step-orchestration`: 独立步骤编排页面中的步骤顺序与 Executor 调整演示。
- `progressive-capability-navigation`: 通过侧栏在主流程模块与知识库、Agent、Workflow、设备接入等探索页之间切换。
- `experiment-project-management`: 管理多个独立实验项目，并区分全局能力与项目内规划、执行和归档状态。

### Modified Capabilities

无。当前 OpenSpec 中不存在需要修改的既有能力规范。

## Impact

- 新增一个独立、无构建依赖的 HTML/CSS/JavaScript 前端演示。
- 原始文件 `/Users/admin/Documents/ppt/compitation/Agent实验Workflow全流程整合演示.html` 保持不变。
- 不接入真实 Agent、设备、数据库或后端 API；所有数据与交互均为浏览器内演示状态。
- 不引入第三方前端依赖，确保双击 HTML 即可运行。
