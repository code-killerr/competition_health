import type {
  LabArtifactRecord,
  LabEvidenceRecord,
  LabExperimentRecord,
  LabKnowledgeItem,
  LabProjectRecord,
  LabProjectFileDownload,
  LabProjectFilePreview,
  LabProjectFileRecord,
  LabProjectFileRevisionEvent,
  LabProjectView,
  LabReportView,
  LabResultAssessmentRecord,
  LabRunComparisonView,
  LabRun,
  LabSkillRevision,
  LabValidation,
  LabWorkflowRecord,
} from '../api.ts'
import type { LabAgentLifecycleProjection, LabPresentationScope } from '../lifecycle.ts'
import type { LabKnowledgeScopeView, LabProjectFileAdapter, LabProjectFileEventListener, LabQueryState, LabWorkbenchAdapter } from '../adapter.ts'

/** Deterministic scenarios used to exercise the Agent-led workbench without a Host. */
export type LabFixtureScenario = 'success' | 'waiting' | 'failed' | 'replan'

/** Stable IDs shared by every fixture scenario. No business ID is generated at runtime. */
export const LAB_FIXTURE_IDS = {
  workspaceId: 'workspace-fixture',
  projectId: 'project-fixture',
  sessionId: 'session-fixture',
  experimentId: 'experiment-fixture',
  planId: 'plan-fixture',
  skillId: 'skill-fixture',
  revisionId: 'skill-revision-fixture',
  runId: 'run-fixture',
  artifactId: 'artifact-fixture',
  projectConfigFileId: 'project-file-config-fixture',
  conversationOutputFileId: 'project-file-conversation-fixture',
  runArtifactFileId: 'project-file-artifact-fixture',
  documentId: 'document-fixture',
  versionId: 'version-fixture',
  citationId: 'citation-fixture',
} as const

