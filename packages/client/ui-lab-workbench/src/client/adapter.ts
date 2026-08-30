import type {
  LabArtifactRecord,
  LabExperimentRecord,
  LabEvidenceRecord,
  LabKnowledgeCapability,
  LabKnowledgeItem,
  LabValidation,
  LabProjectRecord,
  LabProjectView,
  LabReportView,
  LabResultAssessmentRecord,
  LabRunComparisonView,
  LabRun,
  LabSkillRevision,
  LabWorkflowRecord,
} from './api.ts'

/** Stable error codes that page state may branch on. */
export type LabAdapterErrorCode =
  | 'WORKSPACE_UNAVAILABLE'
  | 'SESSION_CWD_MISMATCH'
  | 'CROSS_PROJECT_REFERENCE'
  | 'ACTIVE_RUN_EXISTS'
  | 'CAPABILITY_UNAVAILABLE'
  | 'ARTIFACT_NOT_AUTHORIZED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_FAILED'
  | 'RESULT_ASSESSMENT_UNAVAILABLE'

/** A query result with explicit lifecycle state and no string parsing requirement. */
export type LabQueryState<T> =
  | { readonly state: 'ready'; readonly value: T }
  | { readonly state: 'empty'; readonly code: 'NO_RECORDS'; readonly message: string }
  | { readonly state: 'waiting'; readonly code: 'APPROVAL_REQUIRED' | 'HUMAN_QC_REQUIRED' | 'RUN_IN_PROGRESS'; readonly message: string }
  | { readonly state: 'unavailable'; readonly code: LabAdapterErrorCode; readonly message: string; readonly retryable: boolean }
  | { readonly state: 'failed'; readonly code: LabAdapterErrorCode; readonly message: string; readonly retryable: boolean }

/** Error emitted by a typed adapter action. */
export class LabWorkbenchError extends Error {
  constructor(readonly code: LabAdapterErrorCode, message: string) {
    super(message)
    this.name = 'LabWorkbenchError'
  }
}

/** Project-scoped Knowledge records exposed to the workbench. */
export interface LabKnowledgeScopeView {
  readonly capability: LabKnowledgeCapability
  readonly sources: readonly LabKnowledgeItem[]
  readonly evidence: readonly LabEvidenceRecord[]
}

/** Read-only queries shared by deterministic and Host-backed adapters. */
export interface LabWorkbenchQueries {
  listProjects(): Promise<LabQueryState<readonly LabProjectRecord[]>>
  openProject(projectId: string): Promise<LabQueryState<LabProjectView>>
  listExperiments(projectId: string): Promise<LabQueryState<readonly LabExperimentRecord[]>>
  openExperiment(projectId: string, experimentId: string): Promise<LabQueryState<LabExperimentRecord>>
  listRuns(experimentId: string): Promise<LabQueryState<readonly LabRun[]>>
  compareRuns(leftRunId: string, rightRunId: string): Promise<LabQueryState<LabRunComparisonView>>
  openRun(runId: string): Promise<LabQueryState<LabRun>>
  listArtifacts(runId: string): Promise<LabQueryState<readonly LabArtifactRecord[]>>
  openArtifact(runId: string, artifactId: string): Promise<LabQueryState<LabArtifactRecord>>
  buildReport(runId: string): Promise<LabQueryState<LabReportView>>
  getWorkflow(experimentId: string): Promise<LabQueryState<LabWorkflowRecord>>
  listSkillRevisions(experimentId: string): Promise<LabQueryState<readonly LabSkillRevision[]>>
  getResultAssessment(runId: string): Promise<LabQueryState<LabResultAssessmentRecord>>
  getKnowledgeScope(projectId?: string): Promise<LabQueryState<LabKnowledgeScopeView>>
  validatePlan(planId: string): Promise<LabQueryState<LabValidation>>
  validateSkill(revisionId: string): Promise<LabQueryState<LabValidation>>
}

/** Typed actions that may change Host-owned records or request human approval. */
export interface LabWorkbenchActions {
  createProject(input: { readonly workspaceId: string; readonly name: string; readonly description?: string }): Promise<LabProjectView>
  archiveProject(projectId: string): Promise<LabProjectView>
  createExperiment(input: { readonly projectId: string; readonly title: string; readonly objective: string }): Promise<LabExperimentRecord>
  deriveExperiment(input: { readonly projectId: string; readonly sourceExperimentId: string; readonly title: string; readonly objective: string }): Promise<LabExperimentRecord>
  linkExperimentSession(input: { readonly projectId: string; readonly experimentId: string; readonly targetSessionId: string; readonly role: 'created' | 'continued' | 'reviewed' }): Promise<LabProjectView>
  approvePlan(input: { readonly experimentId: string; readonly planId: string; readonly approvedBy: string }): Promise<LabWorkflowRecord>
  approveSkill(input: { readonly revisionId: string; readonly approvedBy: string }): Promise<LabSkillRevision>
  activateSkill(revisionId: string): Promise<LabSkillRevision>
  startRun(input: { readonly experimentId: string; readonly planId: string; readonly sessionId?: string }): Promise<LabRun>
  stopRun(input: { readonly runId: string; readonly requestedBy: string }): Promise<LabRun>
  retryRun(input: { readonly runId: string; readonly actor: string }): Promise<LabRun>
  confirmStep(input: { readonly runId: string; readonly evidence: readonly string[]; readonly confirmedBy: string; readonly stepId?: string; readonly operationId?: string }): Promise<LabRun>
}

/**
 * The only data seam used by the laboratory pages and Agent presentation cards.
 * Queries are read-only and actions retain Host ownership of durable records.
 */
export interface LabWorkbenchAdapter extends LabWorkbenchQueries, LabWorkbenchActions {}
