# LABWEAVE 展示验收手册

本手册验证 Harness 原生 LABWEAVE 组合：Agent 是实验编排主线，工作台负责展示当前 Project、生命周期、证据和 Host 授权文件。流程约五至十分钟，面向真实 Host 组合验收；静态截图或直接调用 API 都不能单独作为用户验收证据。

## 准备

在仓库根目录执行：

    pnpm run demo:lab-web

打开命令打印的本地地址。该命令启动 opt-in LABWEAVE 组合，不改变普通 Web profile。

## 验收路径

1. 确认首次页面是全局“执行监控”。这是整页视图：不挂载 Conversation 输入框，也不挂载 Project 工作台。左侧栏在原生 Workspace/Session 树上方提供全局监控和配置入口。
2. 在监控中选择 Project 状态行。Host 应按 Project -> Workspace -> Session 链路切换，客户端选中同一组记录并打开 Project 模式。没有 Project 时，应显示明确的空态或不可用状态，不得伪造项目。
3. 进入 Project 模式后，确认三栏结构：左侧是 Harness 原生导航和 Workspace/Session 树，中间是完整共享的 Harness Conversation 及唯一输入框，右侧是当前 Project 工作台。右侧工作台包含总览、规划/Workflow、Plan 审批、执行监控、步骤编排、结果/证据、文件和归档目的地。
4. 使用中间唯一的原生 Agent 输入框提交目标。Agent 应读取当前 Project context，在缺少输入时补问，通过 Host 操作创建 Experiment（调用方不提供 Project 或 Experiment ID），并继续完成 Knowledge、能力查询、Workflow/Plan/Skill 提案、审批、执行监控和报告流程。
5. 到达审批或人工确认门禁时，确认 Agent 只请求一次并 yield。用户从结构化 Project 工作台动作完成待处理操作；下一轮 Agent 从 durable event 继续。Agent 不得自行启动 Run、确认设备步骤或计算最终 verdict。
6. 使用 Agent 卡片或生命周期节点打开已授权的 Project 目的地，再在右侧工作台检查同一 Experiment、Run、步骤、Evidence、Result 和报告记录。Project 文件按 Project configuration、conversation output、run artifacts 分组；打开和下载必须调用 Host 授权动作。
7. 打开全局配置中心。Knowledge 和 Devices 展示真实注册能力状态；没有真实 Provider 时，Agent、Workflow/Lab Skill 和人员/权限显示只读或 unavailable。返回 Project 模式后，已选 Session、Project 和 Conversation 草稿必须保留。
8. 在桌面、窄桌面和平板宽度重复路径。确认主滚动容器可用，侧栏和右侧工作台可以收起并恢复，Conversation 可以滚动，键盘焦点有清晰路径，导航切换后 Project 选择仍然保留。

assembled 浏览器流程位于 apps/web/tests/lab-showcase.e2e.ts、apps/web/tests/lab-full-lifecycle.e2e.ts 和 apps/web/tests/lab-workbench.e2e.ts。Chromium 可用时以这些流程作为验收证据；单元测试和 Host 测试只能证明代码与组合行为。

## 验收边界

Project 和 Experiment 身份均由 Host 生成。浏览器不构造 ID、不接受任意绝对路径、不保存记录副本，也不提供独立的 Project 创建页。Workspace 缺失、能力不可用、Run 失败或等待人工操作时，必须展示 typed 状态和允许的下一动作。无 key 的开发检查可以使用确定性 Provider，但不得将其记录冒充生产数据。