const FIXTURE_TIME = 1_700_000_000_000
const EVIDENCE: LabEvidenceRecord = {
  version: 1,
  projectId: LAB_FIXTURE_IDS.projectId,
  sessionId: LAB_FIXTURE_IDS.sessionId,
  experimentId: LAB_FIXTURE_IDS.experimentId,
  kind: 'run',
  referenceId: LAB_FIXTURE_IDS.runId,
  status: 'READY',
  updatedAt: FIXTURE_TIME,
}
const ARTIFACT: LabArtifactRecord = {
  artifactId: LAB_FIXTURE_IDS.artifactId,
  runId: LAB_FIXTURE_IDS.runId,
  kind: 'json',
  displayName: 'fixture-observation.json',
  uri: 'lab-artifact://run-fixture/fixture-observation.json',
  mediaType: 'application/json',
  size: 128,
  digest: 'sha256:fixture',
  createdAt: FIXTURE_TIME,
}
const PROJECT_FILES: readonly LabProjectFileRecord[] = [
  {
    projectFileId: LAB_FIXTURE_IDS.projectConfigFileId,
    projectId: LAB_FIXTURE_IDS.projectId,
    group: 'configuration',
    displayName: 'workflow.plan.json',
    relativePath: 'configuration/workflow.plan.json',
    mediaType: 'application/json',
    size: 256,
    digest: 'sha256:fixture-project-config',
    revision: 1,
    createdAt: FIXTURE_TIME,
  },
  {
    projectFileId: LAB_FIXTURE_IDS.conversationOutputFileId,
    projectId: LAB_FIXTURE_IDS.projectId,
    group: 'conversation-output',
    displayName: 'goal-summary.md',
    relativePath: 'conversation-output/goal-summary.md',
    mediaType: 'text/markdown',
    size: 192,
    digest: 'sha256:fixture-conversation-output',
    revision: 1,
    createdAt: FIXTURE_TIME,
  },
  {
    projectFileId: LAB_FIXTURE_IDS.runArtifactFileId,
    projectId: LAB_FIXTURE_IDS.projectId,
    group: 'run-artifacts',
    displayName: ARTIFACT.displayName,
    relativePath: 'run-artifacts/fixture-observation.json',
    mediaType: ARTIFACT.mediaType,
    size: ARTIFACT.size,
    digest: ARTIFACT.digest,
    revision: 1,
    createdAt: ARTIFACT.createdAt,
    runId: ARTIFACT.runId,
    artifactId: ARTIFACT.artifactId,
  },
]
const PROJECT: LabProjectRecord = {
  projectId: LAB_FIXTURE_IDS.projectId,
  workspaceId: LAB_FIXTURE_IDS.workspaceId,
  name: 'Fixture Project',
  description: 'Deterministic Agent-led workbench fixture',
  status: 'ACTIVE',
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
}
const EXPERIMENT: LabExperimentRecord = {
  experimentId: LAB_FIXTURE_IDS.experimentId,
  projectId: LAB_FIXTURE_IDS.projectId,
  title: 'Fixture experiment',
  objective: 'Verify the Agent-led workbench flow',
  status: 'ACTIVE',
  createdInSessionId: LAB_FIXTURE_IDS.sessionId,
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
}
const WORKFLOW: LabWorkflowRecord = {
  planId: LAB_FIXTURE_IDS.planId,
  experimentId: LAB_FIXTURE_IDS.experimentId,
  revision: 1,
  status: 'LOCKED',
  steps: [{ stepId: 'step-fixture', title: 'Collect fixture observation', operationKind: 'device', deviceId: 'device-fixture', deviceCapability: 'measure', expectedOutputs: ['evidence-fixture'] }],
  skillRevisionIds: [LAB_FIXTURE_IDS.revisionId],
  unresolved: [],
}
const EXPERIMENT_SESSION = { projectId: LAB_FIXTURE_IDS.projectId, experimentId: LAB_FIXTURE_IDS.experimentId, sessionId: LAB_FIXTURE_IDS.sessionId, role: 'created' as const, linkedBy: 'fixture-agent', linkedAt: FIXTURE_TIME }
const KNOWLEDGE: LabKnowledgeItem = {
  documentId: LAB_FIXTURE_IDS.documentId,
  versionId: LAB_FIXTURE_IDS.versionId,
  sourceName: 'fixture-protocol.pdf',
  status: 'READY',
}
const SKILL: LabSkillRevision = {
  skillId: LAB_FIXTURE_IDS.skillId,
  revisionId: LAB_FIXTURE_IDS.revisionId,
  name: 'Fixture measurement skill',
  status: 'ACTIVE',
  purpose: 'Collect one deterministic observation',
  definitionHash: 'sha256:fixture-skill',
  revision: 1,
}
const VALIDATION: LabValidation = { valid: true, issues: [] }

/** Exposes one fixed Project view for all fixture scenarios. */
const PROJECT_VIEW: LabProjectView = {
  project: PROJECT,
  sources: [{ projectId: LAB_FIXTURE_IDS.projectId, documentId: LAB_FIXTURE_IDS.documentId, versionId: LAB_FIXTURE_IDS.versionId, selectedAt: FIXTURE_TIME, selectedBy: 'fixture-agent', status: 'READY' }],
  devices: [{ projectId: LAB_FIXTURE_IDS.projectId, deviceId: 'device-fixture', id: 'device-fixture', selectedAt: FIXTURE_TIME, selectedBy: 'fixture-agent' }],
  sessions: [{ projectId: LAB_FIXTURE_IDS.projectId, sessionId: LAB_FIXTURE_IDS.sessionId, title: 'Fixture Agent session', order: 1, status: 'ACTIVE', createdAt: FIXTURE_TIME, updatedAt: FIXTURE_TIME }],
  sharedFacts: [{ factId: 'fact-fixture', projectId: LAB_FIXTURE_IDS.projectId, content: 'Fixture facts are Host-owned in the real adapter.', citationIds: [LAB_FIXTURE_IDS.citationId], approvedBy: 'fixture-agent', createdAt: FIXTURE_TIME }],
  evidence: [EVIDENCE],
  experiments: [EXPERIMENT],
  experimentSessions: [EXPERIMENT_SESSION],
}

