import type { LabResultAssessment, RunView } from './types.ts'

/** Build the Host-owned assessment from the persisted Runtime view.
 * @param run - persisted Run view containing observations and feedback.
 * @returns - assessment that is safe to expose to the Agent and UI.
 */
export function assessRun(run: RunView): LabResultAssessment {
  const evidenceIds = [
    ...run.observations.flatMap(observation => observation.artifactIds.map(String)),
    ...run.observations.map(observation => String(observation.operationId)),
  ]
  if (run.runStatus === 'COMPLETED') {
    return {
      status: 'PASSED',
      verdict: 'PASS',
      method: 'runtime-criteria',
      evidenceIds,
      assessedBy: 'lab-runtime',
      assessedAt: run.updatedAt,
      humanQcRequired: false,
    }
  }
  if (run.runStatus === 'FAILED' || run.runStatus === 'BLOCKED') {
    return {
      status: 'FAILED',
      verdict: 'FAIL',
      method: 'runtime-criteria',
      evidenceIds,
      assessedBy: 'lab-runtime',
      assessedAt: run.updatedAt,
      humanQcRequired: false,
    }
  }
  if (run.runStatus === 'WAITING_CONFIRMATION') {
    return { status: 'HUMAN_QC', verdict: 'INCONCLUSIVE', evidenceIds, humanQcRequired: true }
  }
  return { status: 'PENDING', evidenceIds, humanQcRequired: false }
}
