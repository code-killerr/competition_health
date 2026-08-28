# 实验自动化

[English](lab-automation.md) | 中文

实验自动化子系统提供 opt-in 的 Service Definition 和本地 Provider，覆盖知识录入、计划与 Skill 审核、受控设备执行、结果验证和只读 Web 快照。它复用 Harness 的 Agent、工具、Skill、审批、Session、Storage 和 subprocess 能力，不修改 Agent Loop 或默认 profile。

包级约定由各 experimental 包 README 负责：[领域](../../packages/experimental/lab-domain/README.zh.md)、[知识库](../../packages/experimental/lab-knowledge/README.zh.md)、[规划](../../packages/experimental/lab-planning/README.zh.md)、[Skill](../../packages/experimental/lab-skill/README.zh.md)、[设备](../../packages/experimental/lab-device/README.zh.md)、[Runtime](../../packages/experimental/lab-runtime/README.zh.md) 和 [Web](../../packages/experimental/lab-mvp-web/README.zh.md)。第一轮组合方式和范围记录在开发规划文档中。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.zh.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxlabdevices--labdeviceservice"></a>

### `ctx.labDevices` — `LabDeviceService`

实验设备服务，保证设备命令只能通过已注册 Provider 进入。

```ts cordis-catalog
/** 注册本进程唯一的设备 Provider。
 * @param provider - provider that owns device operations.
 * @returns - disposer for the registered provider.
 */
registerProvider(provider: LabDeviceProvider): () => void

/** 查询设备及能力，只读。
 * @returns - current device views and capabilities.
 */
listDevices(): readonly DeviceView[]

/** 检查设备健康状态。
 * @param deviceId - device to check.
 * @returns - whether the device is healthy.
 */
healthCheck(deviceId: DeviceId): Promise<boolean>

/** 为一个运行实例申请设备租约。
 * @param deviceId - device to lease.
 * @param runId - run that owns the lease.
 * @returns - completion after the lease is acquired.
 */
reserve(deviceId: DeviceId, runId: RunId): Promise<void>

/** 提交已由 Runtime 校验的设备操作。
 * @param request - validated device operation request.
 * @returns - provider receipt for the operation.
 */
execute(request: DeviceOperationRequest): Promise<DeviceReceipt>

/** 查询设备当前状态。
 * @param deviceId - device to inspect.
 * @returns - current device view, when registered.
 */
status(deviceId: DeviceId): DeviceView | undefined

/** 请求安全停止。
 * @param request - device operation to stop.
 * @returns - provider receipt for the stop request.
 */
stop(request: Pick<DeviceOperationRequest, 'deviceId' | 'runId' | 'operationId'>): Promise<DeviceReceipt>

/** 释放运行实例持有的设备租约。
 * @param deviceId - device whose lease is released.
 * @param runId - run that owns the lease.
 * @returns - completion after the lease is released.
 */
release(deviceId: DeviceId, runId: RunId): Promise<void>
```

Source: [`packages/experimental/lab-device/src/index.ts`](../../packages/experimental/lab-device/src/index.ts)

<a id="ctxlabexperimentcache--labexperimentcacheservice"></a>

### `ctx.labExperimentCache` — `LabExperimentCacheService`

可选的实验缓存写入 Consumer。

```ts cordis-catalog
/** Write an experiment cache projection that can be rebuilt from Session events.
 * @param projection - rebuildable experiment cache projection.
 */
project(projection: ExperimentCacheProjection): Promise<void>

/** Read the latest projected experiment cache.
 * @param experimentId - experiment whose projection is requested.
 * @returns - latest projection, when one has been stored.
 */
get(experimentId: ExperimentId): ExperimentCacheProjection | undefined

/** Bind the process-local Storage projection writer.
 * @param store - storage adapter used for cache projections.
 */
attach(store: ExperimentCacheStore): void
```

Source: [`packages/experimental/lab-cache/src/index.ts`](../../packages/experimental/lab-cache/src/index.ts)

<a id="ctxlabknowledge--knowledgeservice"></a>

### `ctx.labKnowledge` — `KnowledgeService`

实验知识库服务，维护一个可替换 Provider 的能力接缝。

