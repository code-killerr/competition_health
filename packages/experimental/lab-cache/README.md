# @deepseek-ai/dsh-experimental-lab-cache
English | [中文](README.zh.md)

Shared Session/Storage projection Consumer for the experimental laboratory workflow. It gives Web and Agent tool Consumers one owner for the `lab_experiment_cache` domain, so the same experiment cache is not opened twice when both paths are enabled.

The Consumer records no model-visible data by itself. Callers append the corresponding laboratory Session event and then call `ctx.labExperimentCache.project(...)` with the Runtime projection. Without Storage, the service remains an explicit no-op for keyless composition tests.

## Scope

- owns the versioned `lab_experiment_cache` Storage domain;
- exposes a small projection writer for Web and Agent Consumers;
- does not read Provider databases, execute Skills, or create an Agent loop.
