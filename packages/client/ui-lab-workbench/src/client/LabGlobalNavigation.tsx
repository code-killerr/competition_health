/** Harness 一级应用导航；页面状态由 Layout 和 LabUiContext 共同维护。 */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarNavigationOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { JSX } from 'react'
import css from './LabGlobalNavigation.module.css'

/** 导航项。 */
export interface LabGlobalNavigationItem {
  readonly id: string
  readonly labelKey: 'projects' | 'knowledge' | 'devices'
  readonly mark: string
}

/** 一级导航的宿主动作。 */
export interface LabGlobalNavigationInjected {
  readonly openAppView: (viewId: string) => void
}

type Props = PropsRuntime<'sidebar.navigation'>
  & SidebarNavigationOwnerProps
  & PropsLocale<'labWorkbench'>
  & InjectFace<LabGlobalNavigationInjected>

const ITEMS: readonly LabGlobalNavigationItem[] = [
  { id: 'lab-projects', labelKey: 'projects', mark: 'P' },
]

/** Render the root application navigation. */
export function LabGlobalNavigation(props: Props): JSX.Element {
  return (
    <nav className={css.root} aria-label={props.t('globalNavigation')}>
      {ITEMS.map(item => (
        <button
          key={item.id}
          type="button"
          className={css.item}
          aria-label={props.t(item.labelKey)}
          onClick={() => { props.openAppView(item.id); props.expandSidebar() }}
        >
          <span className={css.mark} aria-hidden="true">{item.mark}</span>
          {props.wide && <span>{props.t(item.labelKey)}</span>}
        </button>
      ))}
    </nav>
  )
}
