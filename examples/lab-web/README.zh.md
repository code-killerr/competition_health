# lab-web

[English](README.md) | 中文

第一阶段实验原型的 opt-in Web 组合。它向 Web profile 增加已有实验 Service bundle、loopback `/api/lab` Consumer 和 `dsh.client` 工作台 overlay，不改变默认 roster。

## 运行

先构建源码和浏览器 bundle：

```sh
pnpm run build
```

启动该组合：

```sh
pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open
```

打开终端打印的本地地址。在“知识库”阶段录入 [`fixtures/minimal-source.txt`](fixtures/minimal-source.txt)，检索 `bench`，再填写实验需求。“调用当前 Agent 规划”会复用 DeepSeek Harness 当前会话，需要 `DEEPSEEK_API_KEY`。

如需无密钥规划路径，先构建规划上下文，从召回结果中复制 citation ID，替换 [`fixtures/minimal-plan.template.json`](fixtures/minimal-plan.template.json) 中的 `REPLACE_WITH_CITATION_ID`，再粘贴到“计划确认”阶段的本地演示输入框。页面会显式保留 Skill 校验、人工批准、激活、计划批准、步骤确认、停止和报告操作。

这些 fixture 只用于开发输入。运行时组合不会加载生物样本、空间 ATAC CSV、PDF 或固定实验协议。
