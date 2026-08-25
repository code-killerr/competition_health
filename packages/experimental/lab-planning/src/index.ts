/** 实验规划 Service Definition；Provider 负责检索上下文与提案持久化。 */

import { Context, Service } from '@deepseek-ai/cordis'
import {
  LabDuplicateProviderError,
  LabProviderUnavailableError,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { ExperimentRequest } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { PlanProposalInput, PlanProposalResult, PlanningContext } from './types.ts'
import type { LabPlanningProvider } from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    labPlanning: LabPlanningService
  }
}

/** 实验规划服务，隔离 Agent 提案与知识/设备/Skill 具体实现。 */
export class LabPlanningService extends Service {
  private provider: LabPlanningProvider | undefined

  constructor(ctx: Context) {
    super(ctx, 'labPlanning')
  }

  /** 注册本进程唯一的规划 Provider。 */
  registerProvider(provider: LabPlanningProvider): () => void {
    if (this.provider !== undefined) throw new LabDuplicateProviderError('lab-planning')
    const dispose = this.ctx.effect(() => {
      this.provider = provider
      return () => {
        if (this.provider === provider) this.provider = undefined
        return provider.dispose?.()
      }
    }, 'labPlanning.registerProvider()')
    return () => void dispose()
  }

  /** 根据实验需求组装可审查的检索上下文。 */
  buildContext(request: ExperimentRequest): Promise<PlanningContext> {
    return this.requireProvider().buildContext(request)
  }

  /** 接收 Agent 生成的声明式计划和 Skill 草案。 */
  propose(input: PlanProposalInput): Promise<PlanProposalResult> {
    return this.requireProvider().propose(input)
  }

  private requireProvider(): LabPlanningProvider {
    if (this.provider === undefined) throw new LabProviderUnavailableError('lab-planning')
    return this.provider
  }
}

export default LabPlanningService
