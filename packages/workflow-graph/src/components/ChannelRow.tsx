import React from 'react'
import { type I18nNode } from '@pikku/react'
import { Handle, Position } from '@xyflow/react'
import { ArrowRight } from 'lucide-react'
import { handleClass } from './NodeTile'
import { useGraphM } from '../context/MessagesContext'

/** One outgoing route of a channel-style card: a label, an arrow and a source handle. */
export const CHANNEL_ROW_HEIGHT = 32
export const CHANNEL_HEADER_HEIGHT = 72

export const ChannelRow: React.FC<{
  label: I18nNode
  handleId: string
  hasTarget?: boolean
}> = ({ label, handleId, hasTarget = true }) => {
  const m = useGraphM()
  return (
  <div
    className={`relative flex items-center justify-between gap-2 border-t border-border px-3 text-[13px] text-ink-2 ${hasTarget ? '' : 'opacity-60'}`}
    style={{ height: CHANNEL_ROW_HEIGHT }}
  >
    <span className="truncate font-mono">{label}</span>
    {hasTarget ? (
      <>
        <ArrowRight size={14} aria-hidden="true" />
        <Handle
          type="source"
          position={Position.Right}
          id={handleId}
          className={handleClass}
        />
      </>
    ) : (
      <span className="text-xs text-muted-foreground">{m.not_wired()}</span>
    )}
  </div>
  )
}
