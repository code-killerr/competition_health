/** 本地知识 Provider 的 invariant 配套插件。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-lab-knowledge-local'

/** Cordis 插件名称。 */
export const name = 'lab-knowledge-local-invariant'
/** 需要使用的 invariant 服务。 */
export const inject = ['invariants']

/** No runtime invariant: SQLite row relations are owned and checked by the Provider schema. */
const install: InvariantInstaller = () => {}

/** 注册本地知识 Provider 的 invariant 所有权。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
