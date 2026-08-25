/** 实验运行时包的 invariant 配套插件。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-lab-runtime'

/** Cordis 插件名称。 */
export const name = 'lab-runtime-invariant'
/** 需要使用的 invariant 服务。 */
export const inject = ['invariants']

/** No runtime invariant: ExecutionGraph and persisted run relations belong to the local Runtime Provider in I4. */
const install: InvariantInstaller = () => {}

/** 注册运行时包的 invariant 所有权。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
