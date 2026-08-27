/** 第一阶段实验自动化能力的 opt-in bundle。 */

import type { Context } from '@deepseek-ai/cordis'
import LocalSubprocess from '@deepseek-ai/dsh-subprocess-local'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as StorageSqlite from '@deepseek-ai/dsh-storage-sqlite'
import KnowledgeService from '@deepseek-ai/dsh-experimental-lab-knowledge'
import * as LocalKnowledge from '@deepseek-ai/dsh-experimental-lab-knowledge-local'
import LabPlanningService from '@deepseek-ai/dsh-experimental-lab-planning'
import * as LocalPlanning from '@deepseek-ai/dsh-experimental-lab-planning-local'
import LabSkillService from '@deepseek-ai/dsh-experimental-lab-skill'
import * as LocalSkill from '@deepseek-ai/dsh-experimental-lab-skill-local'
import LabDeviceService from '@deepseek-ai/dsh-experimental-lab-device'
import * as MockDevice from '@deepseek-ai/dsh-experimental-lab-device-mock'
import LabRuntimeService from '@deepseek-ai/dsh-experimental-lab-runtime'
import * as LocalRuntime from '@deepseek-ai/dsh-experimental-lab-runtime-local'
import * as LabExperimentCache from '@deepseek-ai/dsh-experimental-lab-cache'
import * as LabProject from '@deepseek-ai/dsh-experimental-lab-project'
import * as WebConsumer from '@deepseek-ai/dsh-experimental-lab-mvp-web'

/** Bundle 的可配置项。 */
export interface Config {
  /** Provider-owned SQLite 路径；memory 路径适合组合测试。 */
  readonly knowledgePath?: string
  /** Harness Storage SQLite 路径；缓存投影使用其中的独立 domain。 */
  readonly storagePath?: string
  /** 本地规划 Provider 配置。 */
  readonly planning?: LocalPlanning.Config
  /** Mock 设备配置。 */
  readonly device?: MockDevice.Config
  /** 本地 Skill Provider 配置。 */
  readonly skill?: LocalSkill.Config
  /** 本地 Runtime 配置；默认使用 `.lab-data/runtime.sqlite` 保存权威状态。 */
  readonly runtime?: LocalRuntime.Config
  /** 显式提供文档解析器；用于组合测试和可替换的 MVP 解析运行时。 */
  readonly documentParser?: LocalKnowledge.DocumentParser
  /** 显式启用本地 Docling PDF 解析；缺省时保持现有 PDF 不可用状态。 */
  readonly docling?: LocalKnowledge.DoclingConfig
  /** 显式启用实验 Web HTTP Consumer；缺省时只装实验 Service。 */
  readonly web?: WebConsumer.Http.Config
}

/** Cordis 插件名称。 */
export const name = 'lab-mvp'

/** 显式组合四个能力的 Service、Provider 和最小 Web Consumer。 */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  if (ctx.get('storage') === undefined) await ctx.plugin(Storage)
  await ctx.plugin(StorageSqlite, { path: config.storagePath ?? '.lab-data/lab-storage.sqlite' })
  if (ctx.get('storageDomain') === undefined) await ctx.plugin(StorageDomain, { backend: 'sqlite' })
  if (ctx.get('labExperimentCache') === undefined) await ctx.plugin(LabExperimentCache)
  if (ctx.get('labProjects') === undefined) await ctx.plugin(LabProject)
  await ctx.plugin(KnowledgeService)
  await ctx.plugin(LabPlanningService)
  await ctx.plugin(LabSkillService)
  await ctx.plugin(LabDeviceService)
  await ctx.plugin(LabRuntimeService)
  let knowledgeConfig: LocalKnowledge.Config = {
    path: config.knowledgePath ?? '.lab-data/knowledge.sqlite',
    ...config.documentParser === undefined ? {} : { documentParser: config.documentParser },
  }
  if (config.docling !== undefined) {
    if (ctx.get('subprocess') === undefined) await ctx.plugin(LocalSubprocess)
    knowledgeConfig = {
      path: config.knowledgePath ?? '.lab-data/knowledge.sqlite',
      documentParser: LocalKnowledge.createDoclingAdapter(ctx, config.docling),
    }
  }
  await ctx.plugin(LocalKnowledge, knowledgeConfig)
  await ctx.plugin(LocalSkill, config.skill)
  await ctx.plugin(MockDevice, config.device)
  await ctx.plugin(LocalPlanning, config.planning)
  await ctx.plugin(LocalRuntime, config.runtime)
  await ctx.plugin(WebConsumer)
  if (config.web !== undefined) await ctx.plugin(WebConsumer.Http, config.web)
}

export {
  KnowledgeService,
  LabPlanningService,
  LabSkillService,
  LabDeviceService,
  LabRuntimeService,
}

export { LabProjectService } from '@deepseek-ai/dsh-experimental-lab-project'
