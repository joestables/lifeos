import type * as React from 'react'
import { BackLink } from './BackLink'
import type { TypeColour } from './colours'
import { TypeScope } from './TypeScope'

/**
 * An Item on a page of its own (a Note on a phone): back to where you were,
 * the Item's actions on the right, then its title and the rest.
 */
export function ItemPage({
  colour,
  back,
  actions,
  title,
  children,
}: {
  colour: Exclude<TypeColour, 'none'>
  back: { label: string; onClick: () => void }
  actions?: React.ReactNode
  title: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <TypeScope colour={colour} className="flex flex-col gap-3.5 px-5 pt-1 pb-6 sm:px-9 sm:pt-4">
      <div className="flex items-center gap-1">
        <BackLink label={back.label} onClick={back.onClick} />
        <div className="flex-1" />
        {actions}
      </div>
      <h1 className="text-[22px] leading-[1.2] font-[750] tracking-[-0.025em] sm:text-h1">
        {title}
      </h1>
      {children}
    </TypeScope>
  )
}
