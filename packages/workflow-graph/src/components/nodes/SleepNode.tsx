import React from 'react'
import type { I18nString } from '@pikku/react'
import { outside } from '../../lib/outside'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { FlowNode } from './FlowNode'
import { Pause } from 'lucide-react'
import { useGraphActions } from '../../context/GraphHostContext'
import { useGraphM } from '../../context/MessagesContext'
import { useGraphHighlight } from '../../context/GraphHostContext'

interface SleepNodeData {
  colorKey: string
  title?: I18nString
  description?: I18nString
}

type HighlightType = 'focused' | 'referenced' | null

export const SleepNode: React.FC<GraphNodeProps<SleepNodeData>> = ({
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
    openWorkflowStep(id, 'sleep')
  }, [id, openWorkflowStep])

  return (
    <FlowNode
      icon={Pause}
      tone="wait"
      hasInput={true}
      outputHandles={[{ id: 'default' }]}
      label={m.node_sleep()}
      subtitle={data.description}
      onClick={handleClick}
      highlightType={highlightType}
      nodeId={id}
    />
  )
}

export const getSleepNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'sleepNode',
    position,
    data: {
      colorKey: 'workflow',
      title: outside(step.duration),
      description: outside(step.stepName),
      nodeType: 'flow',
    },
  }
}
