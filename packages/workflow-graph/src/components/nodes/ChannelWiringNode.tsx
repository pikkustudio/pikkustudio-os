import React from 'react'
import { asI18n, sep, type I18nString } from '@pikku/react'
import { outside } from '../../lib/outside'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { Radio } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { NodeTile, nodeCardClass } from '../NodeTile'
import { useGraphM } from '../../context/MessagesContext'
import { ChannelRow } from '../ChannelRow'

interface ChannelWiringNodeData {
  colorKey: string
  channelName?: I18nString
  onConnect?: string
  onDisconnect?: string
  onMessage?: string
  onMessageRoute?: Record<string, string>
}

export const ChannelWiringNode: React.FC<
  GraphNodeProps<ChannelWiringNodeData>
> = ({ data, id }) => {
  const { openWorkflowStep } = useGraphActions()
  const m = useGraphM()

  const handleClick = React.useCallback(() => {
    openWorkflowStep(id, 'trigger')
  }, [id, openWorkflowStep])

  const routeEntries = data.onMessageRoute
    ? Object.entries(data.onMessageRoute)
    : []

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
            {data.channelName ?? m.node_channel()}
          </span>
          <span className="truncate text-[13px] leading-[18px] text-ink-2">
            {m.node_channel_wiring()}
          </span>
        </div>
      </div>

      <ChannelRow
        label={m.handler_on_connect()}
        handleId="onConnect"
        hasTarget={!!data.onConnect}
      />
      <ChannelRow
        label={m.handler_on_message()}
        handleId="onMessage"
        hasTarget={!!data.onMessage}
      />
      {routeEntries.map(([route, target]) => (
        <ChannelRow
          key={route}
          label={<>{sep('→ ')}{asI18n(route)}</>}
          handleId={`route-${route}`}
          hasTarget={!!target}
        />
      ))}
      <ChannelRow
        label={m.handler_on_disconnect()}
        handleId="onDisconnect"
        hasTarget={!!data.onDisconnect}
      />
    </div>
  )
}

export const getChannelWiringNodeConfig = (
  id: string,
  position: { x: number; y: number },
  wire: {
    name?: string
    onConnect?: string
    onDisconnect?: string
    onMessage?: string
    onMessageRoute?: Record<string, string>
  }
): Node => {
  return {
    id,
    type: 'channelWiringNode',
    position,
    data: {
      colorKey: 'teal',
      channelName: outside(wire.name),
      onConnect: wire.onConnect,
      onDisconnect: wire.onDisconnect,
      onMessage: wire.onMessage,
      onMessageRoute: wire.onMessageRoute,
      nodeType: 'wiring',
    },
  }
}
