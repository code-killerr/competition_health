/** Invariant companion for the opt-in project-scoped Agent tools. */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-tool-lab-project'

/** Cordis plugin name. */
export const name = 'tool-lab-project-invariant'
/** Invariant registry service. */
export const inject = ['invariants']

/** No runtime invariant: Project tool invariants are covered by the assembled Agent tests. */
const install: InvariantInstaller = () => {}

/** Register the project tool invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
