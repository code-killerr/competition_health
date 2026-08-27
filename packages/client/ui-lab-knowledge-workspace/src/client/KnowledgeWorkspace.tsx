/** Knowledge workspace body; all persistence goes through the current MVP public Web Facade. */

import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import css from './KnowledgeWorkspace.module.css'
import type {} from '@deepseek-ai/dsh-client-ui-lab-workbench/client'

interface ImportStatus {
  readonly documentId: string
  readonly versionId: string
  readonly status: string
  readonly sourceName?: string
  readonly error?: string
}

interface Citation {
  readonly citationId: string
  readonly documentId: string
  readonly versionId: string
  readonly location: string
  readonly excerpt: string
  readonly confirmed: boolean
  readonly provenance?: string
}

interface SopStep {
  readonly order: number
  readonly title: string
  readonly instruction: string
  readonly requiredInputs: readonly string[]
  readonly completionCriteria: readonly string[]
  readonly citations: readonly string[]
  readonly missingFields: readonly string[]
}

interface SopDraft {
  readonly draftId: string
  readonly title: string
  readonly status: string
  readonly steps: readonly SopStep[]
  readonly blockers: readonly string[]
}

type Snapshot = {
  readonly knowledgeCapability?: { readonly state?: string; readonly reason?: string }
  readonly knowledge?: readonly unknown[]
}

type KnowledgeWorkspaceOwnerProps = {
  readonly projectId?: string
  readonly experimentId?: string
  readonly selectedSources?: readonly { readonly documentId: string; readonly versionId: string }[]
  readonly onSourceToggle?: (source: { readonly documentId: string; readonly versionId: string }) => void
  readonly onCitationAvailable?: (citation: {
    readonly citationId: string
    readonly documentId: string
    readonly versionId: string
    readonly location: string
    readonly excerpt: string
    readonly confirmed: boolean
  }) => void
}

type ApiResult = {
  readonly kind?: string
  readonly value?: unknown
}

export type KnowledgeWorkspaceProps =
  & PropsRuntime<'lab.knowledge.workspace'>
  & PropsLocale<'labKnowledgeWorkspace'>
  & KnowledgeWorkspaceOwnerProps

