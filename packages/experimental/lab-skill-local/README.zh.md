# @deepseek-ai/dsh-experimental-lab-skill-local
[English](README.md) | 中文

实验自动化 Lab Skill 的进程内 Provider。

本 Provider 负责草案校验、人工批准、激活、退役和运行快照，并通过既有 `ctx.skills` Provider Registry 暴露 ACTIVE 修订。持久化存储和已安装资源管理留待后续增量实现。

## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
