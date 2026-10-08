import React from 'react'
import { asI18n, type I18nNode } from '@pikku/react'

type GraphBadgeProps = (
  | { type: 'dynamic'; badge: string; value: string | number }
  | { type: 'label'; children: I18nNode }
) & {
  className?: string
  onClick?: React.MouseEventHandler<HTMLSpanElement>
}

const humanize = (str: string): string =>
  str.includes('/')
    ? str
    : str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())

export const GraphBadge: React.FC<GraphBadgeProps> = (props) => {
  const humanized = props.type === 'label' ? '' : humanize(String(props.value))
  const content = props.type === 'label' ? props.children : asI18n(humanized)

  return (
    <span
      onClick={props.onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-ink-2 ${props.className ?? ''}`}
    >
      {content}
    </span>
  )
}
