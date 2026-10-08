import React from 'react'
import { asI18n, type I18nString } from '@pikku/react'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { FlowNode } from './FlowNode'
import { Reply } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { useGraphM } from '../../context/MessagesContext'
import { useGraphHighlight } from '../../context/GraphHostContext'

interface ReturnNodeData {
  colorKey: string
  stepName?: I18nString
}

type HighlightType = 'focused' | 'referenced' | null

export const ReturnNode: React.FC<GraphNodeProps<ReturnNodeData>> = ({
  data,
  id,
}) => {
  const { openWorkflowStep } = useGraphActions()
  const m = useGraphM()
  const graphHighlight = useGraphHighlight()

  const highlightType: HighlightType = React.useMemo(() => {
    if (!graphHighlight) return null
    if (graphHighlight.focusedNodeId === id) return 'focused'
    if (graphHighlight.referencedNodeId === id) return 'referenced'
    return null
  }, [graphHighlight, id])

  const handleClick = React.useCallback(() => {
    openWorkflowStep(id, 'return')
  }, [id, openWorkflowStep])

  return (
    <FlowNode
      icon={Reply}
      tone="done"
      hasInput={true}
      outputHandles={[]}
      label={m.node_return()}
      subtitle={data.stepName}
      onClick={handleClick}
      highlightType={highlightType}
      nodeId={id}
    />
  )
}

export const getReturnNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'returnNode',
    position,
    data: {
      colorKey: 'workflow',
      stepName: asI18n(step.stepName),
      nodeType: 'flow',
    },
  }
}
