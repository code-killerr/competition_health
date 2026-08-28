# lab-web

[English](README.md) | 中文

面向实验展示原型的 opt-in Web 组合。它装配已有实验 Service bundle、loopback `/api/lab` Facade、Harness 一级应用视图扩展、Project 列表/创建页面和现有 Session 作用域工作台，不改变默认 Web roster。

## 运行

先构建源码和浏览器 bundle：

```sh
pnpm run build
```

启动展示入口：

```sh
pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open
```

打开命令打印的本地地址。当前已验证路径从 Projects 一级应用视图开始，不要求已有 Session：选择一个已注册 Workspace，按名称创建 Project，并确认页面选中了 Host 生成的 Project ID。现有 Session 工作台仍可从 Harness Conversation 视图打开，用于检查已接入的能力。

loopback Facade 使用两个明确的命令命名空间。通用 Knowledge、规划、Skill、设备和 Runtime 命令使用 `namespace: "lab"`；Project、Experiment、Run 和 Artifact 页面命令使用 `namespace: "project"`。浏览器只提交记录和动作参数，业务 ID 与持久化由 Host 负责。

## 展示边界

当前组合已证明 Harness 原生入口、Workspace 选择、Project 创建和 Project 选择路径。完整的 Knowledge→引用→Experiment→Plan→审批→Run→Artifact→报告浏览器流程仍需要后续 application view 和浏览器 e2e 工作；展示手册不会把这些能力写成已完成。

模型规划是 opt-in 能力，需要配置 `DEEPSEEK_API_KEY`。确定性 Provider 和 fixture 只有在当前组合通过真实 Facade 暴露并在界面标注状态时才属于演示数据；fixture [`fixtures/minimal-plan.template.json`](fixtures/minimal-plan.template.json) 不属于 Project 入口路径的必要步骤。

这些 fixture 仅用于开发输入。运行时组合不会自动加载生物样本、空间 ATAC CSV、PDF 或固定实验协议。
