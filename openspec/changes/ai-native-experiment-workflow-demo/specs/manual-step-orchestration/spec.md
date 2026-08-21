## ADDED Requirements

### Requirement: 独立步骤编排页面
页面 SHALL 将手动实验步骤编排放在独立于规划页和执行监控页的页面模块中。

#### Scenario: 打开步骤编排
- **WHEN** 用户从侧栏进入步骤编排
- **THEN** 页面展示尚未完成的步骤、依赖关系和 Executor 配置

### Requirement: 调整执行步骤
步骤编排页面 SHALL 支持通过拖拽或上移、下移按钮调整可移动步骤的展示顺序。

#### Scenario: 手动调整顺序
- **WHEN** 用户拖拽步骤或点击顺序调整按钮
- **THEN** 页面更新步骤顺序并显示手动调整状态

### Requirement: 调整 Executor
步骤编排页面 SHALL 允许用户在人工、机械臂和自动设备之间切换演示 Executor。

#### Scenario: 修改 Executor
- **WHEN** 用户选择新的 Executor
- **THEN** 对应步骤卡更新 Executor 标签和编排变更摘要
