import React from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import {
  FlowDirectionContext,
  type FlowDirection,
} from './context/FlowDirectionContext'
import {
  GraphHostProvider,
  type WorkflowGraphHost,
} from './context/GraphHostContext'
import {
  MessagesProvider,
  type WorkflowGraphMessages,
} from './context/MessagesContext'
import { WorkflowGraphFlow } from './WorkflowGraphFlow'

export interface WorkflowGraphViewProps {
  workflow: any
  /** 'RIGHT' (default) lays the graph out left→right; 'DOWN' top→bottom —
   *  use 'DOWN' when embedding in a narrow container like a side panel. */
  direction?: FlowDirection
  onPaneClick?: () => void
  /** Everything the graph cannot know on its own: where a node click goes,
   *  which node is highlighted, and the run whose state the nodes paint. */
  host?: WorkflowGraphHost
  /** The words the graph draws, in the host's language. Any key left out
   *  falls back to English. Keep the object stable (memoize it): a new one
   *  rebuilds and re-lays-out the graph. */
  messages?: WorkflowGraphMessages
}

export const WorkflowGraphView: React.FC<WorkflowGraphViewProps> = (props) => {
  return (
    <FlowDirectionContext.Provider value={props.direction ?? 'RIGHT'}>
      <GraphHostProvider host={props.host ?? {}}>
        <MessagesProvider messages={props.messages}>
          <ReactFlowProvider>
            <WorkflowGraphFlow {...props} />
          </ReactFlowProvider>
        </MessagesProvider>
      </GraphHostProvider>
    </FlowDirectionContext.Provider>
  )
}
