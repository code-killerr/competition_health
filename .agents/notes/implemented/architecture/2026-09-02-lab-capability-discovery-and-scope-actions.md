---
title: LABWEAVE capability discovery and Host-owned scope actions
kind: architecture
status: implemented
date: 2026-09-02
---

# LABWEAVE capability discovery and Host-owned scope actions

## Problem

The root Knowledge view was tied to an Experiment, so users could not import or search knowledge before an Experiment existed. The Devices view only exposed Experiment-scoped records and had no Project action. The Agent could query individual Knowledge records but could not discover the available Knowledge inventory or configured device capabilities before planning.

## Decision

Keep Knowledge imports, device registration, Project scope, and authorization in Host services. Add a global Knowledge snapshot for the root view. Add read-only `lab_knowledge_catalog` and `lab_device_catalog` Agent tools. Let the Devices and Knowledge views update Project scope only through Host actions; the Agent may discover and plan from these records but may not import bytes, reserve or command devices, or bypass approval gates.

## Consequences

Knowledge and configured devices are discoverable before an Experiment exists. Project source and device selection remain durable and session-scoped through the existing Host `project-scope-update` operation. LABWEAVE can inspect current capabilities before generating a plan, while execution and approval ownership remain unchanged.
