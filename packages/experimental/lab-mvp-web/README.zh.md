# @deepseek-ai/dsh-experimental-lab-mvp-web
[English](README.md) | 中文

opt-in 实验工作台使用的最小 Host Consumer。它保留只读 `snapshot()`，并增加类型化命令 Facade 与 loopback `/api/lab` 路由。它编排已有 Knowledge、Planning、Skill、Device、Runtime、Session 和 Storage Consumer，不直接访问 Provider 数据库或设备。

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
