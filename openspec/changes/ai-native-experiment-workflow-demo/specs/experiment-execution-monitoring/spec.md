## ADDED Requirements

### Requirement: 当前项目执行监控

执行页面 SHALL 展示当前项目的总体进度、Workflow 状态、当前步骤、Executor 和步骤结果。

#### Scenario: 推进执行演示

- **WHEN** 用户点击推进执行
- **THEN** 页面只更新当前项目的进度、步骤、结果和 Agent 动态

### Requirement: 每步结果与证据

每个已执行步骤 SHALL 展示状态、Executor、时间、产物或指标、证据和判断规则。

#### Scenario: 查看步骤结果

- **WHEN** 当前步骤取得结果
- **THEN** 页面在执行监控和结果与判断页展示该步骤的结果、放行规则和证据附件

### Requirement: 执行阶段保留 Agent 对话

执行页面 SHALL 保留对话入口，并允许异常指令触发 Agent 重新生成尚未执行步骤。

#### Scenario: 请求 Agent 重规划

- **WHEN** 用户请求根据异常重新设计后续步骤
- **THEN** 页面保留已执行步骤，更新未执行步骤，并生成新计划版本和差异摘要

### Requirement: 已执行步骤不可编排

已开始和已完成步骤 SHALL 在步骤编排中锁定。

#### Scenario: 尝试移动已执行步骤

- **WHEN** 用户拖拽、移动或更换已执行步骤的 Executor
- **THEN** 页面阻止操作并说明只能编排尚未执行步骤

### Requirement: 结果判断与归档门禁

系统 SHALL 在全部必需结果取得并判断通过后开放归档。

#### Scenario: 结果未通过

- **WHEN** 当前项目结果被判定失败
- **THEN** 页面记录失败结果并提供 Agent 重规划和人工编排入口

#### Scenario: 完成归档

- **WHEN** 当前项目全部 Workflow 与最终结果判断通过
- **THEN** 页面生成该项目自己的目标、计划版本、执行结果、异常处置和产出物摘要

### Requirement: 跨项目执行监控

跨项目执行监控 SHALL 属于工作台，并允许查看各项目独立的 Workflow 与资源占用。

#### Scenario: 查看占用设备的项目

- **WHEN** 用户从资源编排或设备占用点击项目编号
- **THEN** 页面展示该项目自己的 Workflow、当前阶段、设备占用和下一步骤
