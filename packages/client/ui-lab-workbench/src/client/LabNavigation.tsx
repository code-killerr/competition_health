/** Harness sidebar navigation for the laboratory workspace views. */

import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { LabStage } from './store.ts'
import css from './LabNavigation.module.css'

type LabNavigationProps = PropsRuntime<'sidebar.footer.action'> & PropsLocale<'labWorkbench'>

const ITEMS: readonly { readonly stage: LabStage; readonly short: string }[] = [
  { stage: 'knowledge', short: 'K' },
  { stage: 'devices', short: 'D' },
  { stage: 'projects', short: 'P' },
]

/** Render global laboratory navigation links without owning page state. */
export function LabNavigation(props: LabNavigationProps): JSX.Element {
  return (
    <nav className={css.root} aria-label={props.t('stageHint')}>
      {ITEMS.map(item => (
        <a key={item.stage} className={css.link} href={`#lab-${item.stage}`}>
          <span className={css.mark} aria-hidden="true">{item.short}</span>
          {props.wide && <span>{props.t(item.stage)}</span>}
        </a>
      ))}
    </nav>
  )
}
