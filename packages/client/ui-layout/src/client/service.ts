/**
 * LayoutController: the cross-plugin panel-action face behind ctx.layout.
 * Panel geometry itself lives in the root entry's layout store (stores.ts);
 * the current-session selection lives with the runtime sessions service, and
 * the per-session active view dissolved into ui-conversation's session store
 * (its only consumer). What remains here is the contract other plugins'
 * apply worlds reach for panel transitions (sidebar toggle from ui-sidebar,
 * details open/close from ui-conversation and root application-view changes
 * from navigation contributors) — writes stay inside the store's declared
 * action set, delivered as the registration's bound actions.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { createLayoutStore } from './stores.ts'

/** The layout store's bound action set (framework-baked, draft params peeled). */
export type PanelActions = BoundActions<ReturnType<typeof createLayoutStore>>

/** 根应用视图注册表的最小读取面。 */
export interface AppViewRegistry {
  /**
   * 返回当前仍然有效的根应用视图 entry。
   * @param key - 要读取的 slot 名称。
   * @returns 当前 slot 的有效 entry。
   */
  entriesOfSlot(key: string): readonly { options: { id?: string; conversationMode?: 'replace' | 'split' | 'agent-dock'; default?: boolean } }[]
  /**
   * 监听根应用视图 entry 的注册和卸载。
   * @param key - 要监听的 slot 名称。
   * @param listener - slot 发生变化时调用的监听器。
   * @returns 取消监听的 disposer。
   */
  subscribe(key: string, listener: () => void): () => void
}

/**
 * The outward layout face (`ctx.layout`): the panel transitions other
 * plugins may trigger — and exactly what a test fake must supply. The
 * attachPanels wiring hook stays on the concrete class (root-entry assembly
 * only).
 */
export interface ILayout {
  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void
  /** Open the details panel (no-op when already open). */
  openDetails(): void
  /** Close the details panel. */
  closeDetails(): void
  /**
   * 打开已注册的根应用视图。
   * @param viewId - `app.view` entry 的 ID。
   * @throws Error - 注册表或布局 actions 尚未接入，或 viewId 未注册。
   */
  openAppView(viewId: string): void
  /**
   * 关闭当前根应用视图并显示 Conversation。
   * @throws Error - 布局 actions 尚未接入。
   */
  closeAppView(): void
  /**
   * 读取当前根应用视图标识。
   * @returns 当前 view ID；未选择页面时返回 undefined。
   */
  activeAppView(): string | undefined
}

/** Cross-plugin panel-action face (ctx.layout). */
export class LayoutController implements ILayout {
  #panels: PanelActions | undefined
  #appViews: AppViewRegistry | undefined
  #activeAppViewId: string | undefined
  #disposeAppViewSubscription: (() => void) | undefined

  /**
   * Adopt the root entry's bound store actions. Called from the root
   * registration's inject hook (a sanctioned assembly side effect), so the
   * face is live from the entry's first render; on entry re-register the
   * fresh actions overwrite the stale set.
   * @param actions - bound actions of the entry's layout store instance.
   */
  attachPanels(actions: PanelActions): void {
    this.#panels = actions
    if (this.#activeAppViewId !== undefined) {
      const entry = this.#appViews?.entriesOfSlot('app.view').find(candidate => candidate.options.id === this.#activeAppViewId)
      actions.setActiveAppView(this.#activeAppViewId, entry?.options.conversationMode ?? 'replace')
    }
  }

  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void {
    this.#require().toggleSidebar()
  }

  /** Open the details panel (no-op when already open). */
  openDetails(): void {
    this.#require().openDetails()
  }

  /** Close the details panel. */
  closeDetails(): void {
    this.#require().closeDetails()
  }

  /**
   * 接入实时根应用视图注册表，用于校验和卸载清理。
   * @param registry - 提供根应用视图 entry 和变更通知的注册表。
   * @returns 释放注册表监听和当前页面选择的 disposer。
   */
  attachAppViews(registry: AppViewRegistry): () => void {
    this.#disposeAppViewSubscription?.()
    this.#appViews = registry
    if (this.#activeAppViewId === undefined) {
      const entry = registry.entriesOfSlot('app.view').find(candidate => candidate.options.default === true && candidate.options.id !== undefined)
      if (entry?.options.id !== undefined) {
        this.#activeAppViewId = entry.options.id
        this.#panels?.setActiveAppView(entry.options.id, entry.options.conversationMode ?? 'replace')
      }
    }
    const dispose = registry.subscribe('app.view', () => {
      if (this.#activeAppViewId !== undefined && !this.#hasAppView(this.#activeAppViewId)) {
        this.closeAppView()
      }
    })
    this.#disposeAppViewSubscription = dispose
    return () => {
      if (this.#appViews !== registry) return
      dispose()
      this.#disposeAppViewSubscription = undefined
      this.#appViews = undefined
      if (this.#activeAppViewId !== undefined) {
        this.#activeAppViewId = undefined
        this.#panels?.setActiveAppView(undefined)
      }
    }
  }

  /**
   * 打开已注册的根应用视图。
   * @param viewId - `app.view` entry 的 ID。
   * @throws Error - 注册表或布局 actions 尚未接入，或 viewId 未注册。
   */
  openAppView(viewId: string): void {
    if (this.#appViews === undefined) throw new Error('layout: app view registry not wired')
    if (!this.#hasAppView(viewId)) throw new Error(`APP_VIEW_NOT_FOUND: ${viewId}`)
    const panels = this.#require()
    const entry = this.#appViews.entriesOfSlot('app.view').find(candidate => candidate.options.id === viewId)
    panels.setActiveAppView(viewId, entry?.options.conversationMode ?? 'replace')
    this.#activeAppViewId = viewId
  }

  /** 关闭当前根应用视图并显示 Conversation。 */
  closeAppView(): void {
    const panels = this.#require()
    panels.setActiveAppView(undefined)
    this.#activeAppViewId = undefined
  }

  /**
   * 读取当前根应用视图标识。
   * @returns 当前 view ID；未选择页面时返回 undefined。
   */
  activeAppView(): string | undefined {
    return this.#activeAppViewId
  }

  /** 检查实时注册表，不在浏览器侧保留页面列表。 */
  #hasAppView(viewId: string): boolean {
    return this.#appViews?.entriesOfSlot('app.view').some(entry => entry.options.id === viewId) === true
  }

  #require(): PanelActions {
    // Callers are UI gestures, which cannot fire before the root entry
    // rendered (the inject hook runs in its first render) — reaching this
    // unwired is a boot-order bug, not a race to tolerate.
    if (this.#panels === undefined) throw new Error('layout: panel actions not wired (root entry not mounted)')
    return this.#panels
  }
}