/** A deterministic run record for a fixture scenario. */
function fixtureRun(scenario: LabFixtureScenario): LabRun {
  const status = scenario === 'success' ? 'COMPLETED' : scenario === 'waiting' ? 'WAITING_CONFIRMATION' : scenario === 'failed' ? 'FAILED' : 'BLOCKED'
  const observationStatus = scenario === 'waiting' ? 'WAITING' : scenario === 'failed' ? 'FAILED' : 'COMPLETED'
  const observation = {
    stepId: 'step-fixture',
    operationId: 'operation-fixture',
    valid: scenario === 'success',
    evidence: ['evidence-fixture'],
    artifactIds: [LAB_FIXTURE_IDS.artifactId],
    status: observationStatus,
    replanRequested: scenario === 'replan',
    ...(scenario === 'failed' ? { error: 'Fixture step failed' } : {}),
  } as const
  return {
    runId: LAB_FIXTURE_IDS.runId,
    planId: LAB_FIXTURE_IDS.planId,
    runStatus: status,
    currentStepId: 'step-fixture',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
    planStatus: 'LOCKED',
    executionGraph: WORKFLOW,
    observations: [observation],
    artifacts: [ARTIFACT],
    feedback: { status, valid: scenario === 'success', summary: scenario === 'success' ? 'Fixture run completed' : `Fixture run is ${scenario}`, issues: scenario === 'success' ? [] : [`fixture-${scenario}`], replanRequested: scenario === 'replan' },
    ...(scenario === 'replan' ? { replanRequest: { runId: LAB_FIXTURE_IDS.runId, stepId: 'step-fixture', reason: 'Fixture demonstrates a replanning gate' } } : {}),
  }
}

/** Assessment is a fixed fixture record; it is not calculated from observations. */
function fixtureAssessment(scenario: LabFixtureScenario): LabResultAssessmentRecord {
  const status = scenario === 'success' ? 'PASSED' : scenario === 'waiting' ? 'HUMAN_QC' : scenario === 'failed' ? 'FAILED' : 'PENDING'
  return { status, verdict: status === 'PASSED' ? 'PASS' : status === 'FAILED' ? 'FAIL' : 'INCONCLUSIVE', method: 'fixture-record', evidenceIds: [LAB_FIXTURE_IDS.citationId], humanQcRequired: status === 'HUMAN_QC', ...(status !== 'HUMAN_QC' ? { assessedBy: 'fixture-agent' } : {}), ...(status !== 'PENDING' ? { assessedAt: FIXTURE_TIME } : {}) }
}

function fixtureReport(scenario: LabFixtureScenario, run: LabRun): LabReportView {
  return { runId: LAB_FIXTURE_IDS.runId, experimentId: LAB_FIXTURE_IDS.experimentId, planId: LAB_FIXTURE_IDS.planId, status: run.runStatus, observations: run.observations ?? [], artifacts: [ARTIFACT], skillRevisionIds: [LAB_FIXTURE_IDS.revisionId], citations: [{ projectId: LAB_FIXTURE_IDS.projectId, documentId: LAB_FIXTURE_IDS.documentId, versionId: LAB_FIXTURE_IDS.versionId, location: 'page:1/block:1', ...KNOWLEDGE.sourceName === undefined ? {} : { sourceName: KNOWLEDGE.sourceName } }], feedback: run.feedback ?? { status: run.runStatus, valid: false, summary: 'Fixture report', issues: [], replanRequested: false }, ...(run.replanRequest ? { replanRequest: run.replanRequest } : {}), assessment: fixtureAssessment(scenario) }
}

function ready<T>(value: T): LabQueryState<T> {
  return { state: 'ready', value }
}

function empty<T>(message: string): LabQueryState<T> {
  return { state: 'empty', code: 'NO_RECORDS', message }
}

function projectFileUnauthorized<T>(message: string): LabQueryState<T> {
  return { state: 'unavailable', code: 'PROJECT_FILE_NOT_AUTHORIZED', message, retryable: false }
}

