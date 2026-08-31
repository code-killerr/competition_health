import type { JSX } from 'react'
import type { LabArtifactPreview, LabArtifactRecord } from './api.ts'
import css from './LabArtifactPreview.module.css'

/** Content already authorized and decoded by the Host for one Artifact. */
export type LabArtifactPreviewValue = LabArtifactPreview

/** Localized labels for safe Artifact inspection. */
export interface LabArtifactPreviewLabels {
  readonly open: string
  readonly loading: string
  readonly unavailable: string
  readonly text: string
  readonly json: string
  readonly image: string
  readonly unsupported: string
  readonly metadata: string
}

/** Render Artifact metadata and Host-authorized text, JSON or image content. */
export function LabArtifactPreview(props: { readonly artifact: LabArtifactRecord; readonly preview?: LabArtifactPreviewValue | undefined; readonly previewState?: 'loading' | 'unavailable'; readonly labels: LabArtifactPreviewLabels; readonly selected?: boolean; readonly onOpen?: ((artifact: LabArtifactRecord) => void) | undefined }): JSX.Element {
  const { artifact, labels } = props
  return <article className={css.root} data-lab-artifact-id={artifact.artifactId} data-lab-artifact-kind={artifact.kind} data-selected={props.selected || undefined}><header><strong>{artifact.displayName}</strong><span>{artifact.kind}</span></header><div className={css.metadata}><span>{labels.metadata}</span><span>{artifact.mediaType} · {artifact.size}</span></div>{props.previewState === 'loading' ? <p role='status'>{labels.loading}</p> : props.previewState === 'unavailable' || props.preview === undefined ? <p role='status'>{labels.unavailable}</p> : <Preview preview={props.preview} labels={labels} />}{props.onOpen !== undefined && <button type='button' onClick={() => { props.onOpen?.(artifact) }}>{labels.open}</button>}</article>
}

function Preview({ preview, labels }: { readonly preview: LabArtifactPreviewValue; readonly labels: LabArtifactPreviewLabels }): JSX.Element {
  if (preview.kind === 'text') return <pre aria-label={labels.text}>{preview.content}</pre>
  if (preview.kind === 'json') return <pre aria-label={labels.json}>{JSON.stringify(preview.content, null, 2)}</pre>
  if (preview.kind === 'unsupported') return <p>{labels.unsupported}</p>
  return <div className={css.image}><img src={preview.src} alt={preview.alt} /><span>{labels.image}</span></div>
}
