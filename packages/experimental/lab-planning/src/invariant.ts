/** 实验规划包的 invariant 配套插件。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-lab-planning'

/** Cordis 插件名称。 */
export const name = 'lab-planning-invariant'
/** 需要使用的 invariant 服务。 */
export const inject = ['invariants']

/** 规划 Service 的 Provider 注册关系由 Service 自身负责。 */
const install: InvariantInstaller = () => {}

/** 注册实验规划包的 invariant 所有权。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
