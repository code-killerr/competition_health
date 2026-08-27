/** 实验工作台的 React-free 状态模型；所有异步副作用由注册层注入。 */

import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import type { LabConflict, LabKnowledgeItem, LabPlanReview, LabProjectView, LabRun, LabSearchResult, LabSnapshot } from './api.ts'
import type { LabSopDraft } from './api.ts'

/** Visible stages in the laboratory workbench. */
export type LabStage = 'knowledge' | 'request' | 'plan' | 'execution' | 'report' | 'devices' | 'projects'

/** Mutable workbench fields and read-only projections. */
export interface LabWorkbenchState {
  projectId: string
  projectName: string
  sessionTitle: string
  selectedDeviceIdsText: string
  selectedSourceKeysText: string
  experimentId: string
  stage: LabStage
  sourceName: string
  sourceText: string
  sopTitle: string
  query: string
  objective: string
  sampleName: string
  expectedOutputsText: string
  constraintsText: string
  localPlanText: string
  evidenceText: string
  reviewer: string
  requestedBy: string
  snapshot: LabSnapshot | undefined
  projectView: LabProjectView | undefined
  projectViews: readonly LabProjectView[]
  searchResults: readonly LabSearchResult[]
  conflicts: readonly LabConflict[]
  sopDraft: LabSopDraft | undefined
  planningContext: Readonly<Record<string, unknown>> | undefined
  activePlanId: string | undefined
  activeRunId: string | undefined
  pendingAction: string | undefined
  error: string | undefined
  notice: string | undefined
}

type LabWorkbenchActions = {
  setProjectId: (draft: LabWorkbenchState, value: string) => void
  setProjectName: (draft: LabWorkbenchState, value: string) => void
  setSessionTitle: (draft: LabWorkbenchState, value: string) => void
  setSelectedDeviceIdsText: (draft: LabWorkbenchState, value: string) => void
  setSelectedSourceKeysText: (draft: LabWorkbenchState, value: string) => void
  setStage: (draft: LabWorkbenchState, stage: LabStage) => void
  setExperimentId: (draft: LabWorkbenchState, value: string) => void
  setSourceName: (draft: LabWorkbenchState, value: string) => void
  setSourceText: (draft: LabWorkbenchState, value: string) => void
  setSopTitle: (draft: LabWorkbenchState, value: string) => void
  setQuery: (draft: LabWorkbenchState, value: string) => void
  setObjective: (draft: LabWorkbenchState, value: string) => void
  setSampleName: (draft: LabWorkbenchState, value: string) => void
  setExpectedOutputsText: (draft: LabWorkbenchState, value: string) => void
  setConstraintsText: (draft: LabWorkbenchState, value: string) => void
  setLocalPlanText: (draft: LabWorkbenchState, value: string) => void
  setEvidenceText: (draft: LabWorkbenchState, value: string) => void
  setReviewer: (draft: LabWorkbenchState, value: string) => void
  setRequestedBy: (draft: LabWorkbenchState, value: string) => void
  setSnapshot: (draft: LabWorkbenchState, value: LabSnapshot) => void
  setProjectView: (draft: LabWorkbenchState, value: LabProjectView | undefined) => void
  setProjectViews: (draft: LabWorkbenchState, value: readonly LabProjectView[]) => void
  setSearch: (draft: LabWorkbenchState, results: readonly LabSearchResult[], conflicts: readonly LabConflict[]) => void
  setSopDraft: (draft: LabWorkbenchState, value: LabSopDraft | undefined) => void
  setPlanningContext: (draft: LabWorkbenchState, value: Readonly<Record<string, unknown>> | undefined) => void
  setActivePlan: (draft: LabWorkbenchState, value: string | undefined) => void
  setActiveRun: (draft: LabWorkbenchState, value: string | undefined) => void
  setPending: (draft: LabWorkbenchState, value: string | undefined) => void
  setError: (draft: LabWorkbenchState, value: string | undefined) => void
  setNotice: (draft: LabWorkbenchState, value: string | undefined) => void
}

/** Create a workbench slot state handle.
 * @returns - store handle for the workbench state and actions.
 */
