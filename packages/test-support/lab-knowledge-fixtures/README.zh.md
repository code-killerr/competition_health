# lab-knowledge-fixtures

[English](README.md) | 中文

当前实验室 Knowledge MVP 的共享无模型测试数据。包内提供本地 PDF fixture 目录、针对真实 PDF 字节的确定性解析器，以及包含 capability、source/version、citation 和已发布 SOP 记录的公开 Knowledge Consumer fixture。

该包只用于测试支持，不是生产 Knowledge API。运行时仍通过公开的 lab-mvp-web Facade 和 lab-project Consumer 约定访问 Knowledge。

## Model Experience

### Knowledge fixture records

#### What the model sees

fixture 为无密钥测试提供已确认的 `citationId` 和已发布的 `sopRevisionId` 记录；它不提供面向模型的工具。

#### Token effect

fixture 包不会发送模型请求，也不会添加提示词内容。

#### KV Cache effect

fixture 包不会创建模型缓存状态。

## Known Limitations and Deferred Work

- fixture 记录覆盖当前 MVP 约定，不替代生产 Knowledge 存储或解析器实现。
