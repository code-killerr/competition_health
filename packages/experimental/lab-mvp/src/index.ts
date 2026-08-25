/** 第一阶段实验自动化能力的 opt-in bundle，只组合 Service Definition。 */

import type { Context } from '@deepseek-ai/cordis'
import KnowledgeService from '@deepseek-ai/dsh-experimental-lab-knowledge'
import LabPlanningService from '@deepseek-ai/dsh-experimental-lab-planning'
import LabSkillService from '@deepseek-ai/dsh-experimental-lab-skill'
import LabDeviceService from '@deepseek-ai/dsh-experimental-lab-device'
import LabRuntimeService from '@deepseek-ai/dsh-experimental-lab-runtime'

/** Cordis 插件名称。 */
export const name = 'lab-mvp'

/** 不自动接入任何默认 profile；由显式 bundle 组合挂载。 */
export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(KnowledgeService)
  await ctx.plugin(LabPlanningService)
  await ctx.plugin(LabSkillService)
  await ctx.plugin(LabDeviceService)
  await ctx.plugin(LabRuntimeService)
}

export { KnowledgeService, LabPlanningService, LabSkillService, LabDeviceService, LabRuntimeService }
