/** 实验工具聚合包的 invariant 配套插件。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-tool-lab'

/** Cordis 插件名称。 */
export const name = 'tool-lab-invariant'
/** 需要使用的 invariant 服务。 */
export const inject = ['invariants']

/** No runtime invariant: the aggregate tool package delegates invariants to its tool consumers. */
const install: InvariantInstaller = () => {}

/** 注册实验工具聚合包的 invariant 所有权。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
