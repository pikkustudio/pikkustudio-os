import React from 'react'
import type { I18nString } from '@pikku/react'
import { useGraphM } from '../../context/MessagesContext'
import type { GraphNodeProps } from '../../types'
import { Radio } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { NodeTile, nodeCardClass } from '../NodeTile'
import { ChannelRow } from '../ChannelRow'

interface ChannelEntryNodeData {
  channelName: I18nString
  route: I18nString
  handlers: string[]
  categories: I18nString[]
  channelMeta: any
}

export const ChannelEntryNode: React.FC<
  GraphNodeProps<ChannelEntryNodeData>
> = ({ data }) => {
  const { openChannel } = useGraphActions()
  const m = useGraphM()

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
        <ChannelRow label={m.handler_on_connect()} handleId="connect" />
      )}
      {data.handlers.includes('disconnect') && (
        <ChannelRow label={m.handler_on_disconnect()} handleId="disconnect" />
      )}
      {data.handlers.includes('message') && (
        <ChannelRow label={m.handler_on_message()} handleId="message" />
      )}
      {data.categories.map((cat) => (
        <ChannelRow key={cat} label={cat} handleId={`category-${cat}`} />
      ))}
    </div>
  )
}