```ts cordis-catalog
/** 注册本进程唯一的知识 Provider。
 * @param provider - provider that owns knowledge storage and retrieval.
 * @returns - disposer for the registered provider.
 */
registerProvider(provider: KnowledgeProvider): () => void

/** 登记资料并返回版本状态。
 * @param request - immutable source registration request.
 * @returns - imported document version status.
 */
importDocument(request: ImportDocumentRequest): Promise<ImportDocumentResult>

/** 读取资料导入状态。
 * @param documentId - document to inspect.
 * @param versionId - optional version to inspect.
 * @returns - import status, when the document or version exists.
 */
getImportStatus(documentId: KnowledgeDocumentId, versionId?: KnowledgeDocumentVersionId): Promise<ImportStatusResult | undefined>

/** 列出所有资料的最近版本状态，供 Web Consumer 展示导入进度。
 * @returns - latest import status for each knowledge document.
 */
listImportStatuses(): Promise<readonly ImportStatusResult[]>

/** 执行带上下文过滤和引用的知识检索。
 * @param request - query, filters, and result limits.
 * @returns - ranked citation results.
 */
search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]>

/** Create a SOP draft.
 * @param request - SOP draft creation request.
 * @returns - created SOP draft.
 */
createSopDraft(request: CreateSopDraftRequest): Promise<SopDraftResult>

/** Read a SOP draft.
 * @param draftId - draft identifier to read.
 * @returns - requested draft, when it exists.
 */
getSopDraft(draftId: KnowledgeSopDraftId): Promise<SopDraftResult | undefined>

/** List all SOP drafts.
 * @returns - all SOP drafts.
 */
listSopDrafts(): Promise<readonly SopDraftResult[]>

/** Update a SOP draft and submit it for review when unblocked.
 * @param request - updated SOP draft fields.
 * @returns - updated SOP draft.
 */
updateSopDraft(request: UpdateSopDraftRequest): Promise<SopDraftResult>

/** Publish an approved SOP draft.
 * @param request - publication request.
 * @returns - published SOP draft.
 */
publishSopDraft(request: PublishSopDraftRequest): Promise<SopDraftResult>

/** 列出冲突事实。
 * @param experimentId - optional experiment scope.
 * @returns - recorded knowledge conflicts.
 */
listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]>

/** 登记一条待人工处理的知识冲突。
 * @param request - conflict details and cited facts.
 * @returns - persisted conflict record.
 */
recordConflict(request: RecordConflictRequest): Promise<KnowledgeConflict>

/** 确认一条带来源的事实。
 * @param request - citation confirmation request.
 */
confirmFact(request: ConfirmFactRequest): Promise<void>

/** 重建派生检索索引。 */
rebuildIndex(): Promise<void>
```

Source: [`packages/experimental/lab-knowledge/src/index.ts`](../../packages/experimental/lab-knowledge/src/index.ts)

<a id="ctxlabmvpweb--labmvpwebservice"></a>

### `ctx.labMvpWeb` — `LabMvpWebService`

Web Consumer Facade 服务。

```ts cordis-catalog
/** 返回供 Web 层序列化的当前实验状态。
 * @param experimentId - experiment whose run state is projected.
 * @param planningContext - optional planning context to include.
 * @returns - serializable device, planning, and runtime state.
 */
async snapshot(experimentId: ExperimentId, planningContext?: PlanningContext): Promise<LabMvpWebSnapshot>

/** Execute a parsed Web command.
 * @param command - parsed Web command.
 * @returns - serializable command result.
 */
async dispatch(command: LabWebCommand): Promise<LabWebCommandResult>

/** Execute a dedicated project/conversation command.
 * @param command - parsed project/conversation command.
 * @returns - serializable project conversation result.
 */
async dispatchProject(command: LabProjectConversationCommand): Promise<LabProjectConversationResult>
```

Source: [`packages/experimental/lab-mvp-web/src/index.ts`](../../packages/experimental/lab-mvp-web/src/index.ts)

<a id="ctxlabplanning--labplanningservice"></a>

### `ctx.labPlanning` — `LabPlanningService`

实验规划服务，隔离 Agent 提案与知识/设备/Skill 具体实现。

