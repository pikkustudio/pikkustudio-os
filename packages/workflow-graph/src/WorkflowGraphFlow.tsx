import React, { useMemo, useEffect } from 'react'
import type { NodeTypes, EdgeTypes, Node, Edge } from '@xyflow/react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  MarkerType,
  Background,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react'
import type { WorkflowGraphViewProps } from './WorkflowGraphView'
import { WiringNode } from './components/nodes/WiringNode'
import { FunctionNode } from './components/nodes/FunctionNode'
import { ChannelNode } from './components/nodes/ChannelNode'
import { DecisionNode } from './components/nodes/DecisionNode'
import { SleepNode } from './components/nodes/SleepNode'
import { SuspendNode } from './components/nodes/SuspendNode'
import { InlineNode } from './components/nodes/InlineNode'
import { BranchNode } from './components/nodes/BranchNode'
import { FanoutNode } from './components/nodes/FanoutNode'
import { ReturnNode } from './components/nodes/ReturnNode'
import { CancelNode } from './components/nodes/CancelNode'
import { SwitchNode } from './components/nodes/SwitchNode'
import { ArrayPredicateNode } from './components/nodes/ArrayPredicateNode'
import { FilterNode } from './components/nodes/FilterNode'
import { ParallelNode } from './components/nodes/ParallelNode'
import { ChannelWiringNode } from './components/nodes/ChannelWiringNode'
import { SetNode } from './components/nodes/SetNode'
import { GenericNode } from './components/nodes/GenericNode'
import { FLOW_NODE_WIDTH } from './components/nodes/FlowNode'
import { GraphScrollbars } from './components/GraphScrollbars'
import { ElkEdge } from './components/edges/ElkEdge'
import { useGraphRun } from './context/GraphHostContext'
import { useGraphM } from './context/MessagesContext'
import { createWorkflowFlow } from './hooks/create-workflow-flow'
import { useElkLayout } from './hooks/useElkLayout'

/** Bounds from the layout's own sizes: nodes have no measured size until they have rendered. */
const boundsOf = (nodes: Node[]) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const n of nodes) {
    const w = n.measured?.width ?? n.width ?? FLOW_NODE_WIDTH
    const h = n.measured?.height ?? n.height ?? 80
    x0 = Math.min(x0, n.position.x)
    y0 = Math.min(y0, n.position.y)
    x1 = Math.max(x1, n.position.x + w)
    y1 = Math.max(y1, n.position.y + h)
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

const graphNodeTypes = {
  functionNode: FunctionNode,
  wiringNode: WiringNode,
  channelNode: ChannelNode,
  decisionNode: DecisionNode,
  sleepNode: SleepNode,
  suspendNode: SuspendNode,
  inlineNode: InlineNode,
  genericNode: GenericNode,
  branchNode: BranchNode,
  fanoutNode: FanoutNode,
  returnNode: ReturnNode,
  cancelNode: CancelNode,
  switchNode: SwitchNode,
  arrayPredicateNode: ArrayPredicateNode,
  filterNode: FilterNode,
  parallelNode: ParallelNode,
  channelWiringNode: ChannelWiringNode,
  setNode: SetNode,
}

export const nodeTypes = graphNodeTypes as unknown as NodeTypes

const graphEdgeTypes = {
  elk: ElkEdge,
}

export const edgeTypes = graphEdgeTypes as unknown as EdgeTypes

/** Inner flow of WorkflowGraphView: createWorkflowFlow → ELK layout → xyflow.
 *  Must render inside a ReactFlowProvider (WorkflowGraphView supplies it). */
export const WorkflowGraphFlow: React.FC<WorkflowGraphViewProps> = ({
  workflow,
  direction = 'RIGHT',
  onPaneClick,
}) => {
  const { fitView, setViewport } = useReactFlow()
  const m = useGraphM()
  const frame = React.useRef<HTMLDivElement>(null)

  const { nodes: flowNodes, edges: initialEdges } = useMemo(() => {
    return createWorkflowFlow(workflow, m)
  }, [workflow, m])

  const layoutResult = useElkLayout(flowNodes, initialEdges, direction)

  // Panning stops at the graph's own edges; the canvas is not endless.
  const extent = useMemo<[[number, number], [number, number]] | undefined>(() => {
    if (layoutResult.nodes.length === 0) return undefined
    const b = boundsOf(layoutResult.nodes)
    return [
      [b.x - 48, b.y - 48],
      [b.x + b.width + 48, b.y + b.height + 48],
    ]
  }, [layoutResult.nodes])
  const [nodes, setNodes] = useNodesState<Node>([])
  const [edges, setEdges] = useEdgesState<Edge>([])

  // A line the run has gone down turns solid green; one heading into a step that is working
  // keeps moving; the rest stay dashed grey.
  const run = useGraphRun()
  const shownEdges = useMemo(() => {
    if (!run?.runId) return edges
    const ran = (id: string) => {
      const st = run.stepStates.get(id)?.status
      return st === 'completed' || st === 'succeeded' || st === 'failed' || st === 'running' || st === 'suspended'
    }
    const green = 'var(--success)'
    return edges.map((e) => {
      const target = run.stepStates.get(e.target)?.status
      const from = run.stepStates.get(e.source)?.status
      const sourceDone = from === undefined ? !run.stepStates.has(e.source) && ran(e.target) : from === 'completed' || from === 'succeeded'
      if (!sourceDone || !ran(e.target)) return { ...e, animated: false }
      if (target === 'running') return { ...e, animated: true, style: { ...e.style, stroke: 'var(--info)', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--info)', width: 16, height: 16 } }
      return { ...e, animated: false, style: { ...e.style, stroke: green, strokeWidth: 2, strokeDasharray: undefined }, markerEnd: { type: MarkerType.ArrowClosed, color: green, width: 16, height: 16 } }
    })
  }, [edges, run])

  useEffect(() => {
    if (layoutResult.nodes.length > 0) {
      setNodes(layoutResult.nodes)
      setEdges(layoutResult.edges)
      const timer = setTimeout(() => {
        // Normal size, never shrunk to fit: a graph that fits is centred, a longer one
        // opens at its first step and scrolls.
        const box = frame.current?.getBoundingClientRect()
        const b = boundsOf(layoutResult.nodes)
        if (box && (b.width + 96 > box.width || b.height + 96 > box.height)) {
          const y = b.height + 96 <= box.height ? (box.height - b.height) / 2 - b.y : 48 - b.y
          setViewport({ x: 48 - b.x, y, zoom: 1 })
        } else {
          fitView({ padding: 0.2, maxZoom: 1 })
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [layoutResult, setNodes, setEdges, fitView, setViewport])

  return (
    <div ref={frame} dir="ltr" className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={shownEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          style: {
            stroke: 'var(--muted-foreground)',
            strokeWidth: 1.5,
            strokeDasharray: '6 4',
          },
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'var(--muted-foreground)',
            width: 16,
            height: 16,
          },
        }}
        panOnScroll
        translateExtent={extent}
        zoomOnScroll={false}
        preventScrolling={false}
        minZoom={0.15}
        nodesConnectable={false}
        nodesDraggable={true}
        proOptions={{ hideAttribution: true }}
        noDragClassName="nodrag"
        onPaneClick={onPaneClick}
      >
        <GraphScrollbars />
        <Background color="var(--border)" variant={BackgroundVariant.Dots} size={1} />
      </ReactFlow>
    </div>
  )
}
