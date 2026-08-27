/** 实验工作台的 invariant companion。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-lab-workbench'

/** Cordis companion plugin name. */
export const name = 'client-ui-lab-workbench-invariant'
/** Invariant registry dependency. */
export const inject = ['invariants']

/** No runtime invariant: slot registration, teardown, and HTTP state are covered by the client and Host tests. */
const install: InvariantInstaller = () => {}

/** 注册工作台的 invariant companion。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
