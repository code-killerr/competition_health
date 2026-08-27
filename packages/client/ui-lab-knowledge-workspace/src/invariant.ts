/** Knowledge workspace 不拥有 Host 状态；组合约束由公开 slot 和 Web Facade 提供。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-lab-knowledge-workspace'

/** Cordis companion plugin name. */
export const name = 'client-ui-lab-knowledge-workspace-invariant'
/** Invariant registry dependency. */
export const inject = ['invariants']

/** No runtime invariant: the workspace renders public Facade data and owns no durable state. */
const install: InvariantInstaller = () => {}

/** Register this package's invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
