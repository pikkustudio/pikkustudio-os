import React from 'react'
import { asI18n, type I18nString } from '@pikku/react'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { FlowNode } from './FlowNode'
import { XCircle } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { useGraphM } from '../../context/MessagesContext'

interface CancelNodeData {
  colorKey: string
  stepName?: I18nString
}

export const CancelNode: React.FC<GraphNodeProps<CancelNodeData>> = ({
  data,
  id,
}) => {
  const { openWorkflowStep } = useGraphActions()
  const m = useGraphM()

  const handleClick = React.useCallback(() => {
    openWorkflowStep(id, 'cancel')
  }, [id, openWorkflowStep])

  return (
    <FlowNode
      icon={XCircle}
      tone="failure"
      hasInput={true}
      outputHandles={[]}
      label={m.node_cancel()}
      subtitle={data.stepName}
      onClick={handleClick}
      nodeId={id}
    />
  )
}

export const getCancelNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'cancelNode',
    position,
    data: {
      colorKey: 'workflow',
      stepName: asI18n(step.stepName),
      nodeType: 'flow',
    },
  }
}
