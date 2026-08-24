# 1. 项目目标

基于现有 `deepseek-harness`，快速搭建一套面向复杂实验的 Agent 通用自动化实验原型。

第一阶段直接使用当前复杂空转实验作为 Benchmark，不从简单实验开始。

系统需要验证：

```text
复杂实验 Protocol
↓
Agent 理解与知识检索
↓
Skill 检索与组合
↓
Experiment IR
↓
校验
↓
Execution Graph
↓
确定性 Runtime
↓
真实硬件 / 人工步骤
↓
Observation / QC
↓
异常处理 / Replanning
↓
结果记录
↓
报告与 Skill 沉淀
```

第一阶段最终需要证明：

1. 复杂实验可以完整表达和执行；
2. 实验不是通过固定代码 Hardcode；
3. Skill 可以跨步骤和实验复用；
4. 替换同能力硬件不需要修改实验规划；
5. Agent 可以根据 Observation 和异常动态调整剩余实验；
6. 整个实验过程可以完整追溯。

---

# 2. 核心架构原则

本项目采用：

```text
Skill-Centric Architecture
```

不建设独立的：

```text
Workflow Library
Workflow Template
Reusable Workflow Asset
```

长期可复用的实验能力只有：

```text
Skill
```

系统核心关系：

```text
Protocol
↓
Planner Agent
↓
Experiment IR
↓
Skill Resolve / Skill Composition
↓
Execution Graph
↓
Experiment Runtime
↓
Device Gateway
↓
Hardware
```

其中：

### Experiment IR

表示当前实验的结构化计划。

### Skill

表示长期存在、可以检索、组合、版本管理的实验能力。

### Execution Graph

表示当前实验由 IR 和 Skill 动态生成的执行实例。

Execution Graph 只用于当前实验执行和历史留档，不作为独立复用资产。

### Experiment Runtime

负责确定性的：

```text
状态
依赖
调度
设备锁
Retry
Timing
Human Gate
执行
```

---

# 3. DeepSeek-Harness 使用原则

所有通用基础设施优先复用 `deepseek-harness`。

包括：

```text
Agent Runtime
LLM Gateway
Tool Calling
RAG
Knowledge Base
Embedding
Database
ORM
Session
Memory
Logging
Tracing
Frontend Infrastructure
```

优先级：

```text
Reuse
↓
Extend
↓
Adapter
↓
New Implementation
```

禁止重复搭建第二套：

```text
Agent Framework
RAG
Database
Vector Store
Model Gateway
Session System
```

具体技术栈、框架和版本必须由 Codex 扫描当前仓库后确认，不提前假设 FastAPI、SQLAlchemy、React 等具体实现。

---

# 4. 第一阶段总体架构

```text
User / Protocol
       ↓
Experiment Specification
       ↓
Planner Agent
       │
       ├── RAG
       ├── Skill Search
       ├── Historical Experiment
       └── Capability Query
       ↓
Experiment IR
       ↓
Verifier Agent
       ↓
Deterministic Validator
       ↓
Human Review
       ↓
Experiment Compiler
       │
       ├── Skill Resolver
       ├── Composite Skill Expander
       └── Capability Resolver
       ↓
Execution Graph
       ↓
Experiment Runtime
       ↓
Skill Runtime
       ↓
Device Gateway
       ↓
Mock / Manual / Real Device
       ↓
Observation
       ↓
QC
       ↓
Execution Agent
       ↓
Continue / Retry / IR Patch
       ↓
Result
       ↓
Report / Feedback / Skill Candidate
```

---

# 5. 核心开发模块

整个 MVP 只划分为 8 个核心模块。

## 5.1 Experiment Domain

负责：

```text
Experiment
Experiment Specification
Experiment IR
Sample Lineage
Execution Result
Experiment Status
```

Experiment IR 至少需要表达：

```text
Step
Dependency
Skill
Parameter
Input / Output
Sample
Capability
Timing
QC
Human Gate
Exception Policy
```

---

## 5.2 Skill System

Skill 是唯一长期复用的实验能力资产。

分为三层：

```text
Primitive Skill
Operation Skill
Composite Skill
```

例如：

