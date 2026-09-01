/** 本地 Runtime Provider 的 invariant 配套插件。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-lab-runtime-local'

/** Cordis 插件名称。 */
export const name = 'lab-runtime-local-invariant'
/** 需要使用的 invariant 服务。 */
export const inject = ['invariants']

/** No runtime invariant: the local Runtime Provider owns only in-process execution state. */
const install: InvariantInstaller = () => {}

/** 注册本地 Runtime Provider 的 invariant 所有权。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