```ts cordis-catalog
/** 注册本进程唯一的规划 Provider。
 * @param provider - provider that owns planning and proposal storage.
 * @returns - disposer for the registered provider.
 */
registerProvider(provider: LabPlanningProvider): () => void

/** 根据实验需求组装可审查的检索上下文。
 * @param request - experiment request to contextualize.
 * @returns - cited knowledge, conflicts, gaps, and device context.
 */
buildContext(request: ExperimentRequest): Promise<PlanningContext>

/** 接收 Agent 生成的声明式计划和 Skill 草案。
 * @param input - plan and Skill drafts submitted by the Agent.
 * @returns - deterministic proposal validation result.
 */
propose(input: PlanProposalInput): Promise<PlanProposalResult>

/** 返回已保存的计划提案，供审核和 Web 读取使用。
 * @param planId - plan identifier to read.
 * @returns - stored proposal or undefined when it is not known.
 */
getProposal(planId: ExperimentPlan['planId']): PlanProposalResult | undefined

/** 返回计划审核列表，供 Web Consumer 展示修订状态。
 * @param experimentId - optional experiment filter.
 * @returns - stored proposal copies.
 */
listProposals(experimentId?: ExperimentRequest['experimentId']): readonly PlanProposalResult[]

/** 使用当前 Skill、知识和设备事实重新执行计划确定性校验。
 * @param planId - plan identifier to validate.
 * @returns - updated proposal with current validation result.
 */
validatePlan(planId: ExperimentPlan['planId']): Promise<PlanProposalResult>

/** 将已通过确定性校验的计划标记为人工批准。
 * @param planId - plan identifier to approve.
 * @param approvedBy - reviewer identity.
 * @returns - updated proposal.
 */
approvePlan(planId: ExperimentPlan['planId'], approvedBy: string): Promise<PlanProposalResult>

/** 将计划标记为拒绝并保留拒绝原因。
 * @param planId - plan identifier to reject.
 * @param reason - human review reason.
 * @returns - updated proposal.
 */
rejectPlan(planId: ExperimentPlan['planId'], reason: string): Promise<PlanProposalResult>
```

Source: [`packages/experimental/lab-planning/src/index.ts`](../../packages/experimental/lab-planning/src/index.ts)

<a id="ctxlabprojects--labprojectservice"></a>

### `ctx.labProjects` — `LabProjectService`

Durable project/session association and scope service.