```text
Composite: bead_cleanup
    ↓
Operation: magnetic_separation
    ↓
Primitive: move / aspirate / dispense
```

Skill 至少包含：

```text
id
version
description

inputs
outputs
parameters

required_capabilities

steps             # Composite Skill

execution         # Primitive / Operation Skill

validation
qc
exception_policy
human_gate
```

需要实现：

```text
Skill Registry
Skill Version
Skill Search
Skill Match
Composite Skill Expansion
```

---

## 5.3 Agent Layer

第一阶段固定只做三个 Agent。

### Planner Agent

负责：

```text
Protocol 理解
RAG
未知信息识别
历史实验参考
Skill 检索
Experiment IR 生成
```

### Verifier Agent

负责：

```text
漏步骤
步骤顺序
参数冲突
Sample Lineage
Skill适用性
SOP一致性
QC遗漏
Timing问题
```

### Execution Agent

只处理实验运行过程：

```text
Observation 分析
异常分析
Recovery Proposal
局部 Replanning
```

不继续拆 Knowledge Agent、Skill Agent、Equipment Agent。

这些统一做成 Harness Tool。

---

# 6. Knowledge Layer

直接复用 DeepSeek-Harness RAG。

第一阶段至少区分：

```text
Protocol
SOP
设备文档
实验知识
Skill
历史实验
异常案例
```

Planner 可以调用：

```text
search_knowledge()

search_skill()

get_historical_experiment()

get_capabilities()

get_devices()
```

所有 Retrieval 必须保留来源，方便实验审计和论文分析。

---

# 7. Experiment Compiler

Compiler 负责将：

```text
Experiment IR
```

转换成：

```text
Execution Graph
```

执行链：

```text
Experiment IR
↓
Skill Resolver
↓
Composite Skill Expansion
↓
Parameter Binding
↓
Sample Binding
↓
Capability Resolution
↓
Execution Graph
```

例如：

```text
IR:
bead_cleanup

↓

Skill Expansion:

transfer_liquid
mix
incubate
magnetic_separation
remove_supernatant
wash
wash
elute
```

Execution Graph 不进入 Skill Library。

---

# 8. Experiment Runtime

Runtime 是确定性程序，不依赖 LLM 控制状态。

负责：

```text
Execution Graph

Dependency

State Machine

Timing

Resource Lock

Queue

Retry

Pause / Resume

Human Gate

Execution Dispatch
```

Execution Node 状态：

```text
PENDING
READY
WAITING_RESOURCE
WAITING_HUMAN
RUNNING
SUCCEEDED
FAILED
PAUSED
SKIPPED
CANCELLED
```

Agent 只能提出：

```text
Retry Proposal
Recovery Proposal
IR Patch
```

不能直接修改 Runtime 状态。

---

# 9. Device Layer

统一：

```text
Skill
↓
Capability
↓
Device
```

禁止：

```text
Skill
↓
固定 Device ID
```

例如：

```text
transfer_liquid
↓
liquid_transfer capability
↓
自动移液设备
机械臂
Manual Station
```

统一 Device Gateway：

```text
health_check()

get_state()

execute(action, params)

get_result(command_id)

cancel(command_id)
```

Adapter 根据实际设备实现：

```text
Mock
Manual
HTTP
Serial
Python SDK
```

第一阶段只实现当前实验真正需要的 Adapter。

---

# 10. Device Command

所有物理执行必须生成唯一：

```text
command_id
```

例如：

```text
EXP001-NODE013-TRY01-CMD01
```

Device Gateway 必须支持幂等，避免：

```text
设备已经执行成功
↓
通信超时
↓
系统 Retry
↓
物理操作重复执行
```

---

# 11. Observation 与 QC

实验执行不能只有：

```text
SUCCESS / FAILED
```

统一产生：

```text
Observation
```

来源：

```text
Device
Sensor
Instrument
Camera
Human
```

QC 分为：

```text
Deterministic QC
Agent QC
Human QC
```

执行闭环：

```text
Action
↓
Observation
↓
QC
↓
Continue / Exception
```

---

# 12. Replanning

Execution Agent 不允许重新生成整个实验。

只能对剩余实验生成：

