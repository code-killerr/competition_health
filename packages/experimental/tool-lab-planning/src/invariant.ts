/** 实验规划工具包的 invariant 配套插件。 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-tool-lab-planning'

/** Cordis 插件名称。 */
export const name = 'tool-lab-planning-invariant'
/** 需要使用的 invariant 服务。 */
export const inject = ['invariants']

/** Agent scope 工具关系由 Harness tools invariant 负责。 */
const install: InvariantInstaller = () => {}

/** 注册实验规划工具包的 invariant 所有权。 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
