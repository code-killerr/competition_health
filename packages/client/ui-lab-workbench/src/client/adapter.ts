import type {
  LabArtifactRecord,
  LabDevice,
  LabProjectFileDownload,
  LabProjectFilePreview,
  LabProjectFileRecord,
  LabProjectFileRevisionEvent,
  LabExperimentRecord,
  LabEvidenceRecord,
  LabKnowledgeCapability,
  LabKnowledgeItem,
  LabValidation,
  LabProjectRecord,
  LabProjectView,
  LabProjectContextView,
  LabPlanReview,
  LabConfigurationCapability,
  LabReportView,
  LabResultAssessmentRecord,
  LabRunComparisonView,
  LabRun,
  LabSkillRevision,
  LabWorkflowRecord,
} from './api.ts'
import type { LabPresentationValidation } from './lifecycle.ts'

/** Stable error codes that page state may branch on. */
export type LabAdapterErrorCode =
  | 'WORKSPACE_UNAVAILABLE'
  | 'SESSION_CWD_MISMATCH'
  | 'CROSS_PROJECT_REFERENCE'
  | 'ACTIVE_RUN_EXISTS'
  | 'CAPABILITY_UNAVAILABLE'
  | 'ARTIFACT_NOT_AUTHORIZED'
  | 'PROJECT_FILE_NOT_AUTHORIZED'
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

/** Read-only configuration capability records supplied by a Host adapter. */
export interface LabConfigurationQueries {
  listConfigurationCapabilities(): Promise<LabQueryState<readonly LabConfigurationCapability[]>>
}

/** Project 文件 revision 到达时调用的监听器。 */
export type LabProjectFileEventListener = (event: LabProjectFileRevisionEvent) => void

/** Host-owned 实验记录发生变化时调用的监听器。 */
export type LabProjectEventListener = () => void

/** Project 文件目录的查询、授权动作和 revision 事件能力。 */
export interface LabProjectFileAdapter {
  listProjectFiles(projectId: string): Promise<LabQueryState<readonly LabProjectFileRecord[]>>
  openProjectFile(projectId: string, projectFileId: string): Promise<LabQueryState<LabProjectFilePreview>>
  downloadProjectFile(projectId: string, projectFileId: string): Promise<LabQueryState<LabProjectFileDownload>>
  subscribeProjectFileEvents(listener: LabProjectFileEventListener): () => void
}

/** Read-only queries shared by deterministic and Host-backed adapters. */
export interface LabWorkbenchQueries {
  listProjects(): Promise<LabQueryState<readonly LabProjectRecord[]>>
  openProject(projectId: string): Promise<LabQueryState<LabProjectView>>
  getProjectContext(projectId: string): Promise<LabQueryState<LabProjectContextView>>
  listDevices(): Promise<LabQueryState<readonly LabDevice[]>>
  listExperiments(projectId: string): Promise<LabQueryState<readonly LabExperimentRecord[]>>
  listExperimentReviews(experimentId: string): Promise<LabQueryState<readonly LabPlanReview[]>>
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
  validatePlan(planId: string, sessionId?: string): Promise<LabQueryState<LabValidation>>
  validateSkill(revisionId: string, sessionId?: string): Promise<LabQueryState<LabValidation>>
}

/** Typed actions that may change Host-owned records or request human approval. */
export interface LabWorkbenchActions {
  createProject(input: { readonly workspaceId: string; readonly name?: string; readonly description?: string; readonly sessionId?: string }): Promise<LabProjectView>
  updateProjectScope(input: { readonly projectId: string; readonly sources: readonly { readonly documentId: string; readonly versionId: string }[]; readonly deviceIds: readonly string[]; readonly sessionId?: string }): Promise<LabProjectView>
  archiveProject(projectId: string): Promise<LabProjectView>
  createExperiment(input: { readonly projectId: string; readonly title: string; readonly objective: string }): Promise<LabExperimentRecord>
  deriveExperiment(input: { readonly projectId: string; readonly sourceExperimentId: string; readonly title: string; readonly objective: string }): Promise<LabExperimentRecord>
  linkExperimentSession(input: { readonly projectId: string; readonly experimentId: string; readonly targetSessionId: string; readonly role: 'created' | 'continued' | 'reviewed' }): Promise<LabProjectView>
  approvePlan(input: { readonly experimentId: string; readonly planId: string; readonly approvedBy: string; readonly sessionId?: string }): Promise<LabWorkflowRecord>
  approveSkill(input: { readonly revisionId: string; readonly approvedBy: string; readonly sessionId?: string }): Promise<LabSkillRevision>
  activateSkill(input: { readonly revisionId: string; readonly sessionId?: string } | string): Promise<LabSkillRevision>
  startRun(input: { readonly experimentId: string; readonly planId: string; readonly sessionId?: string }): Promise<LabRun>
  stopRun(input: { readonly runId: string; readonly requestedBy: string; readonly sessionId?: string }): Promise<LabRun>
  retryRun(input: { readonly runId: string; readonly actor: string; readonly sessionId?: string }): Promise<LabRun>
  confirmStep(input: { readonly runId: string; readonly evidence: readonly string[]; readonly confirmedBy: string; readonly stepId?: string; readonly operationId?: string; readonly sessionId?: string }): Promise<LabRun>
  presentForSession(input: { readonly sessionId: string; readonly value: unknown }): Promise<LabPresentationValidation>
}

/**
 * The only data seam used by the laboratory pages and Agent presentation cards.
 * Queries are read-only and actions retain Host ownership of durable records.
 */
export interface LabWorkbenchAdapter extends LabWorkbenchQueries, LabWorkbenchActions, Partial<LabProjectFileAdapter & LabConfigurationQueries & {
  /** 订阅持久化实验事件，使已打开的 Project 工作台可以重新加载记录。 */
  readonly subscribeProjectEvents: (listener: LabProjectEventListener) => () => void
}> {}
