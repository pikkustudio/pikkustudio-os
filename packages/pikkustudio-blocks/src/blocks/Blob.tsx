import type { I18nString } from '@pikku/react'
import { useSyncExternalStore, type SVGProps } from 'react'
import { BLOB_FRAMES, BLOB_LOGO, blobGeometry, resolvePose, type BlobPoseName } from '../lib/blobPoses'

export type { BlobPoseName } from '../lib/blobPoses'

export type BlobProps = Omit<SVGProps<SVGSVGElement>, 'color' | 'fill' | 'title' | 'stroke' | 'aria-label'> & {
  pose?: BlobPoseName
  size?: number | string
  title?: I18nString
  fill?: string
  lookX?: number
  lookY?: number
  motion?: boolean
  stroke?: number
}

let frame = 0
let timer: ReturnType<typeof setInterval> | undefined
const subs = new Set<() => void>()

const stillOnly = () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

function subscribe(cb: () => void) {
  subs.add(cb)
  if (!timer && !stillOnly()) {
    timer = setInterval(() => {
      frame = (frame + 1) % BLOB_FRAMES
      subs.forEach((s) => s())
    }, 190)
  }
  return () => {
    subs.delete(cb)
    if (!subs.size && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

const idle = () => () => {}

const useFrame = (on: boolean) =>
  useSyncExternalStore(
    on ? subscribe : idle,
    () => (on ? frame : 0),
    () => 0,
  )

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997
  return h
}

const dimension = (size?: number | string) => (size === undefined ? undefined : typeof size === 'number' ? `${size}px` : size)

export function Blob({ pose = 'blob', size, title, fill, lookX = 0, lookY = 0, motion = true, stroke = 2.4, className, style, ...rest }: BlobProps) {
  const p = resolvePose(pose)
  const g = blobGeometry(pose)
  const f = useFrame(motion)
  const eyes = g.eyes[f]
  const ox = Math.max(-1, Math.min(1, lookX)) * 1.5
  const oy = Math.max(-1, Math.min(1, lookY)) * 1.3
  const delay = -((hash(p.id) % 50) / 10)
  const dim = dimension(size)
  return (
    <svg
      viewBox="0 0 100 100"
      width={dim}
      height={dim}
      className={className}
      style={{ overflow: 'visible', ...style }}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <g className={motion ? 'blob-breathe' : undefined} style={{ animationDelay: `${delay}s` }}>
        <path d={g.paths[f]} fill={fill ?? 'none'} stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
        {eyes.map((e, i) => (
          <ellipse
            key={i}
            className={motion ? 'blob-blink' : undefined}
            style={{ animationDelay: `${delay}s` }}
            cx={e.cx + ox}
            cy={e.cy + oy}
            rx={e.rx}
            ry={e.ry}
            fill="currentColor"
          />
        ))}
        {g.mark ? <Mark extra={p.extra} x={g.mark.x} y={g.mark.y} motion={motion} /> : null}
      </g>
    </svg>
  )
}

const markFont = { fontFamily: 'var(--font-heading)', fontWeight: 700 } as const

function Mark({ extra, x, y, motion }: { extra: string; x: number; y: number; motion: boolean }) {
  if (extra === 'zzz') {
    return (
      <g fill="currentColor" textAnchor="middle" style={markFont}>
        {[0, 1, 2].map((i) => (
          <text key={i} className={motion ? 'blob-z' : undefined} style={{ animationDelay: `${-i * 1.2}s` }} x={x + i * 4} y={y - i * 7} fontSize={8 + i * 3}>
            z
          </text>
        ))}
      </g>
    )
  }
  return (
    <text x={x} y={y} fontSize={20} fill="currentColor" textAnchor="middle" dominantBaseline="middle" style={markFont}>
      {extra}
    </text>
  )
}

export function BlobMark({ size, title, className, style }: Pick<BlobProps, 'size' | 'title' | 'className' | 'style'>) {
  const dim = dimension(size)
  return (
    <svg
      viewBox="0 0 100 100"
      width={dim}
      height={dim}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={BLOB_LOGO.d} fill="none" stroke="currentColor" strokeWidth={BLOB_LOGO.strokeWidth} strokeLinejoin="round" />
      <circle cx={BLOB_LOGO.dot.cx} cy={BLOB_LOGO.dot.cy} r={BLOB_LOGO.dot.r} fill="currentColor" />
    </svg>
  )
}
