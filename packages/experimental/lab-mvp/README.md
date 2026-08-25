# @deepseek-ai/dsh-experimental-lab-mvp

Opt-in bundle that mounts the first-round laboratory Knowledge, Planning, Lab Skill, Device, and Runtime Service Definitions.

The bundle intentionally mounts no local Provider and changes no default Harness profile. It is a composition seam for I0 and later increments.

## Model Experience

No tools or prompts are added by this bundle. Consumers and Providers own model-visible behavior.

### Token impact

None until a tool Consumer is explicitly composed.

### KV-cache impact

None until a Provider and experiment session are explicitly composed.

## Known Limitations and Deferred Work

- It does not execute experiments, ingest files, or connect to devices by itself.
- A local Provider bundle and tool Consumer are planned for later increments.
