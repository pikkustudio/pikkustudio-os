import React from 'react'
import { asI18n, type I18nString } from '@pikku/react'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { FlowNode } from './FlowNode'
import { CheckCircle } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { useGraphM } from '../../context/MessagesContext'
import { useGraphHighlight } from '../../context/GraphHostContext'

interface ArrayPredicateNodeData {
  colorKey: string
  mode?: 'some' | 'every'
  sourceVar?: string
  itemVar?: string
  outputVar?: string
  stepName?: I18nString
}

type HighlightType = 'focused' | 'referenced' | null

export const ArrayPredicateNode: React.FC<
  GraphNodeProps<ArrayPredicateNodeData>
> = ({ data, id }) => {
  const { openWorkflowStep } = useGraphActions()
  const graphHighlight = useGraphHighlight()
  const m = useGraphM()

  const highlightType: HighlightType = React.useMemo(() => {
    if (!graphHighlight) return null
    if (graphHighlight.focusedNodeId === id) return 'focused'
    if (graphHighlight.referencedNodeId === id) return 'referenced'
    return null
  }, [graphHighlight, id])

  const handleClick = React.useCallback(() => {
    openWorkflowStep(id, 'arrayPredicate')
  }, [id, openWorkflowStep])

  const label =
    data.mode === 'some'
      ? m.node_some()
      : data.mode === 'every'
        ? m.node_every()
        : m.node_check()

  return (
    <FlowNode
      icon={CheckCircle}
      tone="decision"
      hasInput={true}
      outputHandles={[{ id: 'default' }]}
      label={label}
      subtitle={data.stepName}
      onClick={handleClick}
      highlightType={highlightType}
      nodeId={id}
    />
  )
}

export const getArrayPredicateNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'arrayPredicateNode',
    position,
    data: {
      colorKey: 'workflow',
      mode: step.mode,
      sourceVar: step.sourceVar,
      itemVar: step.itemVar,
      outputVar: step.outputVar,
      stepName: asI18n(step.stepName),
      nodeType: 'flow',
    },
  }
}
