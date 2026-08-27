/** 独立 Knowledge workspace 的浏览器插件；通过公开 slot 接入实验工作台。 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-lab-workbench/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { LabKnowledgeWorkspaceKey } from './locales.ts'
import { en, zh } from './locales.ts'
import { KnowledgeWorkspace } from './KnowledgeWorkspace.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 独立 Knowledge workspace 的文案。 */
    labKnowledgeWorkspace: LabKnowledgeWorkspaceKey
  }
}

const NS = 'labKnowledgeWorkspace'

/** 独立 Knowledge workspace 需要的客户端 Service。 */
export const inject = ['slots', 'locale']

/** 将 Knowledge workspace 挂载到工作台公开的 Knowledge 子 slot。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-lab-knowledge-workspace: dictionaries')
  const register = (): (() => void) => ctx.slots.register({
    name: 'lab.knowledge.workspace',
    locale: NS,
  }, KnowledgeWorkspace)
  ctx.slots.inject('lab.knowledge.workspace', register)
}