/** Render the public Knowledge workspace in the Lab Workbench slot. */
export function KnowledgeWorkspace(props: KnowledgeWorkspaceProps): JSX.Element {
  const [capability, setCapability] = useState<{ readonly state: string; readonly reason?: string }>({ state: 'unavailable' })
  const [imports, setImports] = useState<readonly ImportStatus[]>([])
  const [selectedFile, setSelectedFile] = useState<File | undefined>()
  const [query, setQuery] = useState('')
  const [citations, setCitations] = useState<readonly Citation[]>([])
  const [draft, setDraft] = useState<SopDraft | undefined>()
  const [title, setTitle] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [notice, setNotice] = useState<string | undefined>()

  const sessionId = String(props.sessionId)
  const experimentId = props.experimentId ?? 'experiment-1'
  const selectedSources = props.selectedSources ?? []

  const refresh = useCallback(async (): Promise<void> => {
    const value = await callLab({ command: 'snapshot', experimentId, sessionId })
    const snapshot = parseSnapshot(value)
    setCapability(parseCapability(snapshot))
    setImports((snapshot.knowledge ?? []).map(parseImportStatus))
  }, [experimentId, sessionId])

  useEffect(() => {
    void refresh().catch((reason: unknown) => { setError(errorMessage(reason)) })
  }, [refresh])

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    try {
      await action()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const importFile = (file: File): void => {
    void run(async () => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const value = await callLab({
        command: 'knowledge-import',
        sessionId,
        name: file.name,
        bytesBase64: encodeBase64(bytes),
        metadata: { dataset: 'pdf-knowledge', sourceName: file.name },
      })
      const imported = parseImportStatus(value)
      setImports(current => [imported, ...current.filter(item => item.versionId !== imported.versionId)])
      setSelectedFile(undefined)
      setNotice(props.t('imported'))
    })
  }

  const importSelectedFile = (): void => {
    if (selectedFile === undefined) {
      setError(props.t('noFile'))
      return
    }
    importFile(selectedFile)
  }

  const search = (): void => {
    void run(async () => {
      const value = await callLab({
        command: 'knowledge-search',
        sessionId,
        request: { query: query.trim(), limit: 10, experimentId },
      })
      const result = record(value)
      const nextCitations = array(result.results).map(parseCitation)
      setCitations(nextCitations)
      nextCitations.forEach((citation) => { props.onCitationAvailable?.(citation) })
    })
  }

  const createSop = (citation: Citation): void => {
    void run(async () => {
      const nextTitle = title.trim() || 'Knowledge procedure'
      const step = createStep(citation)
      const value = await callLab({
        command: 'knowledge-sop-create',
        sessionId,
        title: nextTitle,
        steps: [step],
      })
      setTitle(nextTitle)
      setDraft(parseSop(value))
    })
  }

  const confirmAndReview = (): void => {
    if (draft === undefined) return
    void run(async () => {
      const step = draft.steps[0]
      if (step === undefined) throw new Error('SOP has no step to review')
      const citationId = step.citations[0]
      if (citationId === undefined) throw new Error('SOP step has no citation')
      await callLab({ command: 'knowledge-fact-confirm', sessionId, citationId, confirmedBy: reviewer.trim() })
      const value = await callLab({
        command: 'knowledge-sop-update',
        sessionId,
        draftId: draft.draftId,
        title: draft.title,
        steps: [step],
      })
      setDraft(parseSop(value))
      setNotice(props.t('reviewed'))
    })
  }

  const publish = (): void => {
    if (draft === undefined) return
    void run(async () => {
      const value = await callLab({
        command: 'knowledge-sop-publish',
        sessionId,
        draftId: draft.draftId,
        publishedBy: reviewer.trim(),
      })
      setDraft(parseSop(value))
      setNotice(props.t('published'))
    })
  }

  return (
    <section className={css.root} aria-label={props.t('title')} data-lab-knowledge-workspace>
      <header className={css.header}>
        <div>
          <h3>{props.t('title')}</h3>
          <span className={css.eyebrow}>{props.t('publicContract')}</span>
        </div>
        <div className={css.status}>
          <span>{props.t('project')}: {props.projectId || props.t('noProject')}</span>
          <span>{props.t('capability')}</span>
          <span className={css.badge}>{capability.state === 'available' ? props.t('available') : props.t('unavailable')}</span>
        </div>
      </header>
      {(error !== undefined || notice !== undefined) && (
        <div className={error === undefined ? css.notice : css.error} role="status">
          {error === undefined ? notice : props.t('error') + ': ' + error}
        </div>
      )}
      <div className={css.grid}>
        <section className={css.panel}>
          <h4>{props.t('imports')}</h4>
          <label className={css.field}>
            <span>{props.t('fileInput')}</span>
            <input
              type="file"
              accept=".pdf"
              disabled={busy}
              onChange={(event) => {
                setSelectedFile(event.currentTarget.files?.[0])
              }}
            />
          </label>
          <button type="button" className={css.button} disabled={busy || selectedFile === undefined} onClick={importSelectedFile}>
            {props.t('importFile')}
          </button>
          <ul className={css.list}>
            {imports.map(item => (
              <li key={item.versionId} className={css.row}>
                <span className={css.rowText}>
                  <strong>{item.sourceName ?? item.documentId}</strong>
                  <span className={css.muted}>{item.documentId}:{item.versionId}</span>
                </span>
                <span className={css.actions}>
                  <span className={css.badge}>{item.status}</span>
                  {item.status === 'READY' && (
                    <button type="button" className={css.button} disabled={busy} onClick={() => { props.onSourceToggle?.({ documentId: item.documentId, versionId: item.versionId }) }}>
                      {selectedSources.some(source => source.documentId === item.documentId && source.versionId === item.versionId) ? props.t('removeFromProject') : props.t('addToProject')}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {imports.length === 0 && <span className={css.muted}>{props.t('empty')}</span>}
        </section>
        <section className={css.panel}>
          <h4>{props.t('search')}</h4>
          <label className={css.field}>
            <span>{props.t('query')}</span>
            <input value={query} onChange={(event) => { setQuery(event.currentTarget.value) }} />
          </label>
          <button type="button" className={css.button} disabled={busy || query.trim() === ''} onClick={search}>{props.t('searchAction')}</button>
          <ul className={css.list}>
            {citations.map(citation => (
              <li key={citation.citationId} className={css.row}>
                <span className={css.rowText}>
                  <strong>{citation.citationId}</strong>
                  <span className={css.muted}>{citation.excerpt}</span>
                  <span className={css.muted}>{citation.documentId}:{citation.versionId} · {citation.location}</span>
                </span>
                <button type="button" className={css.button} disabled={busy || !citation.confirmed} onClick={() => { createSop(citation) }}>
                  {props.t('createSop')}
                </button>
              </li>
            ))}
          </ul>
          {citations.length === 0 && <span className={css.muted}>{props.t('empty')}</span>}
        </section>
      </div>
      <section className={css.panel}>
        <h4>{props.t('sop')}</h4>
        <label className={css.field}>
          <span>{props.t('sopTitle')}</span>
          <input value={title} onChange={(event) => { setTitle(event.currentTarget.value) }} />
        </label>
        {draft === undefined && <span className={css.muted}>{props.t('noCitation')}</span>}
        {draft !== undefined && (
          <>
            <div className={css.row}>
              <span className={css.rowText}>
                <strong>{draft.title}</strong>
                <span className={css.muted}>{draft.draftId} · {draft.status}</span>
                <span className={css.muted}>{draft.blockers.join('; ')}</span>
              </span>
            </div>
            <div className={css.actions}>
              <label className={css.field}>
                <span>{props.t('reviewer')}</span>
                <input value={reviewer} onChange={(event) => { setReviewer(event.currentTarget.value) }} />
              </label>
              {draft.status !== 'PUBLISHED' && <button type="button" className={css.button} disabled={busy || reviewer.trim() === '' || draft.status === 'REVIEWED'} onClick={confirmAndReview}>{props.t('confirmAndReview')}</button>}
              {draft.status === 'REVIEWED' && <button type="button" className={css.button} disabled={busy || reviewer.trim() === ''} onClick={publish}>{props.t('publish')}</button>}
              {draft.status === 'PUBLISHED' && <span className={css.badge}>{props.t('published')}</span>}
            </div>
          </>
        )}
      </section>
    </section>
  )
}

function createStep(citation: Citation): SopStep {
  return {
    order: 1,
    title: 'Use cited source',
    instruction: citation.excerpt,
    requiredInputs: [],
    completionCriteria: ['operator confirms completion'],
    citations: [citation.citationId],
    missingFields: [],
  }
}

async function callLab(command: Record<string, unknown>): Promise<unknown> {
  const response = await fetch('/api/lab', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(command),
  })
  const body = record(await response.json())
  if (!response.ok) {
    const error = record(body.error)
    throw new Error(stringValue(error.message) ?? 'Knowledge Facade request failed')
  }
  const result: ApiResult = record(body.result)
  return result.value
}

function parseSnapshot(value: unknown): Snapshot {
  return record(value)
}

function parseCapability(snapshot: Snapshot): { readonly state: string; readonly reason?: string } {
  const capability = snapshot.knowledgeCapability
  if (capability === undefined) return { state: 'unavailable' }
  return {
    state: capability.state ?? 'unavailable',
    ...capability.reason === undefined ? {} : { reason: capability.reason },
  }
}
function parseImportStatus(value: unknown): ImportStatus {
  const item = record(value)
  const metadata = recordOrUndefined(item.metadata)
  const sourceName = stringValue(metadata?.sourceName)
  const error = stringValue(item.error)
  return {
    documentId: stringValue(item.documentId) ?? 'unknown-document',
    versionId: stringValue(item.versionId) ?? 'unknown-version',
    status: stringValue(item.status) ?? 'UNKNOWN',
    ...sourceName === undefined ? {} : { sourceName },
    ...error === undefined ? {} : { error },
  }
}

function parseCitation(value: unknown): Citation {
  const item = record(value)
  const provenance = stringValue(item.provenance)
  return {
    citationId: stringValue(item.citationId) ?? 'unknown-citation',
    documentId: stringValue(item.documentId) ?? 'unknown-document',
    versionId: stringValue(item.versionId) ?? 'unknown-version',
    location: stringValue(item.location) ?? 'unknown-location',
    excerpt: stringValue(item.excerpt) ?? '',
    confirmed: item.confirmed === true,
    ...provenance === undefined ? {} : { provenance },
  }
}

function parseSop(value: unknown): SopDraft {
  const result = record(value)
  const draft = record(result.draft)
  const steps = array(draft.steps).map((item) => {
    const step = record(item)
    return {
      order: numberValue(step.order) ?? 0,
      title: stringValue(step.title) ?? '',
      instruction: stringValue(step.instruction) ?? '',
      requiredInputs: stringArray(step.requiredInputs),
      completionCriteria: stringArray(step.completionCriteria),
      citations: stringArray(step.citations),
      missingFields: stringArray(step.missingFields),
    }
  })
  return {
    draftId: stringValue(draft.draftId) ?? 'unknown-draft',
    title: stringValue(draft.title) ?? '',
    status: stringValue(draft.status) ?? 'UNKNOWN',
    steps,
    blockers: stringArray(result.blockers),
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('response must be an object')
  return value as Record<string, unknown>
}

function array(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function stringArray(value: unknown): readonly string[] {
  return array(value).flatMap(item => typeof item === 'string' ? [item] : [])
}

function recordOrUndefined(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
