import React from 'react'
import { getNodesBounds, useReactFlow, useStore, useViewport } from '@xyflow/react'

import { useGraphM } from '../context/MessagesContext'

const PAD = 48

type Axis = 'x' | 'y'

/** Scrollbars for the canvas: React Flow pans but draws no bars, and a graph at normal size is longer than its frame. */
export const GraphScrollbars: React.FC = () => {
  const m = useGraphM()
  const { x, y, zoom } = useViewport()
  const { setViewport, getNodes } = useReactFlow()
  const width = useStore((s) => s.width)
  const height = useStore((s) => s.height)
  // Re-read the bounds once nodes are measured, not just when their number changes.
  useStore((s) => s.nodeLookup)
  const nodes = getNodes()
  const bounds = nodes.length > 0 ? getNodesBounds(nodes) : null
  if (!bounds) return null

  const track = (axis: Axis) => {
    const view = axis === 'x' ? width : height
    const start = (axis === 'x' ? bounds.x : bounds.y) * zoom - PAD
    const end =
      ((axis === 'x' ? bounds.x + bounds.width : bounds.y + bounds.height)) * zoom + PAD
    const total = end - start
    const offset = -(axis === 'x' ? x : y)
    return { view, start, total, offset }
  }

  const bar = (axis: Axis) => {
    const { view, start, total, offset } = track(axis)
    if (total <= view + 1) return null
    const size = Math.max(36, (view / total) * view)
    const pos = ((offset - start) / total) * view
    const clamped = Math.min(Math.max(pos, 0), view - size)
    const onDown = (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const from = axis === 'x' ? e.clientX : e.clientY
      const origin = axis === 'x' ? x : y
      const move = (m: PointerEvent) => {
        const delta = ((axis === 'x' ? m.clientX : m.clientY) - from) * (total / view)
        setViewport(
          axis === 'x' ? { x: origin - delta, y, zoom } : { x, y: origin - delta, zoom }
        )
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }
    return (
      <div
        role="scrollbar"
        aria-orientation={axis === 'x' ? 'horizontal' : 'vertical'}
        aria-label={axis === 'x' ? m.scroll_sideways() : m.scroll_vertical()}
        aria-valuenow={Math.round((clamped / Math.max(view - size, 1)) * 100)}
        className={`nodrag nopan absolute z-10 rounded-full bg-muted/60 ${axis === 'x' ? 'end-4 bottom-1.5 start-4 h-2.5' : 'top-4 end-1.5 bottom-4 w-2.5'}`}
      >
        <div
          onPointerDown={onDown}
          className={`absolute cursor-grab rounded-full bg-muted-foreground/60 hover:bg-muted-foreground active:cursor-grabbing ${axis === 'x' ? 'inset-y-0' : 'inset-x-0'}`}
          style={axis === 'x' ? { left: clamped, width: size } : { top: clamped, height: size }}
        />
      </div>
    )
  }

  return (
    <>
      {bar('x')}
      {bar('y')}
    </>
  )
}
