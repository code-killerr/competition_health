import type { JSX, ReactNode } from 'react'
import type { LabCitationSelection } from './LabUiContext.ts'

/** Product surface that produced a citation reference. */
export type LabCitationOrigin = 'plan' | 'conversation' | 'report'

/** Props for a citation link shared by Agent cards and workbench detail views. */
export interface LabCitationLinkProps {
  /** Host-authorized Project/source/version/location reference. */
  readonly citation: LabCitationSelection
  /** Product surface that owns the visible reference. */
  readonly origin: LabCitationOrigin
  /** Whether the Knowledge application view can currently present the target. */
  readonly available: boolean
  /** Presentation controller action supplied by the composition owner. */
  readonly onOpen?: ((citation: LabCitationSelection) => void) | undefined
  /** Localized link label. */
  readonly label: string
  /** Localized unavailable-state label. */
  readonly unavailableLabel: string
  /** Optional source title shown when the citation cannot be opened. */
  readonly sourceName?: string | undefined
  /** Optional surrounding content. */
  readonly children?: ReactNode
}

/** Render a reversible citation action without exposing Provider internals. */
export function LabCitationLink(props: LabCitationLinkProps): JSX.Element {
  const location = props.citation.location
  const targetLabel = props.sourceName === undefined
    ? location
    : location === undefined ? props.sourceName : props.sourceName + ' · ' + location
  if (!props.available || props.onOpen === undefined) {
    return (
      <span data-lab-citation-origin={props.origin} data-lab-citation-unavailable>
        {props.children ?? props.label}
        <span aria-label={props.unavailableLabel}>{props.unavailableLabel}{targetLabel === undefined ? '' : ': ' + targetLabel}</span>
      </span>
    )
  }
  return (
    <button
      type='button'
      data-lab-citation-origin={props.origin}
      onClick={() => { props.onOpen?.(props.citation) }}
      aria-label={targetLabel === undefined ? props.label : props.label + ': ' + targetLabel}
    >
      {props.children ?? props.label}
    </button>
  )
}
