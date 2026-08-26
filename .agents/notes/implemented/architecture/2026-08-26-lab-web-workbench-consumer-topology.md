# Agent Note: Lab Web Workbench Consumer topology

Status: implemented

English | [中文](2026-08-26-lab-web-workbench-consumer-topology.zh.md)

## Problem

The first usable laboratory prototype needs a browser workflow that exercises the same Knowledge, Planning, Skill, Device and Runtime capabilities as the host composition. The browser must not become a second provider implementation, and the demonstration data must not turn Space ATAC, mouse-brain spatial transcriptomics or PDF examples into production-specific branches. The workflow also needs durable Session evidence and a refreshable experiment cache without making the existing Agent tools depend on the browser.

## Decision

The browser is an opt-in `dsh.client` overlay exposed by `examples/lab-web/cordis.patch.yml`. It uses the existing DeepSeek Harness client module system, Slot integration and current Agent configuration for the explicit Agent-planning action. Browser commands cross one typed `/api/lab` Web Consumer; the Facade dispatches only to existing capability services and rejects lifecycle conflicts before side effects. The default profile and default API RPC map remain unchanged.

The experiment cache is owned by `packages/experimental/lab-cache` as a small shared Consumer. `lab-mvp` and `tool-lab` install it only when the service is absent, so either composition can own the capability and a combined composition reuses one service. When Session and Storage are present, the Facade records requested, proposed, review, run and feedback events and projects the current experiment into the `lab_experiment_cache` domain. Without those services, direct provider tests retain an explicit non-persistent path rather than silently creating a second persistence system.

The keyless browser fixture contains only a minimal document, plan template, Skill revision and Mock Device. Space ATAC CSV, mouse-brain data and PDF knowledge remain external test inputs; no production command branches on their names or formats.

## Alternatives considered

**Add the workbench to the default Web profile.** Rejected because the laboratory bundle is experimental and needs an explicit opt-in composition while its protocol and fixtures evolve.

**Let browser code call providers or databases directly.** Rejected because it would duplicate lifecycle validation, bypass Session evidence and make the UI responsible for provider selection and persistence details.

**Keep cache ownership inside `tool-lab` and let the Web Facade call it indirectly.** Rejected because the Web Consumer is a separate host surface and would either depend on Agent tool installation or create a parallel projection. A small shared Consumer keeps both surfaces on the same cache vocabulary.

**Encode the Space ATAC or mouse-brain example into the runtime.** Rejected because those files are test data and reference material, not a production workflow discriminator. The fixture proves the generic command sequence instead.

## Consequences

The first-stage prototype is manually runnable through a real browser page and can be tested keylessly from import through report. Browser and Agent paths share service contracts, Session events and cache projection, while the default product profile stays unchanged. The opt-in patch remains the composition entrypoint until the Web protocol, authentication and production deployment policy are reviewed.

The initial cache is a projection, not the authoritative experiment log; Session events remain the recovery source. Direct Facade tests without a Session intentionally do not claim durable evidence. The browser currently demonstrates the workflow and does not provide production authentication, remote deployment or model-backed planning without an explicitly configured Agent.
