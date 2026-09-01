/** 实验 Skill 本地 Provider 的 invariant 配套插件。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-lab-skill-local'

/** Cordis 插件名称。 */
export const name = 'lab-skill-local-invariant'
/** 需要使用的 invariant 服务。 */
export const inject = ['invariants']

/** No runtime invariant: Provider 当前只维护进程内状态，没有额外的跨表 invariant。 */
const install: InvariantInstaller = () => {}

/** 注册本地 Skill Provider 的 invariant 所有权。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
