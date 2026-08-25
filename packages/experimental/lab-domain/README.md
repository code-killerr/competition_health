# @deepseek-ai/dsh-experimental-lab-domain

Shared laboratory domain ids, lifecycle states, experiment requests, plan steps, deterministic validation results, and Session event declarations for the first-round prototype.

## Model Experience

This package adds no model-facing tool or prompt. It defines the durable vocabulary used by Knowledge, Skill, Device, and Runtime consumers.

### Token impact

None directly. Consumers decide which validated domain values enter model context.

### KV-cache impact

None directly. Session event types are designed so model-visible decisions remain reconstructable.

## Known Limitations and Deferred Work

- It does not persist documents, Skills, devices, or runs.
- It does not encode any Space ATAC or mouse-brain-specific protocol.
- It validates plan data only; it does not call a model, request human approval, or execute devices.
