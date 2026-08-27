# experimental/ — private experimental packages

English | [中文](README.zh.md)

This group contains prototypes and internal-only Cordis plugins that use the repository's real runtime without joining an official release. Its packages are private, carry no stability or support promise, and retain the same engineering, security, documentation, lifecycle, testing, and snapshot requirements as release packages.

| Package | Role | ctx key |
|---|---|---|
| `agent-team/` | Implicit-root Agent Teams roster, durable peer mailbox, shared task DAG, and runtime coordination | `ctx.agentTeams` |
| `tool-agent-team/` | Scoped model-facing Agent Teams tools and collaboration guidance | — |
| `lab-domain/` | Shared laboratory domain ids, states, validation rules, and session event types | — |
| `lab-knowledge/` | Laboratory Knowledge Service Definition and Provider seam | `ctx.labKnowledge` |
| `lab-knowledge-local/` | Provider-owned SQLite/FTS5 implementation for local knowledge retrieval | — |
| `tool-lab-knowledge/` | Agent-scoped read-only Knowledge status, retrieval, and conflict tools | — |
| `lab-planning/` | Declarative planning context and proposal Service Definition | `ctx.labPlanning` |
| `lab-planning-local/` | Local Provider for cited planning context and deterministic proposal validation | — |
| `tool-lab-planning/` | Agent-scoped planning context, device capability, and proposal tools | — |
| `lab-skill/` | Declarative laboratory Skill lifecycle Service Definition | `ctx.labSkills` |
| `lab-skill-local/` | Process-local laboratory Skill Provider bridged to `ctx.skills` | — |
| `lab-device/` | Device capability, lease, receipt, and stop Service Definition | `ctx.labDevices` |
| `lab-device-mock/` | Configurable in-memory Device Provider for tests | — |
| `lab-runtime/` | Approved-plan execution Service Definition | `ctx.labRuntime` |
| `lab-mvp/` | Opt-in bundle for the first-round laboratory capabilities | — |

The [subtree rules](AGENTS.md) define dependency isolation, release exclusion, and promotion.
