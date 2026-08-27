# Agent Note: Project shell owns showcase context

Status: implemented

English | [中文](2026-08-28-lab-project-shell-showcase-context.zh.md)

## Problem

The lab browser has public Knowledge and lifecycle capabilities, but a stage-oriented workbench can leave Project identity, selected sources and citation-backed planning disconnected from the page being demonstrated.

## Decision

The Workbench owns a typed Project shell page state and passes the current Project, Experiment, selected READY source records and citation callback to the public Knowledge workspace slot. Project navigation uses application actions and a client navigation event instead of URL hashes. The Knowledge workspace keeps import, retrieval and SOP commands on the public `/api/lab` path; it does not access Provider or storage implementations. Plan generation uses the citation returned by that workspace and keeps human approval as an explicit action.

The existing stage actions remain available behind the Project pages so lifecycle behavior and keyless fixtures continue to use the current Facade and Session paths. Diagnostic JSON previews remain available for development inspection, while source selection and plan review use structured records as the primary controls.

## Alternatives considered

**Keep the seven-stage hash navigation as the product shell.** Rejected because it makes the workflow look like separate experiments and prevents stable Project pages from owning context.

**Make the Knowledge workspace persist Project membership independently.** Rejected because Project scope belongs to the Host-backed Project path; the workspace only reports the selected public source record through its owner callback.

**Keep a raw JSON Plan editor as the main keyless path.** Rejected because the showcase should demonstrate citation-backed planning and explicit review without requiring users to edit opaque IDs.

## Consequences

The showcase now has one continuous Project-oriented entry point while retaining the existing backend services and commands. The public Knowledge contribution remains independently replaceable, and older isolated Knowledge tests can still render without owner context. Full Experiment, Run and Artifact persistence remains a separate follow-up in this OpenSpec change.