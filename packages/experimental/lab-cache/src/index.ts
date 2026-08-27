/** 实验缓存投影 Consumer；统一复用 Session 事件对应的 Storage 快捷读取投影。 */

import { Context, Service } from '@deepseek-ai/cordis'
import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { brandId, type ExperimentCacheProjection, type ExperimentId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type {} from '@deepseek-ai/dsh-storage-domain'

const cacheRecord = z.object({
  version: z.literal(1),
  experimentId: z.string(),
  planId: z.string().optional(),
  runId: z.string().optional(),
  status: z.string(),
  knowledgeCitations: z.array(z.string()),
  skillRevisionIds: z.array(z.string()),
  updatedBy: z.string(),
})

type CacheRecord = z.infer<typeof cacheRecord>

/** 实验缓存投影的独立 domain；版本变化时直接重建，不承担迁移职责。 */
export const experimentCacheDomainSpec = defineDomain({
  name: 'lab_experiment_cache',
  version: 1,
  tables: { experiments: domainTable<string, CacheRecord>(cacheRecord) },
})

/** 可选的实验缓存写入 Consumer。 */
export class LabExperimentCacheService extends Service {
  private store: ExperimentCacheStore = { put: async () => {}, get: () => undefined }

  constructor(ctx: Context) {
    super(ctx, 'labExperimentCache')
  }

  /** Write an experiment cache projection that can be rebuilt from Session events.
   * @param projection - rebuildable experiment cache projection.
   */
  project(projection: ExperimentCacheProjection): Promise<void> {
    return this.store.put(projection)
  }

  /** Read the latest projected experiment cache.
   * @param experimentId - experiment whose projection is requested.
   * @returns - latest projection, when one has been stored.
   */
  get(experimentId: ExperimentId): ExperimentCacheProjection | undefined {
    return this.store.get(experimentId)
  }

  /** Bind the process-local Storage projection writer.
   * @param store - storage adapter used for cache projections.
   */
  attach(store: ExperimentCacheStore): void {
    this.store = store
  }
}

/** 缓存投影写入器的最小接口。 */
export interface ExperimentCacheStore {
  put(projection: ExperimentCacheProjection): Promise<void>
  get(experimentId: ExperimentId): ExperimentCacheProjection | undefined
}

/** Cordis 插件名称。 */
export const name = 'lab-experiment-cache'

/** 安装共享缓存服务；未组合 Storage 时保留显式空实现。 */
export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(LabExperimentCacheService)
  const opened = await openExperimentCacheStore(ctx)
  const service = ctx.get('labExperimentCache')
  if (service === undefined) throw new Error('lab experiment cache service did not install')
  service.attach(opened.store)
  ctx.effect(() => () => opened.close(), 'lab-experiment-cache.domain')
}

/** 打开 Harness Storage 投影；调用方拥有返回的 domain 生命周期。 */
async function openExperimentCacheStore(ctx: Context): Promise<{ store: ExperimentCacheStore; close: () => Promise<void> }> {
  const storageDomain = ctx.get('storageDomain')
  if (storageDomain === undefined) return { store: { put: async () => {}, get: () => undefined }, close: async () => {} }
  const domain = await storageDomain.open(experimentCacheDomainSpec)
  const table = domain.table('experiments')
  return {
    store: {
      async put(projection) {
        await table.put(projection.experimentId, {
          version: 1,
          experimentId: projection.experimentId,
          ...projection.planId === undefined ? {} : { planId: projection.planId },
          ...projection.runId === undefined ? {} : { runId: projection.runId },
          status: projection.status,
          knowledgeCitations: [...projection.knowledgeCitations],
          skillRevisionIds: [...projection.skillRevisionIds],
          updatedBy: projection.updatedBy,
        })
      },
      get(experimentId) {
        const record = table.get(experimentId)
        if (record === undefined) return undefined
        return {
          version: 1,
          experimentId: brandId<'ExperimentId'>(record.experimentId),
          ...record.planId === undefined ? {} : { planId: brandId<'PlanId'>(record.planId) },
          ...record.runId === undefined ? {} : { runId: brandId<'RunId'>(record.runId) },
          status: record.status as ExperimentCacheProjection['status'],
          knowledgeCitations: record.knowledgeCitations.map(citation => brandId<'CitationId'>(citation)),
          skillRevisionIds: record.skillRevisionIds.map(revisionId => brandId<'SkillRevisionId'>(revisionId)),
          updatedBy: brandId<'SessionId'>(record.updatedBy),
        }
      },
    },
    close: () => domain.close(),
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    labExperimentCache: LabExperimentCacheService
  }
}

export default LabExperimentCacheService
