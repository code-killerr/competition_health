/** Harness 一级应用导航；项目入口由原生 Workspace/Session 树和全局监控共同承担。 */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarNavigationOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { JSX } from 'react'
import css from './LabGlobalNavigation.module.css'

/** 一级导航的宿主动作。 */
export interface LabGlobalNavigationInjected {
  readonly openAppView: (viewId: string) => void
}

type Props = PropsRuntime<'sidebar.navigation'>
  & SidebarNavigationOwnerProps
  & PropsLocale<'labWorkbench'>
  & InjectFace<LabGlobalNavigationInjected>

/** Render the root application navigation. */
export function LabGlobalNavigation(props: Props): JSX.Element {
  const open = (viewId: string): void => { props.openAppView(viewId); props.expandSidebar() }

  return (
    <nav className={css.root} aria-label={props.t('globalNavigation')}>
      <section className={css.group} aria-label={props.t('monitorGroup')}>
        {props.wide && <h2>{props.t('monitorGroup')}</h2>}
        <button type="button" className={css.item} aria-label={props.t('executionMonitor')} onClick={() => { open('lab-monitor') }}>
          <span className={css.mark} aria-hidden="true">↗</span>
          {props.wide && <span>{props.t('executionMonitor')}</span>}
        </button>
      </section>
      <section className={css.group} aria-label={props.t('configurationGroup')}>
        {props.wide && <h2>{props.t('configurationGroup')}</h2>}
        {(['lab-knowledge', 'lab-config', 'lab-devices'] as const).map((id, index) => (
          <button key={id} type="button" className={css.item} aria-label={props.t(id === 'lab-knowledge' ? 'knowledge' : id === 'lab-devices' ? 'devices' : 'configuration')} onClick={() => { open(id) }}>
            <span className={css.mark} aria-hidden="true">{index === 0 ? 'K' : index === 1 ? '⚙' : 'D'}</span>
            {props.wide && <span>{props.t(id === 'lab-knowledge' ? 'knowledge' : id === 'lab-devices' ? 'devices' : 'configuration')}</span>}
          </button>
        ))}
      </section>
    </nav>
  )
}