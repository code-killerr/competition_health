# 实验自动化开发 Agent

[English](README.md) | 中文

这是叠加在既有 Headless Agent 上的实验自动化开发入口，不修改默认 profile，也不把测试资料写入运行时代码。

先准备满足项目要求的 Node 和依赖：

```sh
source ~/.nvm/nvm.sh
nvm use 24.19.0
pnpm install
pnpm run build
```

启动实验开发组合：

```sh
pnpm dsh --profile headless --patch examples/lab-agent/cordis.patch.yml "使用 lab_knowledge_import 导入指定资料，然后检索与实验目标相关的知识并列出引用"
```

本 overlay 会挂载实验领域 Service、SQLite/FTS5 知识库、Agent 作用域知识与规划工具、本地 Lab Skill Provider，以及仅用于开发的可配置 Mock Device Provider。知识库默认写入当前工作目录下的 `.lab-data/knowledge.sqlite`，原始文件通过工具按路径导入，资料不会自动成为内置种子数据。

当前可验证知识录入、状态查询、检索、冲突/事实确认、规划上下文检索、结构化计划/Skill 草案提交、确定性校验，以及已激活 Lab Skill 的 Harness Skill 发现。人工计划审批、设备执行、结果验证和 Web 页面仍在后续增量中。

运行 Agent 需要 `DEEPSEEK_API_KEY`，可放在项目根目录的 git 忽略 `.env` 或通过环境变量提供。