```ts cordis-catalog
/** Attach the existing Storage/SQLite domain and restore its state.
 * @param store - durable project state store.
 */
async attach(store: LabProjectStore): Promise<void>

/** Create an empty active project.
 * @param request - project creation request.
 * @returns - created project view.
 */
async create(request: CreateLabProjectRequest): Promise<LabProjectView>

/** Create a Project-owned Experiment with a Host-generated identity.
 * @param request - Experiment metadata and the creating Session.
 * @returns the created Experiment and its updated Project view.
 */
async createExperiment( request: CreateLabExperimentRequest, ): Promise<{ readonly experiment: LabExperimentRecord; readonly project: LabProjectView }>

/** Link a Project Session to an Experiment without crossing Project ownership.
 * @param request - Experiment Session provenance link.
 * @returns the updated Project view.
 */
async linkExperimentSession(request: LinkLabExperimentSessionRequest): Promise<LabProjectView>

/** List Project Experiments in creation order.
 * @param projectId - Project whose Experiments are requested.
 * @returns Experiment records owned by the Project.
 */
async listExperiments(projectId: LabProjectId): Promise<readonly LabExperimentRecord[]>

/** List active and archived projects in creation order.
 * @returns - project views in creation order.
 */
async list(): Promise<readonly LabProjectView[]>

/** Open one project with its explicit scope and Session rows.
 * @param projectId - project identifier to open.
 * @returns - project view.
 */
async open(projectId: LabProjectId): Promise<LabProjectView>

/** Replace a project selected source versions and devices.
 * @param projectId - project identifier to update.
 * @param request - replacement scope.
 * @returns - updated project view.
 */
async updateScope(projectId: LabProjectId, request: UpdateLabProjectScopeRequest): Promise<LabProjectView>

/** Attach one distinct Harness Session to a project when its Workspace matches.
 * @param request - project/session association request.
 * @returns - attach result or an actionable Workspace mismatch.
 */
async attachSession(request: AttachLabProjectSessionRequest): Promise<LabProjectSessionAttachResult>

/** Detach a Session association without changing the Session log or cwd.
 * @param projectId - project to change.
 * @param sessionId - associated Session to detach.
 * @param detachedBy - actor recorded in the audit log.
 * @returns the updated project view.
 */
async detachSession(projectId: LabProjectId, sessionId: SessionId, detachedBy: SessionId): Promise<LabProjectView>

/** Archive a Project while retaining all associated Session logs and records.
 * @param projectId - project to archive.
 * @param archivedBy - actor recorded in the audit log.
 * @returns the archived project view.
 */
async archive(projectId: LabProjectId, archivedBy: SessionId): Promise<LabProjectView>

/** Rename a project Session without changing Harness Session messages.
 * @param projectId - project identifier.
 * @param sessionId - associated Session identifier.
 * @param title - new non-blank title.
 * @param renamedBy - Session recording the rename.
 * @returns - updated project view.
 */
async renameSession(projectId: LabProjectId, sessionId: SessionId, title: string, renamedBy: SessionId): Promise<LabProjectView>

/** Return explicit project scope and approved shared facts for a Session.
 * @param projectId - project identifier.
 * @param sessionId - optional associated Session identifier.
 * @returns - project context for the Session.
 */
async context(projectId: LabProjectId, sessionId?: SessionId): Promise<LabProjectContext>

/** Publish one explicitly approved fact for later Sessions.
 * @param request - project fact publication request.
 * @returns - updated project view.
 */
async publishFact(request: PublishLabProjectFactRequest): Promise<LabProjectView>

/** Project one proposal, approval, run or report into the rebuildable cache.
 * @param projection - rebuildable project evidence projection.
 * @returns - updated project view.
 */
async projectEvidence(projection: LabProjectEvidenceProjection): Promise<LabProjectView>

/** Read audit records for recovery and diagnostics.
 * @param projectId - project identifier.
 * @returns - project audit records.
 */
async listAudits(projectId: LabProjectId): Promise<readonly LabProjectAudit[]>

/** Return the project owning a Session, when the Session has been associated.
 * @param sessionId - Session identifier to resolve.
 * @returns - owning project, when the Session is associated.
 */
async projectForSession(sessionId: SessionId): Promise<LabProject | undefined>

/** Assert that a Session is explicitly associated with a project.
 * @param projectId - expected project identifier.
 * @param sessionId - Session identifier to check.
 */
async assertSession(projectId: LabProjectId, sessionId: SessionId): Promise<void>
```

Types: [SessionId](core.zh.md)

Source: [`packages/experimental/lab-project/src/index.ts`](../../packages/experimental/lab-project/src/index.ts)

<a id="ctxlabruntime--labruntimeservice"></a>

### `ctx.labRuntime` — `LabRuntimeService`

受控实验运行时，只允许从已注册 Provider 进入执行。

```ts cordis-catalog
/** 注册本进程唯一的 Runtime Provider。
 * @param provider - provider that owns controlled execution state.
 * @returns - disposer for the registered provider.
 */
registerProvider(provider: LabRuntimeProvider): () => void

/** 创建实验请求。
 * @param request - experiment request to register.
 * @returns - completion after the request is stored.
 */
createExperiment(request: ExperimentRequest): Promise<void>

/** 记录计划及 Skill 的人工批准。
 * @param request - approved plan, Skill revisions, and optional execution graph inputs.
 * @returns - completion after approval is stored.
 */
approvePlan(request: ApprovePlanRequest): Promise<void>

/** 从批准的计划启动运行。
 * @param input - 实验、已批准计划和可选的启动 Session。
 * @returns - 新建或已有的运行视图。
 */
startRun(input: StartRunRequest): Promise<RunView>

/** 提交人工步骤证据，或批准需要人工门禁的设备步骤。
 * @param runId - run receiving the evidence.
 * @param evidence - evidence strings supplied by a human or operation.
 * @param confirmedBy - accountable confirmer.
 * @param stepId - optional step identity for a waiting operation.
 * @param operationId - optional operation identity for an idempotent confirmation.
 * @returns - updated run view.
 */
confirmStep( runId: RunId, evidence: readonly string[], confirmedBy: string, stepId?: PlanStepId, operationId?: OperationId, ): Promise<RunView>

/** 推进当前执行图步骤；设备步骤只能通过 Lab Device Service 执行。
 * @param runId - run whose current graph step should advance.
 * @returns - updated run view.
 */
executeNextStep(runId: RunId): Promise<RunView>

/** 请求安全停止。
 * @param runId - run to stop.
 * @param requestedBy - actor requesting the stop.
 * @returns - stopped run view.
 */
stopRun(runId: RunId, requestedBy: string): Promise<RunView>

/** 读取一个运行状态。
 * @param runId - run whose state is requested.
 * @returns - run view, when one exists.
 */
getRun(runId: RunId): RunView | undefined

/** List all immutable Runs for one Experiment.
 * @param experimentId - experiment whose runs are requested.
 * @returns ordered run views.
 */
listRuns(experimentId: import('@deepseek-ai/dsh-experimental-lab-domain').ExperimentId): readonly RunView[]

/** Retry a terminal Run as a new Run.
 * @param runId - terminal run to retry.
 * @param actor - accountable retry requester.
 * @returns the new Run view.
 */
retryRun(runId: RunId, actor: string): Promise<RunView>

/** 生成带证据的实验报告。
 * @param runId - run to report.
 * @returns - structured report fields and observations.
 */
buildReport(runId: RunId): Promise<LabRunReport>
```

