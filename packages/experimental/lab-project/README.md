# @deepseek-ai/dsh-experimental-lab-project

English | [中文](README.zh.md)

Durable project and multi-Session conversation records for the opt-in laboratory workflow.

The package owns laboratory project identities, explicit Knowledge source/version and device associations, Session titles/order, approved shared facts, audit records, and rebuildable plan/run/report evidence. It uses the existing Storage Domain lifecycle and keeps Harness Session logs authoritative for messages and tool events.

Project and Agent code consumes Knowledge through the read-only `LabKnowledgeConsumer` seam. The package does not parse files, access Knowledge Provider databases, or implement retrieval.
