import React from 'react'
import { asI18n, type I18nString } from '@pikku/react'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { FlowNode } from './FlowNode'
import { Repeat } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { useGraphM } from '../../context/MessagesContext'
import { useGraphHighlight } from '../../context/GraphHostContext'

interface FanoutNodeData {
  colorKey: string
  childRpc?: string
  stepName?: I18nString
}

type HighlightType = 'focused' | 'referenced' | null

export const FanoutNode: React.FC<GraphNodeProps<FanoutNodeData>> = ({
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

  const outputHandles = [
    { id: 'each', label: m.handle_each() },
    { id: 'done', label: m.handle_done() },
  ]

  const handleClick = React.useCallback(() => {
    openWorkflowStep(id, 'fanout')
  }, [id, openWorkflowStep])

  return (
    <FlowNode
      icon={Repeat}
      tone="decision"
      hasInput={true}
      outputHandles={outputHandles}
      label={m.node_loop()}
      subtitle={data.stepName}
      onClick={handleClick}
      highlightType={highlightType}
      nodeId={id}
    />
  )
}

export const getFanoutNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'fanoutNode',
    position,
    data: {
      colorKey: 'workflow',
      childRpc: step.childRpc || step.eachRpc,
      stepName: asI18n(step.stepName),
      nodeType: 'flow',
    },
  }
}
