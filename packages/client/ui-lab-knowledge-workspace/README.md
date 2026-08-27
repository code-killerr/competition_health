# ui-lab-knowledge-workspace

English | [中文](README.zh.md)

Independent dsh.client Knowledge workspace for the current laboratory MVP. It mounts into the public lab.knowledge.workspace slot declared by ui-lab-workbench and uses only the typed /api/lab Facade for PDF import, READY status, citation retrieval, fact confirmation, SOP review and publication.

## Model Experience

### Browser Consumer

#### What the model sees

The package adds no model-facing tool. The Harness Agent sees only existing project-scoped Knowledge tools and confirmed citations; the browser workspace stays on `/api/lab`.

#### Token effect

The browser workspace does not send model requests.

#### KV Cache effect

No browser state is added to model context.

## Known Limitations and Deferred Work

- The workspace requires the opt-in lab Web composition and a mounted /api/lab Facade; it does not submit model-backed plans.
