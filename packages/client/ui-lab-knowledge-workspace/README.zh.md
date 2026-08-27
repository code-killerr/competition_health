# ui-lab-knowledge-workspace

[English](README.md) | 中文

当前实验室 MVP 的独立 dsh.client Knowledge 工作区。它挂载到 ui-lab-workbench 声明的公开 lab.knowledge.workspace slot，只通过类型化 /api/lab Facade 完成 PDF 导入、READY 状态、引用检索、事实确认、SOP 审核和发布。

## Model Experience

### 浏览器 Consumer

#### What the model sees

该包不增加面向模型的工具。Harness Agent 仍只看到现有的项目范围 Knowledge 工具和已确认引用；浏览器工作区只调用 `/api/lab`。

#### Token effect

浏览器工作区不会发送模型请求。

#### KV Cache effect

浏览器状态不会写入模型上下文。

## Known Limitations and Deferred Work

- 该工作区依赖 opt-in lab Web 组合和已挂载的 /api/lab Facade；它不会提交模型规划请求。
