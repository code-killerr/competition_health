# @deepseek-ai/dsh-experimental-lab-mvp-web
[English](README.md) | 中文

opt-in 实验工作台使用的最小 Host Consumer。通用实验 Facade 仍保留只读 `snapshot()` 命令，但页面组合使用 LABWEAVE adapter 暴露的 Project、Experiment、Run、Artifact、Knowledge 和结果窄查询。它增加 loopback `/api/lab` 路由，编排已有 Knowledge、Planning、Skill、Device、Runtime、Session 和 Storage Consumer，不直接访问 Provider 数据库或设备。

Project 命令使用已注册的 Workspace 记录和 Host 生成的 Project ID。`project-session-attach` 在 Workspace 冲突时返回不移动 Session 的结果，`project-session-detach` 保留 Session 日志，`project-archive` 保留全部 Project Session 供后续查看。

Project 协议还提供面向页面的类型化查询和动作：Experiment 列表/详情/创建/派生/关联、Run 列表/详情/启动/停止/重试/比较、结构化报告和 Host 授权的 Artifact 元数据。页面直接接收领域记录和 Run 视图，不再隐式选择“当前 Run”，也不提交浏览器生成的业务 id。

## HTTP 命令封装

loopback 端点接收带可选 `namespace` 字段的 JSON 对象。通用 Knowledge、规划、Skill、设备和 Runtime 命令使用 `namespace: "lab"`；Project、Experiment、Run 和 Artifact 页面命令使用 `namespace: "project"`。服务器会在传给 Facade 的类型化命令中移除该 namespace。

## 模型体验

### 受控实验上下文

#### 模型看到的内容

模型通过本包类型化服务或已有 `lab_*` 工具看到已批准计划、受控运行状态和有界观察结果。Agent 规划复用当前 Harness session 和 preset。

#### Token 影响

只返回请求的计划字段、当前步骤状态和有界证据；本地存储细节留在 Host 侧。

#### KV Cache 影响

稳定的实验、计划、Skill 修订和运行标识使重复步骤结果保持紧凑并利于前缀复用。

## 已知限制与暂缓事项

- 本包有意保持 opt-in，使用现有 Web server loopback 路由，不加入默认 API RPC map。
- 真实硬件、解析器生产化和远程调度仍不属于第一阶段 Consumer。
