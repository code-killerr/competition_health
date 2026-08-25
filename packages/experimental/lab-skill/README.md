# @deepseek-ai/dsh-experimental-lab-skill

Service Definition for declarative laboratory Skill drafts, validation, human approval, activation, retirement, and run snapshots.

This capability is separate from Harness `ctx.skills`: `ctx.skills` remains an instruction registry, while this package defines experimental actions and their execution eligibility.

## Model Experience

Consumers may expose Skill drafts and validation errors to the Agent. Activation and execution eligibility are runtime decisions, not prompt claims.

### Token impact

Only the selected Skill summary and citations should enter planning context. Full operational details belong to the approved revision snapshot.

### KV-cache impact

Run snapshots must remain stable after later Skill revisions are activated.

## Known Limitations and Deferred Work

- No persistence or Skill-to-`ctx.skills` bridge is included yet.
- Model-generated scripts remain candidate artifacts and are not executable.
