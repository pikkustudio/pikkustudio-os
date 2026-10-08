import React from 'react'
import type { I18nString } from '@pikku/react'
import type { GraphNodeProps } from '../../types'
import { Handle, Position } from '@xyflow/react'
import { Route } from 'lucide-react'
import { NodeTile, handleClass, nodeCardClass } from '../NodeTile'
import { useGraphM } from '../../context/MessagesContext'
import { ChannelRow } from '../ChannelRow'

interface ChannelRouterNodeData {
  category: I18nString
  actions: I18nString[]
}

export const ChannelRouterNode: React.FC<
  GraphNodeProps<ChannelRouterNodeData>
> = ({ data }) => {
  const m = useGraphM()
  return (
    <div className={nodeCardClass} style={{ width: 240 }}>
      <Handle
        type="target"
        position={Position.Left}
        className={handleClass}
      />

      <div className="flex items-center gap-3 px-3 py-3">
        <NodeTile icon={Route} tone="decision" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] leading-5 font-bold">
            {data.category}
          </span>
          <span className="truncate text-[13px] leading-[18px] text-ink-2">
            {m.node_message_router()}
          </span>
        </div>
      </div>

      {data.actions.map((action) => (
        <ChannelRow
          key={action}
          label={action}
          handleId={`action-${action}`}
        />
      ))}
    </div>
  )
}