/** Lifecycle events shown in the Agent conversation for one deterministic scenario. */
function fixtureEvents(scenario: LabFixtureScenario, run: LabRun, report: LabReportView): readonly LabAgentLifecycleProjection[] {
  const events: LabAgentLifecycleProjection[] = [
    { kind: 'goal', status: 'ready', objective: EXPERIMENT.objective, missingInputs: [] },
    { kind: 'knowledge', status: 'ready', sources: [KNOWLEDGE], citationIds: [LAB_FIXTURE_IDS.citationId], citations: [{ projectId: LAB_FIXTURE_IDS.projectId, documentId: LAB_FIXTURE_IDS.documentId, versionId: LAB_FIXTURE_IDS.versionId, location: 'page:1/block:1', ...KNOWLEDGE.sourceName === undefined ? {} : { sourceName: KNOWLEDGE.sourceName } }] },
    { kind: 'workflow-proposal', status: 'locked', workflow: WORKFLOW, validation: VALIDATION },
    { kind: 'skill-proposal', status: 'active', revision: SKILL, validation: VALIDATION },
    { kind: 'execution', status: run.runStatus, run },
  ]
  if (scenario === 'waiting') events.splice(2, 0, { kind: 'capability-gap', status: 'waiting', capability: 'device:measure', missing: ['measure'], message: 'Fixture capability is unavailable' })
  if (scenario === 'replan') events.push({ kind: 'replan', status: 'proposed', runId: LAB_FIXTURE_IDS.runId, reason: 'Fixture demonstrates a replanning gate', replacementPlanId: 'plan-fixture-replacement' })
  events.push({ kind: 'result-assessment', status: scenario === 'success' ? 'passed' : scenario === 'failed' ? 'failed' : scenario === 'waiting' ? 'human-qc' : 'pending', runId: LAB_FIXTURE_IDS.runId, assessment: fixtureAssessment(scenario) })
  if (scenario === 'success' || scenario === 'failed') events.push({ kind: 'report', status: 'ready', report, evidence: [EVIDENCE] })
  return events
}

/** Adapter exposed by the fixture; actions return fixed DTOs and never mutate Host state. */
export interface LabFixtureAdapter extends LabWorkbenchAdapter {
  readonly scenario: LabFixtureScenario
  readonly events: readonly LabAgentLifecycleProjection[]
  readonly presentationScope: LabPresentationScope
  readonly listProjectFiles: LabProjectFileAdapter['listProjectFiles']
  readonly openProjectFile: LabProjectFileAdapter['openProjectFile']
  readonly downloadProjectFile: LabProjectFileAdapter['downloadProjectFile']
  readonly subscribeProjectFileEvents: LabProjectFileAdapter['subscribeProjectFileEvents']
  readonly projectFileEvents: readonly LabProjectFileRevisionEvent[]
  readonly publishProjectFileRevision: (file: LabProjectFileRecord) => void
}

/** Create a deterministic adapter for a success, waiting, failed, or replanning transcript.
 * @param scenario - Fixture lifecycle scenario to expose.
 * @returns An adapter containing the scenario's records and event transcript.
 */
