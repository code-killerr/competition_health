# lab-web

[English](README.md) | 中文

面向实验展示原型的 opt-in Web 组合。它装配已有实验 Service bundle、loopback `/api/lab` Facade、Harness 一级应用视图扩展、层级化 LABWEAVE 导航、共享的原生 Session Conversation 和 Project 工作台，不改变默认 Web roster。

## 运行

构建源码和浏览器 bundle 后启动展示入口：

```sh
pnpm run demo:lab-web
```

如果仓库根目录存在 `.venv` Docling 环境，启动器会自动把其中的 Python 可执行文件传给 Host；否则请先运行 `pnpm run docling:setup`，或者在启动服务前设置部署侧的 `DOCLING_PYTHON` 可执行文件。

打开命令打印的本地地址。默认 LABWEAVE 视图从全局执行监控开始，不要求已有 Session。选择 Workspace 后，Host 会自动创建或复用该 Workspace 唯一的 Project 和项目 Session；中间的原生 Harness Conversation 与右侧 Project 工作台会保持同一 Project 关联。

loopback Facade 使用两个明确的命令命名空间。通用 Knowledge、规划、Skill、设备和 Runtime 命令使用 `namespace: "lab"`；Project、Experiment、Run 和 Artifact 页面命令使用 `namespace: "project"`。浏览器只提交记录和动作参数，业务 ID 与持久化由 Host 负责。

## 验证边界

Host 组合的无模型路径已经通过服务和组合测试覆盖 Project/Session identity、范围限定的 Knowledge context、Workflow/Skill/Plan 提案与审批、Runtime 执行、重规划、Project 文件、verdict 和报告持久化。桌面、窄桌面/平板和键盘行为仍需在可进行浏览器验证的设备上完成 assembled browser acceptance；展示手册不会把这部分证据写成已完成。

模型规划是 opt-in 能力，需要配置 `DEEPSEEK_API_KEY`。确定性 Provider 和 fixture 只有在当前组合通过真实 Facade 暴露并在界面标注状态时才属于演示数据；fixture [`fixtures/minimal-plan.template.json`](fixtures/minimal-plan.template.json) 不属于 Project 入口路径的必要步骤。

这些 fixture 仅用于开发输入。运行时组合不会自动加载生物样本、空间 ATAC CSV、PDF 或固定实验协议。
