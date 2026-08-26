/** 实验工作台的 React-free 状态模型；所有异步副作用由注册层注入。 */

import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import type { LabConflict, LabKnowledgeItem, LabPlanReview, LabRun, LabSearchResult, LabSnapshot } from './api.ts'

export type LabStage = 'knowledge' | 'request' | 'plan' | 'execution' | 'report'

export interface LabWorkbenchState {
  experimentId: string
  stage: LabStage
  sourceName: string
  sourceText: string
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
  searchResults: readonly LabSearchResult[]
  conflicts: readonly LabConflict[]
  planningContext: Readonly<Record<string, unknown>> | undefined
  activePlanId: string | undefined
  activeRunId: string | undefined
  pendingAction: string | undefined
  error: string | undefined
  notice: string | undefined
}

type LabWorkbenchActions = {
  setStage: (draft: LabWorkbenchState, stage: LabStage) => void
  setExperimentId: (draft: LabWorkbenchState, value: string) => void
  setSourceName: (draft: LabWorkbenchState, value: string) => void
  setSourceText: (draft: LabWorkbenchState, value: string) => void
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
  setSearch: (draft: LabWorkbenchState, results: readonly LabSearchResult[], conflicts: readonly LabConflict[]) => void
  setPlanningContext: (draft: LabWorkbenchState, value: Readonly<Record<string, unknown>> | undefined) => void
  setActivePlan: (draft: LabWorkbenchState, value: string | undefined) => void
  setActiveRun: (draft: LabWorkbenchState, value: string | undefined) => void
  setPending: (draft: LabWorkbenchState, value: string | undefined) => void
  setError: (draft: LabWorkbenchState, value: string | undefined) => void
  setNotice: (draft: LabWorkbenchState, value: string | undefined) => void
}

/** 创建一个工作台槽位专用状态句柄。 */
export function createLabWorkbenchStore(): EngineStoreHandle<LabWorkbenchState, LabWorkbenchActions> {
  return defineStore({
    init: (): LabWorkbenchState => ({
      experimentId: 'experiment-1',
      stage: 'knowledge',
      sourceName: '',
      sourceText: '',
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
      searchResults: [],
      conflicts: [],
      planningContext: undefined,
      activePlanId: undefined,
      activeRunId: undefined,
      pendingAction: undefined,
      error: undefined,
      notice: undefined,
    }),
    actions: {
      setStage: (draft, stage) => { draft.stage = stage },
      setExperimentId: (draft, value) => { draft.experimentId = value },
      setSourceName: (draft, value) => { draft.sourceName = value },
      setSourceText: (draft, value) => { draft.sourceText = value },
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
      setSearch: (draft, results, conflicts) => {
        draft.searchResults = results
        draft.conflicts = conflicts
      },
      setPlanningContext: (draft, value) => { draft.planningContext = value },
      setActivePlan: (draft, value) => { draft.activePlanId = value },
      setActiveRun: (draft, value) => { draft.activeRunId = value },
      setPending: (draft, value) => { draft.pendingAction = value },
      setError: (draft, value) => { draft.error = value },
      setNotice: (draft, value) => { draft.notice = value },
    },
  })
}

/** 从快照读取第一个可操作计划，供按钮和状态提示共用。 */
export function firstPlanId(snapshot: LabSnapshot | undefined): string | undefined {
  return snapshot?.planReviews.find(review => review.plan.planId !== undefined)?.plan.planId
}

/** 仅保留展示所需的计划视图，避免组件直接依赖服务对象。 */
export function planReviews(snapshot: LabSnapshot | undefined): readonly LabPlanReview[] {
  return snapshot?.planReviews ?? []
}

/** 当前运行视图的安全读取。 */
export function runView(snapshot: LabSnapshot | undefined): LabRun | undefined {
  return snapshot?.run
}

/** 当前知识导入状态的安全读取。 */
export function knowledgeItems(snapshot: LabSnapshot | undefined): readonly LabKnowledgeItem[] {
  return snapshot?.knowledge ?? []
}
