import React from 'react'

/** How a node KIND is told apart: through its icon tile only. */
export type NodeTone =
  | 'step'
  | 'wiring'
  | 'decision'
  | 'wait'
  | 'done'
  | 'failure'

const toneClass: Record<NodeTone, string> = {
  step: 'bg-secondary text-ink-2',
  wiring: 'bg-hero text-hero-ink',
  decision: 'bg-accent text-accent-foreground',
  wait: 'bg-info-soft text-info-foreground',
  done: 'bg-success-soft text-success-foreground',
  failure: 'bg-destructive-soft text-destructive',
}

export type TileIcon = React.ComponentType<{
  size?: number
  strokeWidth?: number
  className?: string
}>

export const NodeTile: React.FC<{ icon: TileIcon; tone: NodeTone }> = ({
  icon: Icon,
  tone,
}) => (
  <span
    data-hue={tone === 'wiring' ? 'petrol' : undefined}
    className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${toneClass[tone]}`}
    aria-hidden="true"
  >
    <Icon size={22} strokeWidth={2} />
  </span>
)

/** The one card surface every node shares. */
export const nodeCardClass =
  'relative rounded-card border border-border bg-card text-foreground shadow-card'

/** Handles are anchors for edges, not controls: present but invisible. */
export const handleClass = 'opacity-0! pointer-events-none! cursor-default'