export function createLabWorkbenchStore(): EngineStoreHandle<LabWorkbenchState, LabWorkbenchActions> {
  return defineStore({
    init: (): LabWorkbenchState => ({
      projectId: 'project-1',
      projectName: '',
      sessionTitle: '',
      selectedDeviceIdsText: '',
      selectedSourceKeysText: '',
      experimentId: 'experiment-1',
      stage: 'knowledge',
      sourceName: '',
      sourceText: '',
      sopTitle: '',
      query: '',
      objective: '',
      sampleName: '',
      expectedOutputsText: '',
      constraintsText: '',
      localPlanText: '',
      evidenceText: '',
      reviewer: '',
      requestedBy: '',
      snapshot: undefined,
      projectView: undefined,
      projectViews: [],
      searchResults: [],
      conflicts: [],
      sopDraft: undefined,
      planningContext: undefined,
      activePlanId: undefined,
      activeRunId: undefined,
      pendingAction: undefined,
      error: undefined,
      notice: undefined,
    }),
    actions: {
      setProjectId: (draft, value) => { draft.projectId = value },
      setProjectName: (draft, value) => { draft.projectName = value },
      setSessionTitle: (draft, value) => { draft.sessionTitle = value },
      setSelectedDeviceIdsText: (draft, value) => { draft.selectedDeviceIdsText = value },
      setSelectedSourceKeysText: (draft, value) => { draft.selectedSourceKeysText = value },
      setStage: (draft, stage) => { draft.stage = stage },
      setExperimentId: (draft, value) => { draft.experimentId = value },
      setSourceName: (draft, value) => { draft.sourceName = value },
      setSourceText: (draft, value) => { draft.sourceText = value },
      setSopTitle: (draft, value) => { draft.sopTitle = value },
      setQuery: (draft, value) => { draft.query = value },
      setObjective: (draft, value) => { draft.objective = value },
      setSampleName: (draft, value) => { draft.sampleName = value },
      setExpectedOutputsText: (draft, value) => { draft.expectedOutputsText = value },
      setConstraintsText: (draft, value) => { draft.constraintsText = value },
      setLocalPlanText: (draft, value) => { draft.localPlanText = value },
      setEvidenceText: (draft, value) => { draft.evidenceText = value },
      setReviewer: (draft, value) => { draft.reviewer = value },
      setRequestedBy: (draft, value) => { draft.requestedBy = value },
      setSnapshot: (draft, value) => { draft.snapshot = value },
      setProjectView: (draft, value) => { draft.projectView = value },
      setProjectViews: (draft, value) => { draft.projectViews = value },
      setSearch: (draft, results, conflicts) => {
        draft.searchResults = results
        draft.conflicts = conflicts
      },
      setSopDraft: (draft, value) => { draft.sopDraft = value },
      setPlanningContext: (draft, value) => { draft.planningContext = value },
      setActivePlan: (draft, value) => { draft.activePlanId = value },
      setActiveRun: (draft, value) => { draft.activeRunId = value },
      setPending: (draft, value) => { draft.pendingAction = value },
      setError: (draft, value) => { draft.error = value },
      setNotice: (draft, value) => { draft.notice = value },
    },
  })
}

/** Read the first actionable plan identifier from a snapshot.
 * @param snapshot - optional workbench snapshot.
 * @returns - first plan identifier, when one is available.
 */
export function firstPlanId(snapshot: LabSnapshot | undefined): string | undefined {
  return snapshot?.planReviews.find(review => review.plan.planId !== undefined)?.plan.planId
}

/** Read the plan review projections from a snapshot.
 * @param snapshot - optional workbench snapshot.
 * @returns - plan reviews projected for display.
 */
export function planReviews(snapshot: LabSnapshot | undefined): readonly LabPlanReview[] {
  return snapshot?.planReviews ?? []
}

/** Read the current run projection from a snapshot.
 * @param snapshot - optional workbench snapshot.
 * @returns - current run projection, when one exists.
 */
export function runView(snapshot: LabSnapshot | undefined): LabRun | undefined {
  return snapshot?.run
}

/** Read Knowledge import projections from a snapshot.
 * @param snapshot - optional workbench snapshot.
 * @returns - Knowledge import records.
 */
export function knowledgeItems(snapshot: LabSnapshot | undefined): readonly LabKnowledgeItem[] {
  return snapshot?.knowledge ?? []
}
