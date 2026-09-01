本手册对应 Harness 原生 LABWEAVE 组合及其由 Host 驱动的生命周期验收。视觉 walkthrough 使用真实的 Workspace 与 Project Facade 记录、共享 Conversation 展示契约和 LABWEAVE 生命周期工作台；生命周期验收只对补问使用确定性模型 replay，Knowledge、Experiment、Plan、Run、报告和 Project 文件均通过真实 Host 命令完成。

## 准备

在仓库根目录执行：

```sh
pnpm run demo:lab-web
```

打开命令打印的本地地址。该命令启动 opt-in 组合，不改变默认 Web roster。

## 验证路径

1. 在创建 Session 前，从根应用视图打开 LABWEAVE；侧栏应显示全局执行监控、动态 Projects 树和配置中心。
2. 选择一个已注册 Workspace；如果该 Workspace 已有 Project，页面应直接打开 Host 返回的 Project 记录；如果没有，则按 Workspace 目录名创建 Project。重复对同一 Workspace 执行创建时，Host 必须复用已有 Project，而不能生成第二个 Project。
3. 打开 Project Overview，确认生命周期状态和待处理动作是主要内容，统计信息为辅助内容。
4. 展开 Project 树，依次访问规划与 Workflow、Plan 审批、执行监控、步骤编排、证据与报告、归档；选中的 Project、Agent 上下文和单一输入应在这些目的地之间保持同步。
5. 从底部紧凑 dock 展开 Agent 时间线；确认页面只有一个 input DOM，切换目的地时草稿保留，不再渲染默认 Conversation hero 或旁边的永久 Agent 栏。
6. 打开配置中心；Knowledge 和 Devices 展示已注册的 Host 能力，没有对应能力时 Agent、Workflow/Lab Skill 和人员/权限显示明确的 unavailable 状态。
7. 将页面调整为桌面、平板和窄桌面宽度；确认工作台可滚动，dock 始终可访问，侧栏 rail 模式仍可操作。

可重复执行的视觉浏览器流程位于 `apps/web/tests/lab-showcase.e2e.ts`。浏览器可用时，它会在 `.artifacts/lab-showcase/` 保存桌面、平板和窄桌面截图。Host 生命周期流程位于 `apps/web/tests/lab-full-lifecycle.e2e.ts`；assembled fixture 状态流程位于 `apps/web/tests/lab-workbench.e2e.ts`。

## 预期状态

空 Project 列表表示当前 Host 没有 Project 记录。没有已注册 Workspace 时，创建动作不可用；列表或创建失败应保留错误状态，并提供重试或修正路径。页面显示的 Project ID 由 Host 返回，浏览器不要求用户输入。

## 展示边界

配置卡片用于验证目的地和能力状态。完整的 Experiment→Plan→审批→Run→Artifact→报告链路由 Host 生命周期浏览器流程通过当前 Host Facade 验证；视觉 walkthrough 不执行这些写操作。不要使用旧 JSON fixture 或截图证明 Host 生命周期已经接通。

生命周期浏览器流程不需要配置 `DEEPSEEK_API_KEY`，其中的模型补问使用确定性 replay。实时模型规划是可选检查，需要配置 `DEEPSEEK_API_KEY`。Provider 不可用时应报告为 unavailable 或 skipped，不应把确定性的开发数据展示为生产结果。
