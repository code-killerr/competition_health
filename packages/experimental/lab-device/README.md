# @deepseek-ai/dsh-experimental-lab-device
English | [中文](README.zh.md)

Service Definition for laboratory device capabilities, health, leases, controlled operations, receipts, status, and safe stop.

The Agent can query this service through a Consumer, but only Runtime may submit an operation through the Device Service.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees approved plans, controlled run states, and bounded observations through the package typed service or `lab_*` tools.

#### Token effect

Only requested plan fields, current-step status, and bounded evidence are returned; local storage details remain host-side.

#### KV Cache effect

Stable experiment, plan, Skill revision, and run identifiers keep repeated step results compact and prefix-friendly.

## Known Limitations and Deferred Work

- This experimental package provides local typed contracts and does not claim production persistence, recovery, or hardware integration.
- Lease persistence, idempotency, and fault injection are planned for I2.
