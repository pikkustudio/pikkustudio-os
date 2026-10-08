import React from 'react'
import type { I18nString } from '@pikku/react'
import type { GraphNodeProps } from '../../types'
import { BaseNode } from './BaseNode'

interface ChannelNodeData {
  icon: React.ComponentType<{ size?: number }>
  colorKey: string
  title: I18nString
  description?: I18nString
  tags?: string[]
  auth?: boolean
  permissionsCount?: number
  middlewareCount?: number
  // Channel-specific fields
  hasConnect?: boolean
  hasDisconnect?: boolean
  hasMessage?: boolean
  messageActions?: string[]
}

export const ChannelNode: React.FC<GraphNodeProps<ChannelNodeData>> = ({
  data,
}) => {
  return (
    <BaseNode data={data} tone="wiring" hasInput={false} hasOutput={true} />
  )
}
