# 实验自动化开发 Agent

[English](README.md) | 中文

这是叠加在既有 Headless Agent 上的实验自动化开发入口，不修改默认 profile，也不把测试资料写入运行时代码。

先准备满足项目要求的 Node 和依赖：

```
source ~/.nvm/nvm.sh
nvm use 24.19.0
pnpm install
pnpm run build
```

启动实验开发组合：

```
pnpm dsh --profile headless --patch examples/lab-agent/cordis.patch.yml "Use lab_knowledge_import to import the requested source, search the experiment objective, approve the plan, and execute the controlled run"
```

本 overlay 会挂载实验领域 Service、本地 Knowledge、Planning、Lab Skill、Mock Device 和 Runtime Provider、Agent 作用域的 Knowledge、Planning 和 Runtime 工具，以及只读 Web Consumer。知识库默认写入当前工作目录下的 .lab-data/knowledge.sqlite，原始文件通过工具按路径导入，资料不会自动成为内置种子数据。

当前可验证知识录入、带引用检索、冲突和事实确认、规划上下文、结构化计划和 Skill 草案、确定性校验、计划批准、ExecutionGraph 锁定、人工确认、受控 Mock Device 执行、Session 观察结果和报告。生产设备、持久化 Runtime 恢复和结果校验器属于后续增量。

运行 Agent 需要 DEEPSEEK_API_KEY，可放在项目根目录的 git 忽略 .env 或通过环境变量提供。

## 测试数据矩阵

聚焦的[知识数据切换测试](../../packages/experimental/lab-knowledge-local/tests/pdf-knowledge.spec.ts)会把本地输入按字节导入，并将检索限制在当前资料版本内。运行时包不包含固定的实验流程或样本文本。

| 输入 | 来源 | 验证内容 |
| --- | --- | --- |
| 空间 ATAC 协议 CSV | `docs/change_plan/Agent实验Workflow步骤输入输出与边界条件确认表_细化版 副本 - SeekSpace_空间ATAC.csv` | 内置 CSV 行可检索，并带有协议/流程确认资料角色。 |
| 流程确认表 | 同一份空间 ATAC CSV，以独立资料角色导入 | 文档过滤会将确认资料与其他来源隔离。 |
| PDF 知识资料集 | `docs/change_plan/pdf_knowledge/*.pdf` 中当前可用的全部文件 | 真实 PDF 字节具有 `%PDF-` 签名，并通过可配置解析器接缝写入页码和标题路径引用。 |
| 鼠脑用例请求 | 测试创建的小型文本输入 | 样本请求可以与流程资料切换，且不改变运行时行为。 |

当前工作区包含六份 PDF 输入。测试解析器仅用于测试且保持确定性：它检查 PDF 签名并提供代表性的首页区块；生产环境的 PDF 文本提取仍由配置化 `DocumentParser` 接入。

已知限制和下一阶段 backlog：生产 PDF 解析器仍需发布真实提取的表格和页区块；干净检出可能不包含本地 PDF 资料，因此测试只覆盖实际存在的文件；真实设备、持久 Runtime 恢复、结果校验器和完整 Web/e2e 闭环仍属于后续增量。
