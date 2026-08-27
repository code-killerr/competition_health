/** Package-owned invariant companion for the shared Knowledge fixtures. */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-lab-knowledge-fixtures'

/** Cordis companion plugin name. */
export const name = 'lab-knowledge-fixtures-invariant'
/** Invariant registry dependency. */
export const inject = ['invariants']

/** No runtime invariant: this package provides deterministic test inputs and owns no production state. */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns The installed registration disposer.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