```text
IR Patch
```

支持：

```text
insert_step
replace_step
replace_skill
update_parameter
skip_step
```

流程：

```text
Exception / QC Failed
↓
Execution Agent
↓
IR Patch
↓
Verifier
↓
Validator
↓
Partial Compile
↓
Human Review when required
↓
Resume
```

---

# 13. Sample Lineage

复杂实验第一阶段必须支持 Sample 追踪。

至少记录：

```text
sample_id
parent_sample_ids
container
volume
state
location
generated_by_step
```

需要表达：

```text
Sample A
↓
Aliquot
├── A1
└── A2
```

以及：

```text
Sample A
+
Material B
↓
Sample C
```

第一版 Container / Material 可以根据 Harness 数据库设计选择独立表或 JSON 字段，不提前过度拆表。

---

# 14. MVP 数据模型

优先复用 Harness 已有通用表。

实验业务第一版控制在大约以下数据结构：

```text
experiments

experiment_specs

experiment_irs

skills

skill_versions

devices

device_capabilities

samples

execution_graphs / execution_nodes

executions

observations

human_reviews

experiment_events

experiment_reports
```

如 Harness 已有：

```text
agent_runs
messages
knowledge
documents
audit_logs
```

直接复用。

不要第一阶段建立知识图谱数据库等额外基础设施。

---

# 15. Complex Experiment Benchmark

当前复杂空转实验必须首先数字化。

建立：

```text
benchmarks/complex_experiment/
```

至少包含：

```text
protocol.md

ground_truth_ir.json

skills/

sample_lineage.json

device_capabilities.json

expected_execution_graph.json

expected_results.json

fault_scenarios.json

variants/
```

这里是：

```text
Benchmark Data
```

不是生产业务逻辑。

禁止在 Runtime 中出现：

```text
if experiment == xxx
```

或：

```text
run_specific_experiment()
```

---

# 16. 开发阶段

整个项目只分 7 个 Phase。

---

## PHASE 0 — Harness 调研 + Ground Truth

### 开发内容

Codex 首先扫描：

```text
deepseek-harness

docs/change_plan

Agent实验Workflow_AI_Native/index.html

Agent实验Workflow全流程整合演示.html
```

确认：

```text
当前后端技术栈
数据库
ORM
Agent Runtime
Tool
RAG
Memory
Session
Logging
Frontend
Testing Framework
```

同时数字化当前复杂实验 Ground Truth。

### 输出

```text
docs/change_plan/implementation/

00-stack-baseline.md
01-harness-capability-map.md
02-gap-analysis.md
03-module-layout.md
04-complex-experiment-ground-truth.md
05-development-map.md
```

### 验收

必须明确：

```text
Harness 哪些能力直接复用
哪些需要 Extend
哪些必须新增
```

并且复杂实验拥有标准 Ground Truth。

---

# PHASE 1 — Experiment IR + Skill

### 开发内容

实现：

```text
Experiment Domain

Experiment IR

Sample Lineage

Skill Schema

Skill Registry

Skill Version

Composite Skill

Skill Expansion
```

### 验收

当前复杂实验能够完全用：

```text
Experiment IR
+
Skill
```

表达。

不依赖固定 Workflow。

---

# PHASE 2 — Compiler + Execution Graph

### 开发内容

实现：

```text
IR Validator

Skill Resolver

Skill Expander

Parameter Binder

Sample Binder

Capability Resolver

Execution Graph Compiler
```

Validator 至少检查：

```text
Schema

Skill存在

参数合法

Sample引用

依赖关系

循环依赖

Timing

Capability
```

### 验收

```text
Ground Truth IR
↓
Compiler
↓
Execution Graph
```

能够生成符合预期的完整复杂实验执行图。

---

# PHASE 3 — Runtime + Mock Lab

### 开发内容

实现：

```text
Execution State Machine

Dependency Execution

Resource Lock

Queue

Timing

Retry

Pause / Resume

Human Gate

Device Gateway

Mock Adapter

Manual Adapter

Mock Lab
```

Mock Lab 必须支持：

```text
NORMAL

BUSY

DELAY

OFFLINE

FAIL

QC_FAIL
```

