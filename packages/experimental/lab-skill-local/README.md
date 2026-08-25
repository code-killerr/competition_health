# @deepseek-ai/dsh-experimental-lab-skill-local

Process-local Provider for the experimental laboratory Skill lifecycle.

The Provider owns draft validation, human approval, activation, retirement, and immutable run snapshots. Active revisions are exposed through the existing `ctx.skills` provider registry. Durable storage and installed resource management remain later increments.
