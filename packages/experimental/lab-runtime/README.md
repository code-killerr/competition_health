# @deepseek-ai/dsh-experimental-lab-runtime

Service Definition for approved-plan locking, controlled experiment runs, human confirmations, safe stop, recoverable state, and reports.

Runtime does not call the LLM, read raw SOP files, or accept arbitrary device commands. A Provider will build the execution graph from approved plan and Skill snapshots.

## Model Experience

Consumers may show plan approval, waiting steps, observations, failures, and final reports. Runtime state is exposed as structured evidence rather than hidden prompt text.

### Token impact

Only current step state, required confirmation, and bounded evidence should be returned to the Agent.

### KV-cache impact

Run and Skill revision identities are durable and must remain stable across later retries or process recovery.

## Known Limitations and Deferred Work

- No ExecutionGraph or local Runtime Provider is included yet.
- Cross-process recovery and production scheduling are outside the first increment.
