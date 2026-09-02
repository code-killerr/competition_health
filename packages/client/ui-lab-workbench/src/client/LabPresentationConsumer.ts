import type { LabUiContext } from './LabUiContext.ts'
import { validateLabPresentationIntent } from './lifecycle.ts'
import type { LabPresentationScope, LabPresentationValidation } from './lifecycle.ts'

/** The only client target that a validated Agent presentation intent may change. */
export interface LabPresentationTarget {
  readonly ui: LabUiContext
  readonly openAppView: (viewId: 'lab-monitor' | 'lab-project' | 'lab-knowledge' | 'lab-devices') => void
}

/** Validate an Agent presentation request and apply only an authorized selection.
 * @param value - Untrusted presentation value received from the Agent surface.
 * @param scope - Records and destinations authorized for the active Project.
 * @param target - Presentation state and app-view callbacks to update.
 * @returns The validation result, including the accepted intent when valid.
 */
export function consumeLabPresentationIntent(
  value: unknown,
  scope: LabPresentationScope,
  target: LabPresentationTarget,
): LabPresentationValidation {
  const validation = validateLabPresentationIntent(value, scope)
  if (!validation.accepted) return validation
  const intent = validation.intent
  if (intent.view === 'projects') {
    target.openAppView('lab-monitor')
    return validation
  }
  if (intent.view === 'devices') {
    target.openAppView('lab-devices')
    return validation
  }
  if (intent.view === 'knowledge') {
    if (intent.projectId !== undefined) target.ui.selectProject(intent.projectId)
    target.openAppView('lab-knowledge')
    return validation
  }
  if (intent.view === 'citation') {
    target.ui.openCitation({
      projectId: intent.projectId,
      documentId: intent.documentId,
      versionId: intent.versionId,
      ...intent.location === undefined ? {} : { location: intent.location },
    })
    target.openAppView('lab-knowledge')
    return validation
  }
  if (intent.view === 'project') {
    target.ui.selectProject(intent.projectId)
    target.ui.openProjectPage(intent.page ?? 'overview')
    target.openAppView('lab-project')
    return validation
  }
  if (intent.view === 'experiment') {
    target.ui.selectProject(intent.projectId)
    target.ui.selectExperiment(intent.experimentId)
    target.ui.openProjectPage('planning')
    target.openAppView('lab-project')
    return validation
  }
  if (intent.view === 'run') {
    target.ui.selectProject(intent.projectId)
    target.ui.selectExperiment(intent.experimentId)
    target.ui.selectRun(intent.runId)
    target.ui.openProjectPage('execution')
    target.openAppView('lab-project')
    return validation
  }
  if (intent.view !== 'evidence') return validation
  target.ui.selectProject(intent.projectId)
  target.ui.selectExperiment(intent.experimentId)
  target.ui.selectRun(intent.runId)
  if (intent.artifactId !== undefined) target.ui.selectArtifact(intent.artifactId)
  target.ui.openProjectPage('evidence')
  target.openAppView('lab-project')
  return validation
}