### 验收

不调用任何 Agent。

直接输入 Ground Truth IR：

```text
Ground Truth IR
↓
Compiler
↓
Runtime
↓
Mock Lab
```

能够完整跑通复杂实验。

这是第一个关键里程碑。

---

# PHASE 4 — Planner + RAG + Verifier

### 开发内容

基于 DeepSeek-Harness 实现：

```text
Planner Agent

Verifier Agent

RAG Tools

Skill Tools

Historical Experiment Tool

Capability Tool
```

Planning Pipeline：

```text
Protocol
↓
Planner
↓
Experiment IR
↓
Verifier
↓
Validator
↓
Repair
↓
Compiler
↓
Dry Run
↓
Human Review
```

Repair 最大次数限制，例如：

```text
MAX_REPAIR = 3
```

### 验收

输入当前复杂 Protocol：

系统可以自动生成合法 Experiment IR，并成功进入 Mock Runtime。

---

# PHASE 5 — Real Hardware + Closed Loop

### 开发内容

逐步把：

```text
Mock Device
```

替换为：

```text
Real Device Adapter
```

同时实现：

```text
Observation

QC

Execution Agent

Exception

IR Patch

Partial Recompile
```

### 关键要求

Mock → Real 后：

```text
Experiment IR 不修改

Skill 不修改

Runtime 不修改

Planner 核心逻辑不修改
```

只修改：

```text
Device Adapter
Device Configuration
Capability Mapping
```

### 验收

复杂实验关键路径可以真实执行，并支持：

```text
自动设备
+
人工节点
+
QC
+
异常恢复
```

---

# PHASE 6 — 论文与通用性验证

开发统一 Evaluation Framework。

包含四类测试。

### A. Complex Experiment

完整复杂实验执行。

### B. Protocol Variant

修改：

```text
参数
Sample数量
部分步骤
Skill组合
```

核心 Runtime 不修改。

### C. Device Replacement

同一 Capability：

```text
Device A
↓
Device B
```

Experiment IR 和 Skill 不修改。

### D. Fault Injection

至少测试：

```text
Device Offline

Device Busy

Timeout

QC Failed

Missing Parameter

Unexpected Observation
```

同时增加 Ablation：

```text
LLM Only

LLM + RAG

LLM + RAG + Skill

+ Validator

+ Verifier

+ Observation / Replanning

Full System
```

---

# 17. 论文核心指标

系统从第一阶段开始自动记录：

```text
Plan Validity

Skill Match Accuracy

Skill Reuse Rate

Execution Completion Rate

Device Command Success Rate

Human Intervention Count

QC Pass Rate

Failure Detection Rate

Recovery Success Rate

Replanning Success Rate

Protocol Variant Success Rate
```

特别关注：

```text
新增实验 / Variant 是否需要修改核心代码
```

---

# 18. Skill 演化机制

第一次出现：

```text
Skill A
→ Skill B
→ Skill C
```

只是当前 Experiment IR。

如果同一组合多次成功出现：

```text
Execution Pattern
↓
Agent Summary
↓
Composite Skill Candidate
↓
Human Review
↓
Composite Skill
```

因此系统的长期资产演化路径为：

```text
Dynamic Composition
↓
Successful Execution
↓
Repeated Pattern
↓
Composite Skill
↓
Future Reuse
```

第一版只生成 Candidate，不自动发布正式 Skill。

---

# 19. 模型策略

MVP 阶段不进行 Planner 微调。

采用：

```text
DeepSeek-Harness LLM
+
Prompt
+
RAG
+
Tool Calling
+
Structured Output
+
Verifier
+
Validator
```

现在重点积累：

```text
Original Protocol

Planner Initial IR

Verifier Feedback

Validator Error

Human Modified IR

Approved IR

Execution Result

Observation

Exception

Recovery
```

未来再考虑使用：

```text
Protocol + Knowledge + Skill + Device
↓
Approved Experiment IR
```

作为 Planner Fine-tuning / LoRA 数据。

---

# 20. 小模型预留

只定义接口，不进入当前主开发计划。

未来可替换：