export function createLabFixtureAdapter(scenario: LabFixtureScenario): LabFixtureAdapter {
  const run = fixtureRun(scenario)
  const report = fixtureReport(scenario, run)
  const resultAssessment = fixtureAssessment(scenario)
  let currentProjectFiles = PROJECT_FILES
  const projectFileListeners = new Set<LabProjectFileEventListener>()
  const projectFileEvents: LabProjectFileRevisionEvent[] = []
  const listProjectFiles = async (projectId: string): Promise<LabQueryState<readonly LabProjectFileRecord[]>> => projectId === LAB_FIXTURE_IDS.projectId ? ready(currentProjectFiles) : empty('Fixture Project is not authorized')
  const openProjectFile = async (projectId: string, projectFileId: string): Promise<LabQueryState<LabProjectFilePreview>> => {
    const file = currentProjectFiles.find(item => item.projectId === projectId && item.projectFileId === projectFileId)
    if (file === undefined) return projectFileUnauthorized('Fixture Project file is not authorized')
    if (file.group === 'configuration') return ready({ kind: 'json', content: { planId: LAB_FIXTURE_IDS.planId, revision: file.revision, source: 'fixture' } })
    if (file.group === 'conversation-output') return ready({ kind: 'text', content: 'Fixture conversation output' })
    return ready({ kind: 'json', content: { artifactId: file.artifactId ?? null, runId: file.runId ?? null, status: 'READY' } })
  }
  const downloadProjectFile = async (projectId: string, projectFileId: string): Promise<LabQueryState<LabProjectFileDownload>> => {
    const file = currentProjectFiles.find(item => item.projectId === projectId && item.projectFileId === projectFileId)
    if (file === undefined) return projectFileUnauthorized('Fixture Project file is not authorized')
    return ready({ projectFileId: file.projectFileId, displayName: file.displayName, mediaType: file.mediaType, downloadToken: `fixture-download-${file.projectFileId}-${file.revision}` })
  }
  const adapter: LabFixtureAdapter = {
    scenario,
    events: fixtureEvents(scenario, run, report),
    presentationScope: {
      activeProjectId: LAB_FIXTURE_IDS.projectId,
      registeredViews: ['projects', 'knowledge', 'devices', 'project', 'experiment', 'run', 'evidence', 'citation'],
      projectIds: [LAB_FIXTURE_IDS.projectId],
      experiments: [{ projectId: LAB_FIXTURE_IDS.projectId, experimentId: LAB_FIXTURE_IDS.experimentId }],
      runs: [{ projectId: LAB_FIXTURE_IDS.projectId, experimentId: LAB_FIXTURE_IDS.experimentId, runId: LAB_FIXTURE_IDS.runId }],
      artifacts: [{ runId: LAB_FIXTURE_IDS.runId, artifactId: LAB_FIXTURE_IDS.artifactId }],
      citations: [{ projectId: LAB_FIXTURE_IDS.projectId, documentId: LAB_FIXTURE_IDS.documentId, versionId: LAB_FIXTURE_IDS.versionId }],
    },
    get projectFileEvents() { return projectFileEvents },
    publishProjectFileRevision: file => {
      currentProjectFiles = [...currentProjectFiles.filter(item => item.projectFileId !== file.projectFileId), file]
      const event: LabProjectFileRevisionEvent = { type: 'project-file-revision', projectId: file.projectId, projectFileId: file.projectFileId, group: file.group, revision: file.revision }
      projectFileEvents.push(event)
      for (const listener of projectFileListeners) listener(event)
    },
    listProjects: async () => ready([PROJECT]),
    openProject: async projectId => projectId === LAB_FIXTURE_IDS.projectId ? ready(PROJECT_VIEW) : empty('Fixture Project is not authorized'),
    listExperiments: async projectId => projectId === LAB_FIXTURE_IDS.projectId ? ready([EXPERIMENT]) : empty('Fixture Project is not authorized'),
    openExperiment: async (projectId, experimentId) => projectId === LAB_FIXTURE_IDS.projectId && experimentId === LAB_FIXTURE_IDS.experimentId ? ready(EXPERIMENT) : empty('Fixture Experiment is not authorized'),
    listRuns: async experimentId => experimentId === LAB_FIXTURE_IDS.experimentId ? ready([run]) : empty('Fixture Experiment is not authorized'),
    compareRuns: async (leftRunId, rightRunId) => leftRunId === LAB_FIXTURE_IDS.runId && rightRunId === `${LAB_FIXTURE_IDS.runId}-retry` ? ready({ leftRunId, rightRunId, status: { left: 'FAILED', right: 'COMPLETED' }, durationMs: { left: 1200, right: 900 }, parameters: { left: [{ stepId: 'step-fixture', values: { temperature: { value: 25, unit: 'C' } } }], right: [{ stepId: 'step-fixture', values: { temperature: { value: 30, unit: 'C' } } }] }, stepStatuses: [{ stepId: 'step-fixture', left: 'FAILED', right: 'COMPLETED' }], observations: [{ stepId: 'step-fixture', left: { operationId: 'operation-fixture', status: 'FAILED', valid: false, artifactIds: [LAB_FIXTURE_IDS.artifactId] }, right: { operationId: 'operation-fixture-retry', status: 'COMPLETED', valid: true, artifactIds: [LAB_FIXTURE_IDS.artifactId] } }], artifactCounts: { left: 1, right: 1 }, artifactMetadata: { left: [{ artifactId: LAB_FIXTURE_IDS.artifactId, displayName: ARTIFACT.displayName, kind: ARTIFACT.kind, mediaType: ARTIFACT.mediaType, size: ARTIFACT.size, digest: ARTIFACT.digest, createdAt: ARTIFACT.createdAt }], right: [{ artifactId: LAB_FIXTURE_IDS.artifactId, displayName: ARTIFACT.displayName, kind: ARTIFACT.kind, mediaType: ARTIFACT.mediaType, size: ARTIFACT.size, digest: ARTIFACT.digest, createdAt: ARTIFACT.createdAt }] } } satisfies LabRunComparisonView) : empty('Fixture Runs are not authorized'),
    openRun: async runId => runId === LAB_FIXTURE_IDS.runId ? ready(run) : empty('Fixture Run is not authorized'),
    listArtifacts: async runId => runId === LAB_FIXTURE_IDS.runId ? ready([ARTIFACT]) : empty('Fixture Run is not authorized'),
    openArtifact: async (runId, artifactId) => runId === LAB_FIXTURE_IDS.runId && artifactId === LAB_FIXTURE_IDS.artifactId ? ready({ ...ARTIFACT, preview: { kind: 'json', content: { artifactId: ARTIFACT.artifactId, status: 'READY' } } }) : empty('Fixture Artifact is not authorized'),
    listProjectFiles,
    openProjectFile,
    downloadProjectFile,
    subscribeProjectFileEvents: listener => { projectFileListeners.add(listener); return () => { projectFileListeners.delete(listener) } },
    buildReport: async runId => runId === LAB_FIXTURE_IDS.runId ? ready(report) : empty('Fixture Run is not authorized'),
    getWorkflow: async experimentId => experimentId === LAB_FIXTURE_IDS.experimentId ? ready(WORKFLOW) : empty('Fixture Experiment is not authorized'),
    listSkillRevisions: async experimentId => experimentId === LAB_FIXTURE_IDS.experimentId ? ready([SKILL]) : empty('Fixture Experiment is not authorized'),
    getResultAssessment: async runId => runId === LAB_FIXTURE_IDS.runId ? scenario === 'waiting' ? { state: 'waiting', code: 'HUMAN_QC_REQUIRED', message: 'Fixture requires human QC' } : ready(resultAssessment) : empty('Fixture Run is not authorized'),
    getKnowledgeScope: async projectId => projectId === undefined || projectId === LAB_FIXTURE_IDS.projectId ? ready({ capability: { state: 'available' }, sources: [KNOWLEDGE], evidence: [EVIDENCE] } satisfies LabKnowledgeScopeView) : empty('Fixture Project is not authorized'),
    validatePlan: async planId => planId === LAB_FIXTURE_IDS.planId ? ready(VALIDATION) : empty('Fixture Plan is not authorized'),
    validateSkill: async revisionId => revisionId === LAB_FIXTURE_IDS.revisionId ? ready(VALIDATION) : empty('Fixture Skill is not authorized'),
    createProject: async () => PROJECT_VIEW,
    archiveProject: async () => PROJECT_VIEW,
    createExperiment: async () => EXPERIMENT,
    deriveExperiment: async () => EXPERIMENT,
    linkExperimentSession: async () => PROJECT_VIEW,
    approvePlan: async () => WORKFLOW,
    approveSkill: async () => ({ ...SKILL, status: 'HUMAN_APPROVED' }),
    activateSkill: async () => SKILL,
    startRun: async () => run,
    stopRun: async () => run,
    retryRun: async () => {
      const next = { ...run, runId: `${run.runId ?? 'run'}-retry`, runStatus: 'COMPLETED' as const }
      return run.runId === undefined ? next : { ...next, retryOfRunId: run.runId }
    },
    confirmStep: async () => run,
  }
  return adapter
}

/** Serialize fixture events for snapshot tests without adding persistence semantics.
 * @param events - Lifecycle events to encode.
 * @returns The JSON event transcript.
 */
export function serializeLabFixtureEvents(events: readonly LabAgentLifecycleProjection[]): string {
  return JSON.stringify(events)
}

/** Parse serialized fixture events at the JSON boundary for deterministic replay tests.
 * @param serialized - JSON event transcript to decode.
 * @returns The decoded lifecycle event list.
 */
export function parseLabFixtureEvents(serialized: string): readonly LabAgentLifecycleProjection[] {
  const parsed: unknown = JSON.parse(serialized)
  if (!Array.isArray(parsed) || parsed.some(event => typeof event !== 'object' || event === null || typeof (event as { kind?: unknown }).kind !== 'string')) throw new Error('Invalid fixture lifecycle transcript')
  return parsed as readonly LabAgentLifecycleProjection[]
}
