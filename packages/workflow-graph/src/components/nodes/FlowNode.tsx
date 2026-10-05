import React from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  Ban,
  Check,
  Clock,
  Hourglass,
  Loader,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useGraphRun } from '../../context/GraphHostContext'
import { useFlowDirection } from '../../context/FlowDirectionContext'
import {
  NodeTile,
  handleClass,
  nodeCardClass,
  type NodeTone,
  type TileIcon,
} from '../NodeTile'

interface OutputHandle {
  id: string
  label?: string
}

type HighlightType = 'focused' | 'referenced' | null

/** Size contract shared with the ELK layout so the layout reserves what the card draws. */
export const FLOW_NODE_WIDTH = 264
export const flowNodeHeight = (handleCount: number): number =>
  Math.max(72, handleCount * 24 + 8)

interface RunLook {
  icon: LucideIcon
  word: string
  ring: string
  chip: string
  spin?: boolean
  pulse?: boolean
}

const runLooks: Record<string, RunLook> = {
  completed: {
    icon: Check,
    word: 'Done',
    ring: 'ring-success',
    chip: 'bg-success-soft text-success-foreground',
  },
  running: {
    icon: Loader,
    word: 'Running',
    ring: 'ring-info',
    chip: 'bg-info-soft text-info-foreground',
    spin: true,
    pulse: true,
  },
  failed: {
    icon: X,
    word: 'Failed',
    ring: 'ring-destructive',
    chip: 'bg-destructive-soft text-destructive',
  },
  pending: {
    icon: Clock,
    word: 'Pending',
    ring: '',
    chip: 'bg-secondary text-muted-foreground',
  },
  suspended: {
    icon: Hourglass,
    word: 'Suspended',
    ring: 'ring-warning',
    chip: 'bg-secondary text-warning-foreground',
  },
  cancelled: {
    icon: Ban,
    word: 'Cancelled',
    ring: '',
    chip: 'bg-secondary text-muted-foreground',
  },
}

const runLookFor = (status: string): RunLook => {
  switch (status) {
    case 'succeeded':
      return runLooks.completed
    case 'scheduled':
      return { ...runLooks.pending, word: 'Scheduled' }
    case 'skipped':
      return { ...runLooks.cancelled, word: 'Skipped' }
    default:
      return runLooks[status] ?? { ...runLooks.pending, word: status }
  }
}

interface FlowNodeProps {
  icon: TileIcon
  tone?: NodeTone
  hasInput?: boolean
  outputHandles?: OutputHandle[]
  label?: string
  labelDimmed?: boolean
  subtitle?: string
  onClick?: () => void
  highlightType?: HighlightType
  /** The run was triggered through this node (wiring nodes only). */
  active?: boolean
  nodeId?: string
}

export const FlowNode: React.FC<FlowNodeProps> = ({
  icon,
  tone = 'step',
  hasInput = false,
  outputHandles = [],
  label,
  labelDimmed = false,
  subtitle,
  onClick,
  highlightType = null,
  active = false,
  nodeId,
}) => {
  const vertical = useFlowDirection() === 'DOWN'
  const run = useGraphRun()

  const runStatus = React.useMemo(() => {
    if (!run?.runId || !nodeId) return null
    const stepState = run.stepStates.get(nodeId)
    let status = stepState?.status
    if (
      !status &&
      !hasInput &&
      run.stepStates.size === 0 &&
      run.status === 'failed'
    ) {
      status = 'failed'
    }
    return status ?? null
  }, [run?.runId, run?.stepStates, run?.status, nodeId, hasInput])

  const look = runStatus ? runLookFor(runStatus) : null
  const StatusIcon = look?.icon

  const highlightClass =
    highlightType === 'focused'
      ? 'outline-2 outline-offset-2 outline-ring'
      : highlightType === 'referenced'
        ? 'outline-2 outline-dashed outline-offset-2 outline-ring'
        : ''

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }
    : undefined

  return (
    <div
      className={`${nodeCardClass} flex items-center gap-3 px-3 py-3 ${highlightClass} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{
        width: FLOW_NODE_WIDTH,
        minHeight: flowNodeHeight(outputHandles.length),
      }}
      data-testid="workflow-node"
      data-node-id={nodeId}
      data-node-status={runStatus ?? 'none'}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-current={highlightType === 'focused' ? 'true' : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {look?.ring && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-px rounded-card ring-2 ${look.ring} ${look.pulse ? 'animate-pulse motion-reduce:animate-none' : ''}`}
        />
      )}

      {hasInput && (
        <Handle
          type="target"
          position={vertical ? Position.Top : Position.Left}
          className={handleClass}
        />
      )}

      <NodeTile icon={icon} tone={tone} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {label && (
          <span
            className={`truncate text-[15px] leading-5 font-bold ${labelDimmed ? 'text-ink-2' : 'text-foreground'}`}
          >
            {label}
          </span>
        )}
        {subtitle && (
          <span className="truncate text-[13px] leading-[18px] text-ink-2">
            {subtitle}
          </span>
        )}
        {(look || active || highlightType) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-1">
            {look && StatusIcon && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${look.chip}`}
              >
                <StatusIcon
                  size={12}
                  strokeWidth={2.5}
                  className={look.spin ? 'animate-spin motion-reduce:animate-none' : ''}
                  aria-hidden="true"
                />
                {look.word}
              </span>
            )}
            {active && (
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-ink-2">
                Triggered this run
              </span>
            )}
            {highlightType && (
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-ink-2">
                {highlightType === 'focused' ? 'Selected' : 'Referenced'}
              </span>
            )}
          </span>
        )}
      </div>

      {outputHandles.map((handle, index) => {
        const total = outputHandles.length
        const minOffset = 25
        const maxOffset = 75
        const offsetPercent =
          total === 1
            ? 50
            : minOffset + ((maxOffset - minOffset) / (total - 1)) * index
        const showLabel = handle.label && total > 1

        return (
          <React.Fragment key={handle.id}>
            <Handle
              type="source"
              position={vertical ? Position.Bottom : Position.Right}
              id={handle.id}
              className={handleClass}
              style={
                vertical
                  ? { left: `${offsetPercent}%` }
                  : { top: `${offsetPercent}%` }
              }
            />
            {showLabel && (
              <span
                className={`absolute rounded-lg bg-card px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-ink-2 ${vertical ? 'top-full mt-1 -translate-x-1/2' : 'left-full ml-1 -translate-y-1/2'}`}
                style={
                  vertical
                    ? { left: `${offsetPercent}%` }
                    : { top: `${offsetPercent}%` }
                }
              >
                {handle.label}
              </span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
