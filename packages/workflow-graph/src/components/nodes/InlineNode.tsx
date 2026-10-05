import React from 'react'
import type { Node } from '@xyflow/react'
import type { GraphNodeProps } from '../../types'
import { RotateCw, Timer, Code } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useGraphActions } from '../../context/GraphHostContext'

interface InlineNodeData {
  icon: React.ComponentType<{ size?: number }>
  colorKey: string
  title: string
  description?: string
  inWorkflow?: boolean
  onClick?: () => void
  workflowRetries?: number
  workflowRetryDelay?: number
}

export const InlineNode: React.FC<GraphNodeProps<InlineNodeData>> = ({
  data,
  id,
}) => {
  const { openWorkflowStep } = useGraphActions()

  const handleClick = React.useCallback(() => {
    openWorkflowStep(id, 'inline')
  }, [id, openWorkflowStep])

  return (
    <BaseNode
      data={{
        ...data,
        onClick: handleClick,
      }}
      hasInput={true}
      hasOutput={true}
      additionalBody={
        data.inWorkflow ? (
          <div className="flex items-center gap-4 text-[13px] text-ink-2">
            <span
              className="inline-flex items-center gap-1"
              title="Retries"
              aria-label={`Retries: ${data.workflowRetries ?? 0}`}
            >
              <RotateCw size={14} strokeWidth={2} aria-hidden="true" />
              {data.workflowRetries !== undefined && data.workflowRetries > 0
                ? data.workflowRetries
                : 'None'}
            </span>
            <span
              className="inline-flex items-center gap-1"
              title="Retry delay"
              aria-label={`Retry delay: ${data.workflowRetryDelay ?? 0}`}
            >
              <Timer size={14} strokeWidth={2} aria-hidden="true" />
              {data.workflowRetryDelay !== undefined &&
              data.workflowRetryDelay > 0
                ? data.workflowRetryDelay
                : 'None'}
            </span>
          </div>
        ) : undefined
      }
    />
  )
}

export const getInlineNodeConfig = (
  id: string,
  position: { x: number; y: number },
  step: any
): Node => {
  return {
    id,
    type: 'inlineNode',
    position,
    data: {
      icon: Code,
      colorKey: 'workflow',
      title: 'Inline',
      description: step.stepName,
      inWorkflow: true,
      workflowRetries: step.options?.retries,
      workflowRetryDelay:
        typeof step.options?.retryDelay === 'number'
          ? step.options.retryDelay
          : undefined,
      nodeType: 'internal',
    },
  }
}
