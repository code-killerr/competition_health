/** 实验页面只保存展示选择；Project、Experiment、Run 和证据仍由 Host 查询。 */

/** Project 内可展示的页面。 */
export type LabPage =
  | 'overview' | 'planning' | 'approval' | 'execution' | 'steps' | 'evidence' | 'files' | 'archive'
  // Legacy command targets remain accepted as protocol aliases; they are not
  // rendered as Project navigation destinations.
  | 'conversations' | 'experiments' | 'runs'

/** A Host-authorized Knowledge location selected for presentation. */
export interface LabCitationSelection {
  readonly projectId: string
  readonly documentId: string
  readonly versionId: string
  readonly location?: string
}

/** 实验页面的展示选择。 */
export interface LabUiState {
  readonly activeWorkspaceId?: string
  readonly activeProjectId?: string
  readonly activeExperimentId?: string
  readonly activeRunId?: string
  readonly activeArtifactId?: string
  readonly activeCitation?: LabCitationSelection
  readonly projectPage: LabPage
}

interface SavedProjectSelection {
  readonly projectPage: LabPage
  readonly activeExperimentId?: string
  readonly activeRunId?: string
  readonly activeArtifactId?: string
}

/** 页面选择的可观察服务，不保存任何业务记录副本。 */
export class LabUiContext {
  #state: LabUiState = { projectPage: 'overview' }
  #listeners = new Set<() => void>()
  #projectSelections = new Map<string, SavedProjectSelection>()

  /** 返回当前展示选择。
   * @returns - 当前展示选择。
   */
  snapshot(): LabUiState { return this.#state }

  /** 订阅展示选择变化。
   * @param listener - 展示选择发生变化时调用的监听器。
   * @returns - 取消订阅的函数。
   */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  /** 选择一个 Workspace，供 Project 创建和试验台范围读取复用。
   * @param workspaceId - 当前 Workspace 标识。
   */
  selectWorkspace(workspaceId: string): void {
    this.#state = { ...this.#state, activeWorkspaceId: workspaceId }
    this.#emit()
  }

  /** 选择一个 Project。
   * @param projectId - 要选中的 Project 标识。
   */
  selectProject(projectId: string): void {
    this.#rememberCurrentProject()
    const saved = this.#projectSelections.get(projectId)
    const { activeExperimentId: previousExperimentId, activeRunId: previousRunId, activeArtifactId: previousArtifactId, activeCitation: previousCitation, ...rest } = this.#state
    void previousExperimentId
    void previousRunId
    void previousArtifactId
    void previousCitation
    this.#state = {
      ...rest,
      activeProjectId: projectId,
      projectPage: saved?.projectPage ?? 'overview',
      ...(saved?.activeExperimentId === undefined ? {} : { activeExperimentId: saved.activeExperimentId }),
      ...(saved?.activeRunId === undefined ? {} : { activeRunId: saved.activeRunId }),
      ...(saved?.activeArtifactId === undefined ? {} : { activeArtifactId: saved.activeArtifactId }),
    }
    this.#emit()
  }

  /** 选择一个 Experiment。
   * @param experimentId - 要选中的 Experiment 标识。
   */
  selectExperiment(experimentId: string): void {
    this.#rememberCurrentProject()
    const { activeRunId: previousRunId, activeArtifactId: previousArtifactId, ...rest } = this.#state
    void previousRunId
    void previousArtifactId
    this.#state = { ...rest, activeExperimentId: experimentId }
    this.#rememberCurrentProject()
    this.#emit()
  }

  /** 选择一个 Run 供工作台展示。
   * @param runId - 要选中的 Run 标识。
   */
  selectRun(runId: string): void {
    const { activeArtifactId: previousArtifactId, ...rest } = this.#state
    void previousArtifactId
    this.#state = { ...rest, activeRunId: runId }
    this.#rememberCurrentProject()
    this.#emit()
  }

  /** 选择当前 Run 下的 Artifact 供 Evidence 页面定位。
   * @param artifactId - 要定位的 Artifact 标识。
   */
  selectArtifact(artifactId: string): void {
    this.#state = { ...this.#state, activeArtifactId: artifactId }
    this.#rememberCurrentProject()
    this.#emit()
  }

  /** Request the Knowledge view to present one authorized citation location.
   * @param citation - Host-authorized citation target.
   */
  openCitation(citation: LabCitationSelection): void {
    this.#rememberCurrentProject()
    if (this.#state.activeProjectId !== citation.projectId) {
      const saved = this.#projectSelections.get(citation.projectId)
      const { activeExperimentId: previousExperimentId, activeRunId: previousRunId, activeArtifactId: previousArtifactId, activeCitation: previousCitation, ...rest } = this.#state
      void previousExperimentId
      void previousRunId
      void previousArtifactId
      void previousCitation
      this.#state = {
        ...rest,
        activeProjectId: citation.projectId,
        projectPage: saved?.projectPage ?? 'overview',
        ...(saved?.activeExperimentId === undefined ? {} : { activeExperimentId: saved.activeExperimentId }),
        ...(saved?.activeRunId === undefined ? {} : { activeRunId: saved.activeRunId }),
        ...(saved?.activeArtifactId === undefined ? {} : { activeArtifactId: saved.activeArtifactId }),
      }
    }
    const { activeArtifactId: previousArtifactId, ...rest } = this.#state
    void previousArtifactId
    this.#state = { ...rest, activeCitation: citation }
    this.#emit()
  }

  /** 打开 Project 内的页面。
   * @param page - 要打开的 Project 页面。
   */
  openProjectPage(page: LabPage): void {
    this.#state = { ...this.#state, projectPage: page }
    this.#rememberCurrentProject()
    this.#emit()
  }

  /** 清理展示选择。 */
  clearProject(): void {
    this.#projectSelections.clear()
    this.#state = { projectPage: 'overview' }
    this.#emit()
  }

  #rememberCurrentProject(): void {
    const projectId = this.#state.activeProjectId
    if (projectId === undefined) return
    const { projectPage, activeExperimentId, activeRunId, activeArtifactId } = this.#state
    this.#projectSelections.set(projectId, {
      projectPage,
      ...(activeExperimentId === undefined ? {} : { activeExperimentId }),
      ...(activeRunId === undefined ? {} : { activeRunId }),
      ...(activeArtifactId === undefined ? {} : { activeArtifactId }),
    })
  }

  #emit(): void {
    for (const listener of this.#listeners) listener()
  }
}
