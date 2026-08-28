# @deepseek-ai/dsh-experimental-lab-skill-local
[English](README.md) | 中文

实验自动化 Lab Skill 的进程内 Provider。

本 Provider 负责草案校验、人工批准、激活、退役和运行快照，并通过既有 `ctx.skills` Provider Registry 暴露 ACTIVE 修订。持久化存储和已安装资源管理留待后续增量实现。

## 模型体验

### 受控实验上下文

#### 模型看到的内容

模型通过类型化服务或 `lab_*` 工具看到已批准的 Skill 修订、运行快照和当前步骤状态。

#### Token 影响

只返回当前计划所需的 Skill 字段和有边界的运行信息；本地存储细节留在宿主侧。

#### KV Cache 影响

稳定的实验、计划、Skill 修订和运行标识让重复上下文更紧凑，并保持前缀友好。

## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
