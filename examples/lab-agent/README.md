# Laboratory Automation Development Agent

English | [中文](README.zh.md)

This is an opt-in development overlay over the existing Headless Agent. It does not modify the default profile or embed test data in runtime code.

Prepare a supported Node version and install dependencies:

```sh
source ~/.nvm/nvm.sh
nvm use 24.19.0
pnpm install
pnpm run build
```

Start the laboratory development composition:

```sh
pnpm dsh --profile headless --patch examples/lab-agent/cordis.patch.yml "Use lab_knowledge_import to import the requested source, then search laboratory knowledge for the experiment objective and list the citations"
```

The overlay mounts the laboratory Service Definitions, the SQLite/FTS5 Knowledge Provider, Agent-scoped knowledge and planning tools, the local laboratory Skill Provider, and a configurable Mock Device Provider for development. The default database is `.lab-data/knowledge.sqlite` under the current working directory. Sources are imported by path through the tool; they are not bundled as runtime seed data.

The composition currently exercises knowledge ingestion, status, retrieval, conflicts/fact confirmation, planning-context retrieval, structured plan/Skill proposal, deterministic validation, and Harness Skill discovery for activated laboratory Skills. Human plan approval, device execution, result validation, and the Web surface remain later increments.

Running the Agent requires `DEEPSEEK_API_KEY`, supplied through the git-ignored project-root `.env` or the environment.
