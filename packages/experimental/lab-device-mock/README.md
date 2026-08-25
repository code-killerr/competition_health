# @deepseek-ai/dsh-experimental-lab-device-mock

Configurable in-memory Lab Device Provider for first-round composition and runtime tests.

It exposes no real hardware transport. Devices are supplied through plugin configuration, and every operation requires a matching run lease and idempotency key.

## Model Experience

This Provider does not add tools or prompts. A Device Consumer may expose its structured capability and receipt values.

### Token impact

None directly; consumers should return bounded capability and receipt data.

### KV-cache impact

Device reservations and receipts are runtime state and must not become an implicit prompt cache.

## Known Limitations and Deferred Work

- State is process-local and is not a real hardware simulation.
- Fault injection and durable leases are deferred to later tests.