Source: [`packages/experimental/lab-runtime/src/index.ts`](../../packages/experimental/lab-runtime/src/index.ts)

<a id="ctxlabskills--labskillservice"></a>

### `ctx.labSkills` — `LabSkillService`

实验 Skill 服务，隔离动作定义与 Harness 指令 Skill。

```ts cordis-catalog
/** 注册本进程唯一的实验 Skill Provider。
 * @param provider - provider that owns Skill revisions.
 * @returns - disposer for the registered provider.
 */
registerProvider(provider: LabSkillProvider): () => void

/** 登记模型生成的脚本或 API 候选资源。
 * @param resource - candidate resource content and stable reference.
 * @returns - stored candidate resource.
 */
registerCandidateResource(resource: LabOperationResourceInput): Promise<LabOperationResource>

/** 将已登记候选资源标记为可供 Skill 校验使用。
 * @param kind - candidate resource kind.
 * @param resourceRef - stable resource reference.
 * @returns - installed resource.
 */
installResource(kind: LabOperationResourceKind, resourceRef: string): Promise<LabOperationResource>

/** 查询候选或已安装资源。
 * @param kind - resource kind.
 * @param resourceRef - stable resource reference.
 * @returns - resource, when registered.
 */
resolveResource(kind: LabOperationResourceKind, resourceRef: string): LabOperationResource | undefined

/** 保存 Agent 生成的声明式 Skill 草案。
 * @param draft - Agent-generated declarative Skill draft.
 * @returns - stored Skill revision.
 */
createDraft(draft: LabSkillDraft): Promise<LabSkillRevision>

/** 对草案执行确定性校验。
 * @param revisionId - draft revision to validate.
 * @returns - validated Skill revision.
 */
validateDraft(revisionId: SkillRevisionId): Promise<LabSkillRevision>

/** 记录人工批准。
 * @param revisionId - revision to approve.
 * @param approvedBy - accountable reviewer identity.
 * @returns - human-approved Skill revision.
 */
approveDraft(revisionId: SkillRevisionId, approvedBy: string): Promise<LabSkillRevision>

/** 激活已批准的 Skill 修订。
 * @param revisionId - approved revision to activate.
 * @returns - active Skill revision.
 */
activateRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision>

/** 读取修订。
 * @param revisionId - revision to resolve.
 * @returns - matching Skill revision, when present.
 */
resolveRevision(revisionId: SkillRevisionId): LabSkillRevision | undefined

/** 为运行实例创建不可变 Skill 快照。
 * @param revisionIds - active revisions to snapshot.
 * @returns - immutable Skill snapshots for a run.
 */
snapshotForRun(revisionIds: readonly SkillRevisionId[]): Promise<readonly SkillSnapshot[]>

/** 退役一条修订。
 * @param revisionId - active revision to retire.
 * @returns - retired Skill revision.
 */
retireRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision>
```

Source: [`packages/experimental/lab-skill/src/index.ts`](../../packages/experimental/lab-skill/src/index.ts)
<!-- END GENERATED cordis-surface -->
