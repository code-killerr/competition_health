# lab-web

[English](README.md) | 中文

面向实验展示原型的 opt-in Web 组合。它在不改变默认 Web roster 的前提下，装配已有实验 Service bundle、loopback `/api/lab` Consumer、`dsh.client` 工作台 overlay、公开 Knowledge 工作台和统一 Project 壳层。

## 运行

先构建源码和浏览器 bundle：

```sh
pnpm run build
```

启动展示入口：

```sh
pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open
```

打开命令打印的本地地址；五到十分钟的完整路径见展示手册 SHOWCASE.zh.md。应用以 Project 为中心，提供 Overview、Conversations、Experiments、Runs 和 Evidence 页面；侧边栏继续提供全局 Knowledge、Devices 和 Projects 操作。创建 Project 时只填写名称，不再填写不透明 ID；ID 由 Host 流程生成并保留在内部状态中。

在 Knowledge 页面选择 PDF，导入后等待版本进入 `READY`，再将来源加入或移出当前 Project。对当前公开 Knowledge 记录进行检索，确认引用并创建、审阅、发布 SOP；同一引用会回传到工作台，Experiments 页面据此生成可人工审阅的确定性无密钥 Plan。

继续在 Experiments、Runs 和 Evidence 页面完成显式人工门：校验 Skill、批准 Plan、启动 Run、确认步骤、按需停止，并查看最终证据和报告。界面会明确标注确定性演示、不可用能力和空态，不把它们呈现为生产集成。

模型规划为 opt-in 能力，需要配置 `DEEPSEEK_API_KEY`。无密钥路径使用真实 Facade、Session 和 Project 表面，并由确定性的 Knowledge 与 Runtime Provider 提供数据。fixture [`fixtures/minimal-plan.template.json`](fixtures/minimal-plan.template.json) 仍用于底层开发测试，但主浏览器流程不再要求手工复制或粘贴它；诊断 JSON 预览只用于排查，不是主要操作路径。

这些 fixture 仅用于开发输入。运行时组合不会自动加载生物样本、空间 ATAC CSV、PDF 或固定实验协议。
