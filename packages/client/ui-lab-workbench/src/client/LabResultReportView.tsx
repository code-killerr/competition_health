import type { JSX } from 'react'
import type { LabReportView } from './api.ts'
import type { LabCitationSelection } from './LabUiContext.ts'
import css from './LabResultReportView.module.css'

/** Localized labels for the structured Result and report view. */
export interface LabResultReportLabels {
  readonly title: string
  readonly experiment: string
  readonly criteria: string
  readonly method: string
  readonly verdict: string
  readonly plan: string
  readonly run: string
  readonly evidence: string
  readonly actor: string
  readonly assessedAt: string
  readonly observations: string
  readonly artifacts: string
  readonly skillRevisions: string
  readonly citations: string
  readonly observationIds: string
  readonly artifactIds: string
  readonly openCitation: string
  readonly citationUnavailable: string
  readonly humanQc: string
  readonly humanQcAction: string
  readonly humanQcUnavailable: string
  readonly noValue: string
  readonly noCriteria: string
}

/** Render Host-owned assessment and report records without exposing raw JSON as the primary UI. */
export function LabResultReportView(props: { readonly report: LabReportView; readonly labels: LabResultReportLabels; readonly knowledgeAvailable?: boolean; readonly onOpenCitation?: (citation: LabCitationSelection) => void; readonly onHumanQcReview?: () => void }): JSX.Element {
  const assessment = props.report.assessment
  const labels = props.labels
  return <section className={css.root} aria-label={labels.title} data-lab-result-report><header><h2>{labels.title}</h2><span>{assessment?.status ?? labels.noValue}</span></header><div className={css.grid}><Field label={labels.experiment} value={props.report.experimentId} /><Field label={labels.plan} value={props.report.planId} /><Field label={labels.run} value={props.report.runId} /><Field label={labels.verdict} value={assessment?.verdict ?? labels.noValue} /><Field label={labels.method} value={assessment?.method ?? labels.noValue} /><Field label={labels.actor} value={assessment?.assessedBy ?? labels.noValue} /><Field label={labels.assessedAt} value={assessment?.assessedAt === undefined ? labels.noValue : String(assessment.assessedAt)} /><Field label={labels.evidence} value={String(assessment?.evidenceIds.length ?? props.report.artifacts.length)} /><Field label={labels.observations} value={String(props.report.observations.length)} /><Field label={labels.artifacts} value={String(props.report.artifacts.length)} /></div><section className={css.criteria}><h3>{labels.criteria}</h3>{props.report.criteria?.length === 0 || props.report.criteria === undefined ? <p>{labels.noCriteria}</p> : props.report.criteria.map(item => <div key={item}>{item}</div>)}</section><section className={css.provenance}><h3>{labels.skillRevisions}</h3>{props.report.skillRevisionIds?.length === 0 || props.report.skillRevisionIds === undefined ? <p>{labels.noValue}</p> : <ul>{props.report.skillRevisionIds.map(id => <li key={id}>{id}</li>)}</ul>}<h3>{labels.observationIds}</h3>{props.report.observations.length === 0 ? <p>{labels.noValue}</p> : <ul>{props.report.observations.map(observation => <li key={observation.operationId}><strong>{observation.operationId}</strong><span>{observation.stepId} · {observation.status}</span></li>)}</ul>}<h3>{labels.artifactIds}</h3>{props.report.artifacts.length === 0 ? <p>{labels.noValue}</p> : <ul>{props.report.artifacts.map(artifact => <li key={artifact.artifactId}><strong>{artifact.artifactId}</strong><span>{artifact.displayName} · {artifact.mediaType} · {artifact.size}</span></li>)}</ul>}<h3>{labels.citations}</h3>{props.report.citations?.length === 0 || props.report.citations === undefined ? <p>{labels.noValue}</p> : <ul>{props.report.citations.map(citation => <li key={citation.documentId + ':' + citation.versionId + ':' + citation.location}><Citation citation={citation} labels={labels} available={props.knowledgeAvailable === true} onOpen={props.onOpenCitation} /></li>)}</ul>}</section>{assessment?.humanQcRequired === true && <div className={css.gate}><p>{labels.humanQc}</p>{props.onHumanQcReview === undefined ? <span>{labels.humanQcUnavailable}</span> : <button type='button' onClick={props.onHumanQcReview}>{labels.humanQcAction}</button>}</div>}</section>
}

function Citation({ citation, labels, available, onOpen }: { readonly citation: NonNullable<LabReportView['citations']>[number]; readonly labels: LabResultReportLabels; readonly available: boolean; readonly onOpen?: ((citation: LabCitationSelection) => void) | undefined }): JSX.Element {
  if (!available || onOpen === undefined) return <span data-lab-report-citation-unavailable>{citation.sourceName ?? citation.documentId} · {citation.versionId}{citation.location === undefined ? '' : ' · ' + citation.location} · {labels.citationUnavailable}</span>
  const target: LabCitationSelection = { projectId: citation.projectId, documentId: citation.documentId, versionId: citation.versionId, ...(citation.location === undefined ? {} : { location: citation.location }) }
  return <button type='button' onClick={() => { onOpen(target) }}>{labels.openCitation}: {citation.sourceName ?? citation.documentId}{citation.location === undefined ? '' : ' · ' + citation.location}</button>
}

function Field({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className={css.field}><span>{label}</span><strong>{value}</strong></div>
}
