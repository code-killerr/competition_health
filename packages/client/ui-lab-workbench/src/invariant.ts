/** 实验工作台的 invariant companion。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-lab-workbench'

/** Cordis companion plugin name. */
export const name = 'client-ui-lab-workbench-invariant'
/** Invariant registry dependency. */
export const inject = ['invariants']

/** 工作台的槽位注册、销毁和 HTTP 状态由对应的客户端与 Host 测试覆盖。 */
const install: InvariantInstaller = () => {}

/** 注册工作台的 invariant companion。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
