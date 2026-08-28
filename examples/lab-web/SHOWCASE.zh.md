# 实验展示验证手册

本手册验证当前可运行的 Harness 原生入口路径。它使用真实 Project Facade 和 Workspace 记录，不把尚未通过浏览器验收的 Knowledge、规划、Run 或 Evidence 端到端流程写成已完成能力。

## 准备

在仓库根目录执行以下命令：

```sh
pnpm run build
pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open
```

打开命令打印的本地地址。该命令启动 opt-in 组合，不改变默认 Web roster。

## 已验证路径

1. 在创建 Session 前，从 Harness 侧边栏打开 Projects。
2. 选择一个已注册 Workspace，输入 Project 名称并创建 Project。
3. 确认新 Project 出现在列表中，且选中状态使用 Host 返回的记录。
4. 刷新 Project 列表，确认选中 Project 仍是页面选择状态，而列表已再次通过 Facade 从 Host 加载。
5. 打开现有 Conversation 视图，确认它仍是 Harness 会话界面，没有出现第二套实验聊天页面。

## 预期状态

空 Project 列表表示当前 Host 没有 Project 记录。Workspace unavailable 表示当前没有可用的已注册 Workspace，创建动作必须等待 Workspace 可用。列表或创建失败会保留错误状态，并提供重试或修正入口。页面显示的 Project ID 由 Host 返回，浏览器不要求用户输入。

## 展示边界

Knowledge、Devices、Project 子页面、Conversation 命令卡片以及完整的 Experiment→Plan→审批→Run→Artifact→报告路径不属于本次已验证流程。不要使用旧 JSON fixture 或截图证明这些动作已经通过当前 Host Facade 接通。

模型规划是可选检查，需要配置 `DEEPSEEK_API_KEY`。Provider 不可用时应报告为 unavailable 或 skipped，不应把确定性开发数据展示为生产结果。
