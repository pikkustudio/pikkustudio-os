import React from 'react'
import { asI18n, type I18nString } from '@pikku/react'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { FlowNode } from './FlowNode'
import { Filter } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { useGraphM } from '../../context/MessagesContext'
import { useGraphHighlight } from '../../context/GraphHostContext'

interface FilterNodeData {
  colorKey: string
  sourceVar?: string
  itemVar?: string
  outputVar?: string
  stepName?: I18nString
}

type HighlightType = 'focused' | 'referenced' | null

export const FilterNode: React.FC<GraphNodeProps<FilterNodeData>> = ({
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
    openWorkflowStep(id, 'filter')
  }, [id, openWorkflowStep])

  return (
    <FlowNode
      icon={Filter}
      tone="step"
      hasInput={true}
      outputHandles={[{ id: 'default' }]}
      label={m.node_filter()}
      subtitle={data.stepName}
      onClick={handleClick}
      highlightType={highlightType}
      nodeId={id}
    />
  )
}

export const getFilterNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'filterNode',
    position,
    data: {
      colorKey: 'workflow',
      sourceVar: step.sourceVar,
      itemVar: step.itemVar,
      outputVar: step.outputVar,
      stepName: asI18n(step.stepName),
      nodeType: 'flow',
    },
  }
}
