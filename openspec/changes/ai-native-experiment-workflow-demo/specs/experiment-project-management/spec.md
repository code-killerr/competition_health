## ADDED Requirements

### Requirement: 独立实验项目

系统 SHALL 将不同实验分别作为独立项目，并按项目 ID 保存项目定义与运行态。

#### Scenario: 项目列表展示

- **WHEN** 用户打开项目管理
- **THEN** 页面展示每个实验项目的编号、实验类型、阶段、进度、Workflow 状态、证据和资源状态

#### Scenario: 重复进入项目

- **WHEN** 用户离开一个项目、进入其他项目后再次进入原项目
- **THEN** 页面恢复原项目自己的阶段、规划、执行、结果和归档状态

### Requirement: 项目定义与运行态隔离

项目 SHALL 使用自己的 Workflow、步骤依赖、资源编排、执行事件、步骤结果、异常与历史版本。

#### Scenario: 切换不同实验

- **WHEN** 用户在鼠脑空间转录、空间 ATAC、SeekOne DD 和客户自定义实验之间切换
- **THEN** 页面加载各项目的独立实验步骤，不使用鼠脑项目作为其他项目的默认流程或状态兜底

### Requirement: 统一项目生命周期

不同实验 SHALL 复用项目总览、实验规划、计划确认、执行监控、步骤编排、结果与判断和实验归档的页面骨架。

#### Scenario: 查看不同实验阶段

- **WHEN** 用户进入任一项目
- **THEN** 页面保持相同生命周期导航，但具体 Workflow、结果和记录属于当前实验

### Requirement: 全局能力复用

知识库、Agent、Workflow、设备与人员 SHALL 作为跨实验项目复用的全局配置资产，项目只引用已发布版本。

#### Scenario: 项目使用全局能力

- **WHEN** 当前项目缺少知识、Workflow 或 Executor
- **THEN** Agent 引导用户进入配置中心完成补齐，并将发布版本回填当前项目

### Requirement: 不同实验流程

Demo SHALL 为不同实验项目展示不同的实验步骤和记录。

#### Scenario: 空间 ATAC 项目

- **WHEN** 用户进入空间 ATAC 项目
- **THEN** 页面展示染色成像、细胞核质控、转座与空间条形码、ATAC 文库和数据质控流程

#### Scenario: SeekOne DD 项目

- **WHEN** 用户进入 SeekOne DD 单细胞文库项目
- **THEN** 页面展示细胞悬液质控、芯片上样、液滴包裹、逆转录、cDNA 扩增、文库构建和质控流程

#### Scenario: 客户自定义项目

- **WHEN** 用户进入客户自定义实验
- **THEN** 页面展示隐性经验规则确认与客户 SOP 的独立流程，不展示鼠脑空间转录执行记录
