import React from 'react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'

export const ElkEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  label,
  labelStyle,
  labelBgStyle,
  style,
  markerEnd,
}) => {
  const bendPoints = (data?.bendPoints ?? []) as { x: number; y: number }[]

  const points = [
    { x: sourceX, y: sourceY },
    ...bendPoints,
    { x: targetX, y: targetY },
  ]

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const midIndex = Math.floor(points.length / 2)
  const labelX = points[midIndex]?.x ?? (sourceX + targetX) / 2
  const labelY = points[midIndex]?.y ?? (sourceY + targetY) / 2

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-auto absolute rounded-lg bg-card px-1.5 py-0.5 font-mono text-[11px] text-ink-2"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              ...labelStyle,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
