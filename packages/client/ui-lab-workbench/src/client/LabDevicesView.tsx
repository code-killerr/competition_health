import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { JSX } from 'react'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { LabDevice, LabProjectView } from './api.ts'
import type { LabQueryState } from './adapter.ts'
import css from './LabDevicesView.module.css'

/** Selection subset required by the Devices page. */
export interface LabDevicesUi {
  /** Return the active Project and optional Experiment presentation selection. */
  readonly snapshot: () => { readonly activeProjectId?: string; readonly activeExperimentId?: string }
  /** Subscribe to presentation selection changes. */
  readonly subscribe: (listener: () => void) => () => void
}

/** Business services injected by the host composition. */
export interface LabDevicesInjected {
  readonly ui?: LabDevicesUi | undefined
  readonly source: 'deterministic' | 'mock' | 'real'
  readonly loadDevices: (experimentId?: string) => Promise<LabQueryState<readonly LabDevice[]>>
  /** Load the current Project scope before a device is attached or removed. */
  readonly loadProject?: (projectId: string) => Promise<LabQueryState<LabProjectView>>
  /** Update the Host-owned Project device scope. */
  readonly onDeviceToggle?: (projectId: string, deviceId: string) => Promise<void>
}

type LabDevicesProps = PropsRuntime<'app.view'> & PropsLocale<'labWorkbench'> & LabDevicesInjected

const EMPTY_SELECTION: { readonly activeProjectId?: string; readonly activeExperimentId?: string } = {}
const EMPTY_UNSUBSCRIBE = (): void => {}

/** Render device records within the active Experiment scope. */
export function LabDevicesView(props: LabDevicesProps): JSX.Element {
  const subscribe = useCallback((listener: () => void): (() => void) => props.ui?.subscribe(listener) ?? EMPTY_UNSUBSCRIBE, [props.ui])
  const getSelection = useCallback(() => props.ui?.snapshot() ?? EMPTY_SELECTION, [props.ui])
  const selection = useSyncExternalStore(subscribe, getSelection, getSelection)
  const [result, setResult] = useState<LabQueryState<readonly LabDevice[]>>({ state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message: props.t('devicesUnavailable'), retryable: false })
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<readonly string[]>([])
  const [pendingDeviceId, setPendingDeviceId] = useState<string | undefined>()

  const refresh = useCallback(async (): Promise<void> => {
    setResult({ state: 'waiting', code: 'RUN_IN_PROGRESS', message: props.t('devicesLoading') })
    const loaded = await props.loadDevices(selection.activeExperimentId)
    if (loaded.state !== 'ready') {
      setSelectedDeviceIds([])
      setResult(loaded)
      return
    }
    const projectId = selection.activeProjectId
    if (projectId !== undefined && props.loadProject !== undefined) {
      const project = await props.loadProject(projectId)
      if (project.state !== 'ready') {
        setSelectedDeviceIds([])
        setResult(project.state === 'empty' ? { state: 'empty', code: 'NO_RECORDS', message: props.t('devicesNoProject') } : project)
        return
      }
      setSelectedDeviceIds(project.value.devices.flatMap(device => {
        const deviceId = device.deviceId ?? device.id
        return deviceId === undefined ? [] : [deviceId]
      }))
    } else {
      setSelectedDeviceIds([])
    }
    setResult(loaded.state === 'ready' && loaded.value.length === 0
      ? { state: 'empty', code: 'NO_RECORDS', message: props.t('devicesEmpty') }
      : loaded)
  }, [props, selection.activeProjectId])
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

  const toggleDevice = (deviceId: string): void => {
    const projectId = selection.activeProjectId
    if (projectId === undefined || props.onDeviceToggle === undefined) return
    setPendingDeviceId(deviceId)
    void props.onDeviceToggle(projectId, deviceId).then(() => {
      setSelectedDeviceIds(current => current.includes(deviceId) ? current.filter(id => id !== deviceId) : [...current, deviceId])
    }).catch((reason: unknown) => {
      const message = reason instanceof Error ? reason.message : String(reason)
      setResult({ state: 'failed', code: 'PROVIDER_UNAVAILABLE', message, retryable: true })
    }).finally(() => {
      setPendingDeviceId(undefined)
    })
  }
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
      <div className={css.notice} role='note'>{props.t('deviceConnectionNotice')}</div>
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
                <div><span>{props.t('deviceSource')}</span><strong>{props.t(device.source ?? props.source)}</strong></div>
                <div><span>{props.t('deviceReservation')}</span><strong>{reserved ? props.t('deviceReserved') : props.t('deviceAvailable')}</strong></div>
              </div>
              <div className={css.capabilities}>
                {(device.capabilities ?? []).map(capability => <span className={css.capability} key={capability.name ?? 'capability'}>{capability.name ?? props.t('unknownCapability')}</span>)}
                {(device.capabilities ?? []).length === 0 && <span className={css.muted}>{props.t('noCapabilities')}</span>}
              </div>
              {selection.activeProjectId !== undefined && props.onDeviceToggle !== undefined && device.id !== undefined && (
                <button type='button' className={css.button} disabled={pendingDeviceId !== undefined} onClick={() => { toggleDevice(device.id as string) }}>
                  {pendingDeviceId === device.id ? props.t('devicesUpdating') : selectedDeviceIds.includes(device.id) ? props.t('removeDeviceFromProject') : props.t('addDeviceToProject')}
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