```text
SkillMatcher
→ Small Reranker

ProtocolNormalizer
→ Fine-tuned Small Model

ExceptionClassifier
→ Small Model
```

目前分别采用：

```text
Embedding + LLM

LLM

Rule + LLM
```

---

# 21. 前端 MVP

视觉参考：

```text
Agent实验Workflow_AI_Native/index.html
```

业务参考：

```text
Agent实验Workflow全流程整合演示.html
```

第一阶段只建立一个：

```text
Experiment Workspace
```

包含：

```text
Protocol

Agent Planning

Knowledge Evidence

Experiment IR

Skill Composition

Execution Graph

Sample Lineage

Device Status

Execution Monitor

Observation / QC

Exception / Replan

Human Review

Result
```

不建设：

```text
Workflow Library
Workflow Designer
```

资产管理只保留：

```text
Skill Library

Knowledge Base

Historical Experiments

Device / Capability
```

---

# 22. Codex 开发规则

Codex 必须遵循：

```text
1. 每个 Phase 开始前先扫描现有 Harness 实现。

2. Harness 已有能力优先复用，不重新造轮子。

3. Skill 是唯一长期可复用实验流程能力资产。

4. 不建立 Workflow Library。

5. Agent 输出 Experiment IR，不输出底层设备控制代码。

6. Experiment IR 通过 Skill 展开生成 Execution Graph。

7. Execution Graph 是 Runtime Artifact，不作为独立复用资产。

8. Runtime 状态必须确定性管理，Agent不能直接修改。

9. Agent不能直接调用硬件协议。

10. 所有硬件统一经过 Capability → Device Gateway → Adapter。

11. 当前复杂实验只能放在 Benchmark 中，禁止 Hardcode 到 Runtime。

12. 每个 Phase 完成测试和验收后再进入下一个 Phase。
```

---

# 23. 每个 Codex Task 的执行格式

每项开发固定执行：

```text
1. Inspect Existing Code

2. Identify Harness Reuse

3. Define Minimal Change

4. Implement

5. Add Tests

6. Run Tests

7. Update Docs
```

完成后输出：

```text
Task

Goal

Harness Reused

Files Added

Files Modified

Database Changes

Tests

Test Result

Known Limitation

Next Dependency
```

---

# 24. Codex 第一轮任务

拿到本计划以后，第一轮只执行：

```text
PHASE 0
```

不要直接创建整个业务框架。

首先输出：

```text
00-stack-baseline.md

01-harness-capability-map.md

02-gap-analysis.md

03-module-layout.md

04-complex-experiment-ground-truth.md

05-development-map.md
```

其中 `05-development-map.md` 必须将本计划中的 8 个模块映射到当前真实代码：

| 模块                | Harness现有能力 | Reuse / Extend / New | 实际目录 | Phase |
| ----------------- | ----------- | -------------------- | ---- | ----- |
| Experiment Domain |             |                      |      |       |
| Skill System      |             |                      |      |       |
| Agent Layer       |             |                      |      |       |
| Knowledge Layer   |             |                      |      |       |
| Compiler          |             |                      |      |       |
| Runtime           |             |                      |      |       |
| Device Layer      |             |                      |      |       |
| Intelligence Loop |             |                      |      |       |

完成以后再进入 PHASE 1。

---

# 25. 最终验收

第一阶段最终必须实现：

```text
Complex Protocol
↓
Planner
↓
RAG / Skill / History
↓
Experiment IR
↓
Verifier
↓
Validator
↓
Skill Expansion
↓
Execution Graph
↓
Human Review
↓
Experiment Runtime
↓
Device Gateway
↓
Real Hardware / Manual
↓
Observation
↓
QC
↓
Exception / Replanning
↓
Result
↓
Report
↓
Skill Candidate
```

并且能够在不修改核心 Runtime 的情况下完成：

```text
Protocol Variant

Device Replacement

Fault Injection
```

最终验证目标：

```text
复杂实验能力
+
Skill动态组合
+
真实硬件执行
+
闭环反馈
+
异常恢复
+
跨实验复用
+
非Hardcode通用性
```

如果这些成立，则认为第一阶段 Agent 通用自动化实验室原型验证成功。
