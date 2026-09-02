# Agent Note: Host-owned Agent experiment bootstrap

Status: implemented

English | [中文](2026-09-02-lab-agent-host-bootstrap-idempotency.zh.md)

## Problem

An Agent needs one product entry point that can turn the current Session context into a Project Experiment without inventing Project or Experiment identities, while a retry must not create a second Project record, Runtime record, or Session request.

## Decision

The Agent calls `lab_experiment_create` with the current Session and experiment metadata only. The Host resolves the Session's Project, generates the Experiment ID, writes the Project and Runtime records with that identity, and returns typed progress with the destination and allowed next actions. The Project audit stores the tool operation identity and rejects reuse with different Experiment metadata. The Runtime accepts an identical request replay for the same Experiment ID and rejects conflicting metadata.

The Host appends Project-created and Experiment-requested Session events when they are absent, including during a replay, so a partial failure can repair the model-visible evidence without duplicating events. Project or Workspace creation and human-controlled plan, Skill, and run transitions remain Host or UI operations.

## Alternatives considered

**Let the Agent supply Project and Experiment IDs.** Rejected because the Agent cannot authoritatively know Host-owned identities and could bind records across Projects.

**Keep a proposal-only Agent tool and require a UI handoff before creation.** Rejected because it leaves the Agent lifecycle without a single creation operation and makes a normal retry depend on a fragile presentation step.

**Treat retries as errors after the first write.** Rejected because a partial failure between Project, Runtime, and Session writes would leave the Agent without a recoverable destination.

## Consequences

Agent experiment creation is composable through the existing tool Consumer and Host Facade, and the same operation can be retried safely. Typed blocked progress still directs a human to select a Workspace when the current Session has no Project. The operation identity and Experiment identity are durable in Project audits and Session events; expected outputs remain Runtime request data. The composed tool test verifies registration, same-operation replay, and the no-Project human handoff.
