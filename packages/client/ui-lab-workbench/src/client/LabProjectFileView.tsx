import type { JSX } from 'react'
import type { LabProjectFilePreview, LabProjectFileRecord } from './api.ts'
import css from './LabProjectFileView.module.css'

/** Project 文件目录中可执行动作的本地化文案。 */
export interface LabProjectFileLabels {
  readonly preview: string
  readonly download: string
  readonly loading: string
  readonly unavailable: string
  readonly metadata: string
  readonly path: string
  readonly revision: string
  readonly downloadReady: string
  readonly previewUnavailable: string
}

/** 展示一个不携带正文的 Project 文件记录，并通过 adapter 请求授权动作。 */
export function LabProjectFileView(props: {
  readonly file: LabProjectFileRecord
  readonly preview?: LabProjectFilePreview
  readonly previewState?: 'idle' | 'loading' | 'unavailable'
  readonly downloadState?: 'idle' | 'loading' | 'ready' | 'unavailable'
  readonly labels: LabProjectFileLabels
  readonly onPreview?: () => void
  readonly onDownload?: () => void
}): JSX.Element {
  const { file, labels } = props
  return <article className={css.root} data-lab-project-file-id={file.projectFileId} data-lab-project-file-group={file.group}>
    <header className={css.header}>
      <div className={css.title}><strong>{file.displayName}</strong><span>{file.group}</span></div>
      <span className={css.revision}>{labels.revision} {file.revision}</span>
    </header>
    <dl className={css.metadata}>
      <div><dt>{labels.path}</dt><dd>{file.relativePath}</dd></div>
      <div><dt>{labels.metadata}</dt><dd>{file.mediaType} · {file.size}</dd></div>
    </dl>
    {props.previewState === 'loading' && <p role='status'>{labels.loading}</p>}
    {props.previewState === 'unavailable' && <p role='status'>{labels.unavailable}</p>}
    {props.downloadState === 'loading' && <p role='status'>{labels.loading}</p>}
    {props.downloadState === 'unavailable' && <p role='status'>{labels.unavailable}</p>}
    {props.preview !== undefined && <Preview preview={props.preview} labels={labels} />}
    <div className={css.actions}>
      {props.onPreview !== undefined && <button type='button' onClick={props.onPreview}>{labels.preview}</button>}
      {props.onDownload !== undefined && <button type='button' onClick={props.onDownload}>{props.downloadState === 'ready' ? labels.downloadReady : labels.download}</button>}
    </div>
  </article>
}

function Preview({ preview, labels }: { readonly preview: LabProjectFilePreview; readonly labels: LabProjectFileLabels }): JSX.Element {
  if (preview.kind === 'text') return <pre>{preview.content}</pre>
  if (preview.kind === 'json') return <pre>{JSON.stringify(preview.content, null, 2)}</pre>
  if (preview.kind === 'image') return <img src={preview.src} alt={preview.alt} />
  return <p>{labels.previewUnavailable}</p>
}
