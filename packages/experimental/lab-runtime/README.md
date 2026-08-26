# @deepseek-ai/dsh-experimental-lab-runtime
English | [中文](README.zh.md)

Service Definition for approved-plan locking, controlled experiment runs, human confirmations, safe stop, and structured reports.

Runtime accepts an approved plan revision, optional execution steps, and ACTIVE Skill snapshots. A Provider freezes these inputs into an ExecutionGraph. Consumers advance one step at a time through executeNextStep, submit evidence through confirmStep, request stop through stopRun, and read observations through RunView or buildReport.

Runtime never calls the LLM, reads raw SOP files, or accepts arbitrary device commands. Device side effects are delegated to the Lab Device Service; human and approval operations remain waiting until evidence is supplied. Script and API operations are represented as blocked observations by the local Provider.

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
- Production devices, scheduling, permission policy, and remote feedback remain outside this opt-in experimental package.
