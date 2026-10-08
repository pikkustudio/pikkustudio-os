import React from 'react'
import type { I18nString } from '@pikku/react'
import { outside } from '../../lib/outside'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { Code } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useGraphActions } from '../../context/GraphHostContext'
import { useGraphM } from '../../context/MessagesContext'

interface GenericNodeData {
  icon: React.ComponentType<{ size?: number }>
  colorKey: string
  title?: I18nString
  description?: I18nString
}

export const GenericNode: React.FC<GraphNodeProps<GenericNodeData>> = ({
  data,
  id,
}) => {
  const { openWorkflowStep } = useGraphActions()
  const m = useGraphM()

  const handleClick = React.useCallback(() => {
    openWorkflowStep(id, 'generic')
  }, [id, openWorkflowStep])

  return (
    <BaseNode
      data={{
        ...data,
        title: data.title ?? m.node_generic(),
        onClick: handleClick,
      }}
      hasInput={true}
      hasOutput={true}
    />
  )
}

export const getGenericNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'genericNode',
    position,
    data: {
      icon: Code,
      colorKey: 'generic',
      description: outside(step.stepName),
      nodeType: 'internal',
    },
  }
}
