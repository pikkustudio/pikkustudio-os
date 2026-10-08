import React from 'react'
import { asI18n, type I18nString } from '@pikku/react'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { FlowNode } from './FlowNode'
import { Workflow } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { useGraphM } from '../../context/MessagesContext'
import { useGraphHighlight } from '../../context/GraphHostContext'

interface ParallelNodeData {
  colorKey: string
  childrenCount?: number
  stepName?: I18nString
}

type HighlightType = 'focused' | 'referenced' | null

export const ParallelNode: React.FC<GraphNodeProps<ParallelNodeData>> = ({
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

  const outputHandles = React.useMemo(() => {
    const handles: Array<{ id: string; label: number | I18nString }> = []
    const count = data.childrenCount || 0

    for (let i = 0; i < count; i++) {
      handles.push({ id: `child-${i}`, label: i + 1 })
    }

    handles.push({ id: 'done', label: m.handle_done() })

    return handles
  }, [data.childrenCount, m])

  const handleClick = React.useCallback(() => {
    openWorkflowStep(id, 'parallel')
  }, [id, openWorkflowStep])

  return (
    <FlowNode
      icon={Workflow}
      tone="decision"
      hasInput={true}
      outputHandles={outputHandles}
      label={m.node_parallel()}
      subtitle={data.stepName}
      onClick={handleClick}
      highlightType={highlightType}
      nodeId={id}
    />
  )
}

export const getParallelNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'parallelNode',
    position,
    data: {
      colorKey: 'workflow',
      childrenCount: step.children?.length || 0,
      stepName: asI18n(step.stepName),
      nodeType: 'flow',
    },
  }
}
