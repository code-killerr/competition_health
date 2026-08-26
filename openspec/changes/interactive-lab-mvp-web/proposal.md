## Why

实验自动化能力已经具备 Knowledge、Planning、Skill、Device 和 Runtime 的本地骨架，但当前 Web profile 没有加载实验 bundle、没有实验操作 API，也没有可操作的实验页面。静态 demo 只能演示前端状态，无法验证“资料录入 → 需求理解 → 计划确认 → 步骤执行 → 结果反馈”的真实闭环，因此需要补齐一个面向第一阶段人工测试的交互式 Web 原型。

## What Changes

- 新增基于 DeepSeek Harness `dsh.client`、React 和 Slot UI 的实验工作台页面，直接展示实验主流程，不再以模型介绍功能作为入口。
- 新增实验 Web Facade 和浏览器安全的类型化命令接口，覆盖资料状态、实验登记、知识检索、计划审核、步骤确认、运行控制、结果验证和最终报告。
- 将 Web 页面动作连接到现有实验 Service、SQLite Provider、Mock Device 和 Runtime；页面不得访问 Provider 数据库或设备对象。
- 复用 Harness 现有 `ctx.agents`、Agent preset、LLM adapter、`ctx.tools`、`ctx.approval`、Session 和 Storage，不新增实验专用 Agent loop 或模型配置中心。
- 提供无模型消耗的本地演示模式，以及用户主动触发的 Agent 需求解析/计划生成模式；模型输出必须进入现有计划、Skill 和人工确认门禁。
- 使用 demo 的深墨绿、暖白和琥珀色视觉语言作为参考，但所有实验状态、步骤、引用和结果均来自运行时数据或显式测试夹具。
- 通过 opt-in Web overlay 加载实验页面和服务，保持默认 Harness Web profile 的兼容性。

## Capabilities

### New Capabilities

- `interactive-lab-web-workflow`: 面向实验项目的可操作 Web 工作台、阶段导航、人工确认、运行监控、结果验证和反馈归档。

### Modified Capabilities

无。现有实验领域能力的服务接口保持不变，本变更增加 Web Consumer 和操作入口。

## Impact

- 影响 `packages/experimental/` 下的 Web Consumer、实验 Web API/路由和浏览器 UI 插件，以及实验 opt-in 组合配置。
- 需要复用 `packages/client/` 的模块加载、Slot UI、Connection 和现有 Web server 路由注册机制。
- 需要新增浏览器单元测试、Host/Client 组合测试和浏览器 E2E；真实模型测试必须显式触发，默认测试保持 keyless。
- 不引入真实设备、不改变默认 profile、不把 Space ATAC 或鼠脑空间转录组步骤写入运行时代码。
