/** Harness sidebar navigation for the laboratory workspace views. */

import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import css from './LabNavigation.module.css'

type LabNavigationProps = PropsRuntime<'sidebar.footer.action'> & PropsLocale<'labWorkbench'>

const ITEMS = [
  { page: 'knowledge', short: 'K' },
  { page: 'devices', short: 'D' },
  { page: 'projects', short: 'P' },
] as const

/** Render global laboratory navigation actions without owning page state. */
export function LabNavigation(props: LabNavigationProps): JSX.Element {
  return (
    <nav className={css.root} aria-label={props.t('stageHint')}>
      {ITEMS.map(item => (
        <button key={item.page} type="button" className={css.link} onClick={() => {
          window.dispatchEvent(new CustomEvent('lab:navigate', { detail: item.page }))
        }}>
          <span className={css.mark} aria-hidden="true">{item.short}</span>
          {props.wide && <span>{props.t(item.page)}</span>}
        </button>
      ))}
    </nav>
  )
}
