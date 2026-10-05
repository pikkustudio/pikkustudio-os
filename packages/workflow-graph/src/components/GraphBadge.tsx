import React from 'react'

type GraphBadgeProps = (
  | { type: 'dynamic'; badge: string; value: string | number }
  | { type: 'label'; children: React.ReactNode }
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
  const content =
    props.type === 'label' ? props.children : humanize(String(props.value))

  return (
    <span
      onClick={props.onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-ink-2 ${props.className ?? ''}`}
    >
      {content}
    </span>
  )
}
