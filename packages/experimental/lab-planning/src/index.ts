/** 实验规划 Service Definition；Provider 负责检索上下文与提案持久化。 */

import { Context, Service } from '@deepseek-ai/cordis'
import {
  LabDuplicateProviderError,
  LabProviderUnavailableError,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { ExperimentPlan, ExperimentRequest } from '@deepseek-ai/dsh-experimental-lab-domain'
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

  /** 注册本进程唯一的规划 Provider。
 * @param provider - provider that owns planning and proposal storage.
 * @returns - disposer for the registered provider.
 */
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

  /** 根据实验需求组装可审查的检索上下文。
 * @param request - experiment request to contextualize.
 * @returns - cited knowledge, conflicts, gaps, and device context.
 */
  buildContext(request: ExperimentRequest): Promise<PlanningContext> {
    return this.requireProvider().buildContext(request)
  }

  /** 接收 Agent 生成的声明式计划和 Skill 草案。
 * @param input - plan and Skill drafts submitted by the Agent.
 * @returns - deterministic proposal validation result.
 */
  propose(input: PlanProposalInput): Promise<PlanProposalResult> {
    return this.requireProvider().propose(input)
  }

  /** 返回已保存的计划提案，供审核和 Web 读取使用。
   * @param planId - plan identifier to read.
   * @returns - stored proposal or undefined when it is not known.
   */
  getProposal(planId: ExperimentPlan['planId']): PlanProposalResult | undefined {
    return this.requireProvider().getProposal(planId)
  }

  /** 返回计划审核列表，供 Web Consumer 展示修订状态。
   * @param experimentId - optional experiment filter.
   * @returns - stored proposal copies.
   */
  listProposals(experimentId?: ExperimentRequest['experimentId']): readonly PlanProposalResult[] {
    return this.requireProvider().listProposals(experimentId)
  }

  /** 使用当前 Skill、知识和设备事实重新执行计划确定性校验。
   * @param planId - plan identifier to validate.
   * @returns - updated proposal with current validation result.
   */
  validatePlan(planId: ExperimentPlan['planId']): Promise<PlanProposalResult> {
    return this.requireProvider().validatePlan(planId)
  }

  /** 将已通过确定性校验的计划标记为人工批准。
   * @param planId - plan identifier to approve.
   * @param approvedBy - reviewer identity.
   * @returns - updated proposal.
   */
  approvePlan(planId: ExperimentPlan['planId'], approvedBy: string): Promise<PlanProposalResult> {
    return this.requireProvider().approvePlan(planId, approvedBy)
  }

  /** 将计划标记为拒绝并保留拒绝原因。
   * @param planId - plan identifier to reject.
   * @param reason - human review reason.
   * @returns - updated proposal.
   */
  rejectPlan(planId: ExperimentPlan['planId'], reason: string): Promise<PlanProposalResult> {
    return this.requireProvider().rejectPlan(planId, reason)
  }

  private requireProvider(): LabPlanningProvider {
    if (this.provider === undefined) throw new LabProviderUnavailableError('lab-planning')
    return this.provider
  }
}

export default LabPlanningService
