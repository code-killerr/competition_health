/** 实验知识库包的 invariant 配套插件。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-lab-knowledge'

/** Cordis 插件名称。 */
export const name = 'lab-knowledge-invariant'
/** 需要使用的 invariant 服务。 */
export const inject = ['invariants']

/** No runtime invariant: I0 only defines the Provider seam; persistence relations belong to the local Provider. */
const install: InvariantInstaller = () => {}

/** 注册知识库包的 invariant 所有权。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
