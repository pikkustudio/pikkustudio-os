import React from 'react'
import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { Handle, Position } from '@xyflow/react'
import { Code, Lock, LockOpen, Shield, Layers } from 'lucide-react'
import { GraphBadge } from '../GraphBadge'
import {
  NodeTile,
  handleClass,
  nodeCardClass,
  type NodeTone,
  type TileIcon,
} from '../NodeTile'
import { useFlowDirection } from '../../context/FlowDirectionContext'
import { useGraphM } from '../../context/MessagesContext'
import { FLOW_NODE_WIDTH } from './FlowNode'

interface OutputHandle {
  id: string
  label?: I18nString
}

interface BaseNodeProps {
  data: {
    icon?: TileIcon
    colorKey: string
    title: I18nString
    description?: I18nString
    tags?: string[]
    auth?: boolean
    permissionsCount?: number
    middlewareCount?: number
    onClick?: () => void
  }
  tone?: NodeTone
  hasInput?: boolean
  hasOutput?: boolean
  outputHandles?: OutputHandle[]
  additionalBody?: I18nNode
  width?: number
  hideMetadataIndicators?: boolean
  inFlow?: boolean
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  data,
  tone = 'step',
  hasInput = false,
  hasOutput = true,
  outputHandles,
  additionalBody,
  width = FLOW_NODE_WIDTH,
  hideMetadataIndicators = false,
  inFlow = true,
}) => {
  const vertical = useFlowDirection() === 'DOWN'
  const m = useGraphM()

  const hasMetadata =
    !hideMetadataIndicators &&
    (data.auth !== undefined ||
      (data.permissionsCount && data.permissionsCount > 0) ||
      (data.middlewareCount && data.middlewareCount > 0))

  return (
    <div className={nodeCardClass} style={{ width }}>
      {inFlow && hasInput && (
        <Handle
          type="target"
          position={vertical ? Position.Top : Position.Left}
          className={handleClass}
        />
      )}

      <div
        className={`nodrag flex flex-col gap-2 px-3 py-3 ${data.onClick ? 'cursor-pointer' : 'cursor-default'}`}
        role={data.onClick ? 'button' : undefined}
        tabIndex={data.onClick ? 0 : undefined}
        onClick={data.onClick}
        onKeyDown={
          data.onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  data.onClick?.()
                }
              }
            : undefined
        }
      >
        <div className="flex items-center gap-3">
          <NodeTile icon={data.icon ?? Code} tone={tone} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="line-clamp-2 text-[15px] leading-5 font-bold text-foreground">
              {data.title}
            </span>
            {data.description && (
              <span className="truncate font-mono text-[13px] leading-[18px] text-ink-2">
                {data.description}
              </span>
            )}
          </div>
        </div>

        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.map((tag) => (
              <GraphBadge key={tag} type="dynamic" badge="tag" value={tag} />
            ))}
          </div>
        )}

        {hasMetadata && (
          <div className="flex items-center gap-3 text-[13px] text-ink-2">
            {data.auth !== undefined && (
              <span className="inline-flex items-center gap-1">
                {data.auth ? (
                  <Lock size={14} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <LockOpen size={14} strokeWidth={2} aria-hidden="true" />
                )}
                {data.auth ? m.auth() : m.open()}
              </span>
            )}
            {data.permissionsCount !== undefined &&
              data.permissionsCount > 0 && (
                <span
                  className="inline-flex items-center gap-1"
                  title={m.permissions()}
                >
                  <Shield size={14} strokeWidth={2} aria-hidden="true" />
                  {data.permissionsCount}
                </span>
              )}
            {data.middlewareCount !== undefined && data.middlewareCount > 0 && (
              <span
                className="inline-flex items-center gap-1"
                title={m.middleware()}
              >
                <Layers size={14} strokeWidth={2} aria-hidden="true" />
                {data.middlewareCount}
              </span>
            )}
          </div>
        )}

        {additionalBody}
      </div>

      {inFlow &&
        (outputHandles && outputHandles.length > 0
          ? outputHandles.map((handle, index) => {
              const total = outputHandles.length
              const minOffset = 25
              const maxOffset = 75
              const offsetPercent =
                total === 1
                  ? 50
                  : minOffset + ((maxOffset - minOffset) / (total - 1)) * index

              return (
                <React.Fragment key={handle.id}>
                  <Handle
                    type="source"
                    position={vertical ? Position.Bottom : Position.Right}
                    id={handle.id}
                    className={handleClass}
                    style={
                      vertical
                        ? { left: `${offsetPercent}%` } // physical: the workflow canvas is left-to-right in every language (flow runs source to target)
                        : { top: `${offsetPercent}%` }
                    }
                  />
                  <span
                    className={`absolute rounded-lg bg-card px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-ink-2 ${vertical ? 'top-full mt-1 -translate-x-1/2' : 'left-full ml-1 -translate-y-1/2'}`} // physical: the workflow canvas is left-to-right in every language (flow runs source to target)
                    style={
                      vertical
                        ? { left: `${offsetPercent}%` } // physical: the workflow canvas is left-to-right in every language (flow runs source to target)
                        : { top: `${offsetPercent}%` }
                    }
                  >
                    {handle.label || asI18n(handle.id)}
                  </span>
                </React.Fragment>
              )
            })
          : hasOutput && (
              <Handle
                type="source"
                position={vertical ? Position.Bottom : Position.Right}
                className={handleClass}
              />
            ))}
    </div>
  )
}
