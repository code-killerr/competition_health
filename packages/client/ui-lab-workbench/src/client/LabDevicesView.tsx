import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { JSX } from 'react'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { LabDevice } from './api.ts'
import type { LabQueryState } from './adapter.ts'
import css from './LabDevicesView.module.css'

/** Selection subset required by the Devices page. */
export interface LabDevicesUi {
  /** Return the active Experiment used to scope device records. */
  readonly snapshot: () => { readonly activeExperimentId?: string }
  /** Subscribe to presentation selection changes. */
  readonly subscribe: (listener: () => void) => () => void
}

/** Business services injected by the host composition. */
export interface LabDevicesInjected {
  readonly ui?: LabDevicesUi | undefined
  readonly source: 'deterministic' | 'mock' | 'real'
  readonly loadDevices: (experimentId: string) => Promise<LabQueryState<readonly LabDevice[]>>
}

type LabDevicesProps = PropsRuntime<'app.view'> & PropsLocale<'labWorkbench'> & LabDevicesInjected

const EMPTY_SELECTION: { readonly activeExperimentId?: string } = {}
const EMPTY_UNSUBSCRIBE = (): void => {}

/** Render device records within the active Experiment scope. */
export function LabDevicesView(props: LabDevicesProps): JSX.Element {
  const subscribe = useCallback((listener: () => void): (() => void) => props.ui?.subscribe(listener) ?? EMPTY_UNSUBSCRIBE, [props.ui])
  const getSelection = useCallback(() => props.ui?.snapshot() ?? EMPTY_SELECTION, [props.ui])
  const selection = useSyncExternalStore(subscribe, getSelection, getSelection)
  const [result, setResult] = useState<LabQueryState<readonly LabDevice[]>>({ state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message: props.t('devicesNoExperiment'), retryable: false })

  const refresh = useCallback(async (): Promise<void> => {
    const experimentId = selection.activeExperimentId
    if (experimentId === undefined) {
      setResult({ state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message: props.t('devicesNoExperiment'), retryable: false })
      return
    }
    setResult({ state: 'waiting', code: 'RUN_IN_PROGRESS', message: props.t('devicesLoading') })
    const loaded = await props.loadDevices(experimentId)
    setResult(loaded.state === 'ready' && loaded.value.length === 0
      ? { state: 'empty', code: 'NO_RECORDS', message: props.t('devicesEmpty') }
      : loaded)
  }, [props, selection.activeExperimentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const devices = result.state === 'ready' ? result.value : []
  const stateLabel = result.state === 'ready'
    ? props.t('devicesReady')
    : result.state === 'empty'
      ? props.t('devicesEmpty')
      : result.state === 'waiting'
        ? props.t('devicesLoading')
        : props.t('devicesUnavailable')

  return (
    <section className={css.root} aria-label={props.t('devicesTitle')} data-lab-devices>
      <header className={css.header}>
        <div>
          <span className={css.eyebrow}>{props.t('devicesEyebrow')}</span>
          <h1 className={css.title}>{props.t('devicesTitle')}</h1>
          <span className={css.summary}>{props.t('devicesSummary')}</span>
        </div>
        <div className={css.status}>
          <span className={css.statusLabel}>{props.t('devicesState')}</span>
          <span className={css.statusValue}>{stateLabel}</span>
        </div>
      </header>
      {result.state !== 'ready' && result.state !== 'empty' && (
        <div className={css.notice} role='status'>{result.message}</div>
      )}
      {result.state === 'empty' && <div className={css.notice} role='status'>{result.message}</div>}
      <div className={css.grid}>
        {devices.map(device => {
          const healthy = device.status !== 'unhealthy'
          const reserved = device.status === 'reserved'
          return (
            <article className={css.card} key={device.id ?? device.name ?? 'device'}>
              <div className={css.cardHeader}>
                <div>
                  <h2 className={css.deviceName}>{device.name ?? props.t('unknownDevice')}</h2>
                  {device.id !== undefined && <span className={css.deviceId}>{device.id}</span>}
                </div>
                <span className={healthy ? css.badge : css.badgeMuted}>{healthy ? props.t('deviceHealthy') : props.t('deviceUnhealthy')}</span>
              </div>
              <div className={css.details}>
                <div><span>{props.t('deviceSource')}</span><strong>{props.t(props.source)}</strong></div>
                <div><span>{props.t('deviceReservation')}</span><strong>{reserved ? props.t('deviceReserved') : props.t('deviceAvailable')}</strong></div>
              </div>
              <div className={css.capabilities}>
                {(device.capabilities ?? []).map(capability => <span className={css.capability} key={capability.name ?? 'capability'}>{capability.name ?? props.t('unknownCapability')}</span>)}
                {(device.capabilities ?? []).length === 0 && <span className={css.muted}>{props.t('noCapabilities')}</span>}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
