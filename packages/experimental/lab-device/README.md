# @deepseek-ai/dsh-experimental-lab-device

Service Definition for laboratory device capabilities, health, leases, controlled operations, receipts, status, and safe stop.

The Agent can query this service through a Consumer, but only Runtime may submit an operation through the Device Service.

## Model Experience

Device capability summaries may be model-visible during planning. Raw device commands and provider transport details are not model-facing contracts.

### Token impact

Planning receives bounded capability summaries; operation receipts are returned as structured evidence after execution.

### KV-cache impact

Device status is live runtime state and should not be treated as a stable prompt prefix.

## Known Limitations and Deferred Work

- No real hardware or Mock Device Provider is included yet.
- Lease persistence, idempotency, and fault injection are planned for I2.
