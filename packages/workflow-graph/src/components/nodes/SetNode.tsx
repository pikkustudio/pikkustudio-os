import React from 'react'
import { asI18n, type I18nString } from '@pikku/react'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { FlowNode } from './FlowNode'
import { Pencil } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { useGraphM } from '../../context/MessagesContext'
import { useGraphHighlight } from '../../context/GraphHostContext'

interface SetNodeData {
  colorKey: string
  variable?: string
  stepName?: I18nString
}

type HighlightType = 'focused' | 'referenced' | null

export const SetNode: React.FC<GraphNodeProps<SetNodeData>> = ({
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
    openWorkflowStep(id, 'set')
  }, [id, openWorkflowStep])

  return (
    <FlowNode
      icon={Pencil}
      tone="step"
      hasInput={true}
      outputHandles={[{ id: 'default' }]}
      label={m.node_set()}
      subtitle={data.stepName}
      onClick={handleClick}
      highlightType={highlightType}
      nodeId={id}
    />
  )
}

export const getSetNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'setNode',
    position,
    data: {
      colorKey: 'workflow',
      variable: step.variable,
      stepName: asI18n(step.stepName),
      nodeType: 'flow',
    },
  }
}
