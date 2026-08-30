/** 独立 Knowledge workspace 的浏览器插件；注册为根级 Harness application view。 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { LabKnowledgeWorkspaceKey } from './locales.ts'
import { en, zh } from './locales.ts'
import { createKnowledgeWorkspaceView, type KnowledgeWorkspaceUi } from './KnowledgeWorkspace.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 独立 Knowledge workspace 的文案。 */
    labKnowledgeWorkspace: LabKnowledgeWorkspaceKey
  }
}

const NS = 'labKnowledgeWorkspace'

interface KnowledgeProjectActions {
  readonly toggleSource: (projectId: string, source: { readonly documentId: string; readonly versionId: string }) => void | Promise<void>
}

/** 独立 Knowledge workspace 需要的客户端 Service。 */
export const inject = ['slots', 'locale']

/** 将 Knowledge workspace 挂载到根级 application view。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-lab-knowledge-workspace: dictionaries')
  const ui: KnowledgeWorkspaceUi = {
    snapshot: () => (ctx.get('labUi') as KnowledgeWorkspaceUi | undefined)?.snapshot() ?? {},
    subscribe: listener => (ctx.get('labUi') as KnowledgeWorkspaceUi | undefined)?.subscribe(listener) ?? (() => {}),
  }
  const register = (): (() => void) => ctx.slots.register({
    name: 'app.view',
    id: 'lab-knowledge',
    order: 12,
    conversationMode: 'agent-dock',
    locale: NS,
  }, createKnowledgeWorkspaceView({
    ui,
    openProjects: () => { ctx.get('layout')?.openAppView('lab-projects') },
    onSourceToggle: (source: { readonly documentId: string; readonly versionId: string }) => {
      const projectId = ui.snapshot().activeProjectId
      const projectActions = ctx.get('labProjectActions') as KnowledgeProjectActions | undefined
      if (projectId !== undefined && projectActions !== undefined) return projectActions.toggleSource(projectId, source)
    },
  }))
  ctx.slots.inject('app.view', register)
}
