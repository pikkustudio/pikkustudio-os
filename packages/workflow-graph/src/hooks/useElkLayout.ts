import { useMemo, useEffect, useState } from 'react'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from '@xyflow/react'
import type { FlowDirection } from '../context/FlowDirectionContext'
import {
  FLOW_NODE_WIDTH,
  flowNodeHeight,
} from '../components/nodes/FlowNode'
import {
  CHANNEL_HEADER_HEIGHT,
  CHANNEL_ROW_HEIGHT,
} from '../components/ChannelRow'

const elk = new ELK()

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '80',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.layered.spacing.edgeNodeBetweenLayers': '40',
  'elk.spacing.edgeNode': '40',
  'elk.spacing.edgeEdge': '20',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.mergeEdges': 'false',
  'elk.edgeRouting': 'ORTHOGONAL',
}

/** Mirrors the output handles each flow node type draws, so the layout reserves its height. */
const countOutputHandles = (type: string | undefined, data: any): number => {
  switch (type) {
    case 'switchNode':
      return (data?.cases?.length || 0) + 2
    case 'branchNode':
      return 1 + Math.max(0, (data?.branchCount || 0) - 1) + (data?.hasElse ? 1 : 0) + 1
    case 'parallelNode':
      return (data?.childrenCount || 0) + 1
    case 'fanoutNode':
      return 2
    case 'returnNode':
    case 'cancelNode':
      return 0
    default:
      return 1
  }
}

interface ElkLayoutResult {
  nodes: Node[]
  edges: Edge[]
}

export function useElkLayout(
  nodes: Node[],
  edges: Edge[],
  direction: FlowDirection = 'RIGHT'
): ElkLayoutResult {
  const [result, setResult] = useState<ElkLayoutResult>({
    nodes: [],
    edges: [],
  })

  const nodeIds = useMemo(() => nodes.map((n) => n.id).join(','), [nodes])
  const edgeIds = useMemo(() => edges.map((e) => e.id).join(','), [edges])

  useEffect(() => {
    // Cancellation flag (not state): a state guard would drop a dep change
    // that lands mid-layout with no retry, sticking the old layout forever.
    let cancelled = false

    const applyLayout = async () => {
      if (nodes.length === 0) {
        return
      }

      // DOWN (side-panel) layouts: tighter layers to keep flows compact, wider
      // in-layer gaps so the labels hung beside nodes clear their siblings.
      const directionOptions =
        direction === 'DOWN'
          ? {
              'elk.direction': direction,
              'elk.spacing.nodeNode': '150',
              'elk.layered.spacing.nodeNodeBetweenLayers': '70',
            }
          : { 'elk.direction': direction }

      const graph = {
        id: 'root',
        layoutOptions: { ...elkOptions, ...directionOptions },
        children: nodes.map((node) => {
          const nodeData = node.data as any
          const nodeType = nodeData?.nodeType
          let width = node.width || FLOW_NODE_WIDTH
          let height = node.height || 100

          if (nodeType === 'flow') {
            width = FLOW_NODE_WIDTH
            height = flowNodeHeight(countOutputHandles(node.type, nodeData))
          } else if (nodeType === 'channelEntry') {
            width = FLOW_NODE_WIDTH
            const handlerCount =
              (nodeData?.handlers?.length || 0) +
              (nodeData?.categories?.length || 0)
            height = CHANNEL_HEADER_HEIGHT + 2 + handlerCount * CHANNEL_ROW_HEIGHT
          } else if (nodeType === 'channelRouter') {
            width = 240
            const actionCount = nodeData?.actions?.length || 0
            height = CHANNEL_HEADER_HEIGHT + 2 + actionCount * CHANNEL_ROW_HEIGHT
          } else if (nodeType === 'wiring') {
            if (node.type === 'channelWiringNode') {
              width = FLOW_NODE_WIDTH
              let handlers = 3
              if (nodeData?.onMessageRoute) {
                handlers += Object.keys(nodeData.onMessageRoute).length
              }
              height = CHANNEL_HEADER_HEIGHT + 2 + handlers * CHANNEL_ROW_HEIGHT
            } else {
              width = FLOW_NODE_WIDTH
              height = flowNodeHeight(nodeData?.outputHandles?.length || 0)
            }
          } else if (nodeType === 'rpc' || node.type === 'functionNode') {
            width = FLOW_NODE_WIDTH
            height = flowNodeHeight(nodeData?.terminal ? 0 : 1)
          } else {
            // BaseNode cards (inline, generic, decision, channel)
            width = FLOW_NODE_WIDTH
            height = nodeData?.inWorkflow ? 108 : 76
          }

          const elkNode: any = {
            id: node.id,
            width,
            height,
          }

          if (nodeData?.order !== undefined) {
            elkNode.properties = {
              'org.eclipse.elk.priority': nodeData.order,
            }
          }

          return elkNode
        }),
        edges: edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      }

      try {
        const layout = await elk.layout(graph)
        if (cancelled) return

        const minY = Math.min(...(layout.children?.map((n) => n.y || 0) || [0]))
        const yOffset = 75 - minY

        const newNodes = nodes.map((node) => {
          const layoutNode = layout.children?.find((n) => n.id === node.id)
          if (layoutNode) {
            return {
              ...node,
              position: {
                x: layoutNode.x ?? node.position.x,
                y: (layoutNode.y ?? 0) + yOffset,
              },
            }
          }
          return node
        })

        const bendPointMap = new Map<string, { x: number; y: number }[]>()
        if (layout.edges) {
          for (const elkEdge of layout.edges) {
            const sections = (elkEdge as any).sections
            if (sections && sections.length > 0) {
              const allBendPoints: { x: number; y: number }[] = []
              for (const section of sections) {
                if (section.bendPoints) {
                  for (const bp of section.bendPoints) {
                    allBendPoints.push({
                      x: bp.x,
                      y: (bp.y ?? 0) + yOffset,
                    })
                  }
                }
              }
              if (allBendPoints.length > 0) {
                bendPointMap.set(elkEdge.id, allBendPoints)
              }
            }
          }
        }

        const newEdges = edges.map((edge) => {
          const bendPoints = bendPointMap.get(edge.id)
          if (bendPoints) {
            return {
              ...edge,
              type: 'elk',
              data: { ...edge.data, bendPoints },
            }
          }
          return { ...edge, type: 'elk' }
        })

        setResult({ nodes: newNodes, edges: newEdges })
      } catch {
        if (!cancelled) setResult({ nodes, edges })
      }
    }

    applyLayout()

    return () => {
      cancelled = true
    }
  }, [nodeIds, edgeIds, direction])

  return result.nodes.length > 0 ? result : { nodes, edges }
}
