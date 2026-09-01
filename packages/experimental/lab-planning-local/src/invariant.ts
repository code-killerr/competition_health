/** 实验本地规划 Provider 的 invariant 配套插件。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-lab-planning-local'

/** Cordis 插件名称。 */
export const name = 'lab-planning-local-invariant'
/** 需要使用的 invariant 服务。 */
export const inject = ['invariants']

/** No runtime invariant: 本地 Provider 当前只维护 Service 注册关系。 */
const install: InvariantInstaller = () => {}

/** 注册本地规划 Provider 的 invariant 所有权。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
