# @deepseek-ai/dsh-experimental-lab-device-mock
English | [中文](README.zh.md)

Configurable in-memory Lab Device Provider for first-round composition and runtime tests.

It exposes no real hardware transport. Devices are supplied through plugin configuration, and every operation requires a matching run lease and idempotency key. Tests can configure an unhealthy device or a communication failure without producing a success receipt.

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
- Health, lease, stop, idempotency, and communication-failure behavior are modeled in memory; durable leases and real transport remain outside this Provider.
