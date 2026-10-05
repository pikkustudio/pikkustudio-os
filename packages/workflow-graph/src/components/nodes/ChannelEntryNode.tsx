import React from 'react'
import type { GraphNodeProps } from '../../types'
import { Radio } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { NodeTile, nodeCardClass } from '../NodeTile'
import { ChannelRow } from '../ChannelRow'

interface ChannelEntryNodeData {
  channelName: string
  route: string
  handlers: string[]
  categories: string[]
  channelMeta: any
}

export const ChannelEntryNode: React.FC<
  GraphNodeProps<ChannelEntryNodeData>
> = ({ data }) => {
  const { openChannel } = useGraphActions()

  const handleClick = React.useCallback(() => {
    openChannel(data.channelName, data.channelMeta)
  }, [data.channelName, data.channelMeta, openChannel])

  return (
    <div className={nodeCardClass} style={{ width: 264 }}>
      <div
        className="flex cursor-pointer items-center gap-3 px-3 py-3"
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <NodeTile icon={Radio} tone="wiring" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] leading-5 font-bold">
            {data.channelName}
          </span>
          <span className="truncate text-[13px] leading-[18px] text-ink-2">
            {data.route}
          </span>
        </div>
      </div>

      {data.handlers.includes('connect') && (
        <ChannelRow label="onConnect" handleId="connect" />
      )}
      {data.handlers.includes('disconnect') && (
        <ChannelRow label="onDisconnect" handleId="disconnect" />
      )}
      {data.handlers.includes('message') && (
        <ChannelRow label="onMessage" handleId="message" />
      )}
      {data.categories.map((cat) => (
        <ChannelRow key={cat} label={cat} handleId={`category-${cat}`} />
      ))}
    </div>
  )
}
