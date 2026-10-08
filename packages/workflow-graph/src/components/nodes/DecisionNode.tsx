import React from 'react'
import type { I18nString } from '@pikku/react'
import type { GraphNodeProps } from '../../types'
import { BaseNode } from './BaseNode'

interface DecisionNodeData {
  icon: React.ComponentType<{ size?: number }>
  colorKey: string
  title: I18nString
  description?: I18nString
  actions: string[]
}

export const DecisionNode: React.FC<GraphNodeProps<DecisionNodeData>> = ({
  data,
}) => {
  return (
    <BaseNode data={data} tone="decision" hasInput={true} hasOutput={true} />
  )
}
