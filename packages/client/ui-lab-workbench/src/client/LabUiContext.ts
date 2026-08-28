/** 实验页面只保存展示选择；Project、Experiment、Run 和证据仍由 Host 查询。 */

import type { LabPage } from './store.ts'

/** 实验页面的展示选择。 */
export interface LabUiState {
  readonly activeProjectId?: string
  readonly activeExperimentId?: string
  readonly projectPage: LabPage
}

/** 页面选择的可观察服务，不保存任何业务记录副本。 */
export class LabUiContext {
  #state: LabUiState = { projectPage: 'overview' }
  #listeners = new Set<() => void>()

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

  /** 选择一个 Project。
   * @param projectId - 要选中的 Project 标识。
   */
  selectProject(projectId: string): void {
    this.#state = { ...this.#state, activeProjectId: projectId }
    this.#emit()
  }

  /** 选择一个 Experiment。
   * @param experimentId - 要选中的 Experiment 标识。
   */
  selectExperiment(experimentId: string): void {
    this.#state = { ...this.#state, activeExperimentId: experimentId }
    this.#emit()
  }

  /** 打开 Project 内的页面。
   * @param page - 要打开的 Project 页面。
   */
  openProjectPage(page: Extract<LabPage, 'overview' | 'experiments' | 'runs' | 'evidence' | 'conversations'>): void {
    this.#state = { ...this.#state, projectPage: page }
    this.#emit()
  }

  /** 清理展示选择。 */
  clearProject(): void {
    this.#state = { projectPage: 'overview' }
    this.#emit()
  }

  #emit(): void {
    for (const listener of this.#listeners) listener()
  }
}
