import { useEffect, useRef, useState, type CanvasHTMLAttributes } from 'react'
import { defaultSettings, findPose, POSES, resolvePose, resolvePoseId, type BlobPose, type BlobPoseName } from './core'
import { createMorph, frameShape, go, morphing, snap, stepMorph, type BlobFx, type Morph } from './motion'
import { createJitter, FALLBACK_FONT, render, type Jitter } from './render'

export type { BlobPoseName } from './core'

export type BlobProps = Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'color' | 'title' | 'aria-label' | 'width' | 'height'> & {
  pose?: BlobPoseName | BlobPose
  size?: number | string
  title?: string
  fill?: string
  lookX?: number
  lookY?: number
  motion?: boolean
  stroke?: number
  speaking?: boolean
}

type Inst = {
  canvas: HTMLCanvasElement | null
  id: string
  morph: Morph
  visible: boolean
  dirty: boolean
  phase: number
  motion: boolean
  speaking: boolean
  fill?: string
  stroke?: number
  lookX?: number
  lookY?: number
}

const SETTINGS = defaultSettings()
const LOOK_REACH = 260

const insts = new Set<Inst>()
let raf = 0
let jitter: Jitter | undefined
let lastBoil = 0
let pointer: [number, number] | null = null
let probe: HTMLElement | null = null
let reducedQuery: MediaQueryList | null = null

export type BlobMotionPref = 'system' | 'on' | 'off'
export const BLOB_MOTION_KEY = 'pikku-blob-motion'

let motionPref: BlobMotionPref | null = null

export function getBlobMotion(): BlobMotionPref {
  if (motionPref) return motionPref
  let saved: string | null = null
  try {
    saved = typeof localStorage === 'undefined' ? null : localStorage.getItem(BLOB_MOTION_KEY)
  } catch {}
  const pref: BlobMotionPref = saved === 'on' || saved === 'off' ? saved : 'system'
  if (typeof window !== 'undefined') motionPref = pref
  return pref
}

export function setBlobMotion(next: BlobMotionPref) {
  motionPref = next
  try {
    if (next === 'system') localStorage.removeItem(BLOB_MOTION_KEY)
    else localStorage.setItem(BLOB_MOTION_KEY, next)
  } catch {}
  insts.forEach((i) => {
    i.dirty = true
  })
  wake()
}

const reduced = () => {
  if (typeof window === 'undefined') return true
  const pref = getBlobMotion()
  if (pref === 'on') return false
  if (pref === 'off') return true
  reducedQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)')
  return reducedQuery.matches
}

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997
  return h
}

const explicitLook = (i: Inst) => i.lookX !== undefined || i.lookY !== undefined

function resolveColour(value: string, fallback: string) {
  if (value === 'currentColor') return fallback
  probe ??= Object.assign(document.createElement('span'), { ariaHidden: 'true' })
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none'
  probe.style.color = value
  document.body.appendChild(probe)
  const c = getComputedStyle(probe).color
  probe.remove()
  return c || fallback
}

function draw(i: Inst, now: number) {
  const cv = i.canvas
  if (!cv || !cv.width) return
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const cs = getComputedStyle(cv)
  const colour = cs.color || '#000'
  const font = cs.getPropertyValue('--font-heading').trim() || FALLBACK_FONT
  const still = !i.motion || reduced()
  let look: [number, number] = [0, 0]
  if (explicitLook(i)) look = [i.lookX ?? 0, i.lookY ?? 0]
  else if (pointer) {
    const r = cv.getBoundingClientRect()
    look = [(pointer[0] - (r.left + r.width / 2)) / LOOK_REACH, (pointer[1] - (r.top + r.height / 2)) / LOOK_REACH]
  }
  const fx: BlobFx = i.speaking ? 'speaking' : i.id === 'think' ? 'thinking' : i.id === 'sleep' ? 'sleeping' : i.id === 'lost' ? 'lost' : 'idle'
  const t = now / 1000 + i.phase
  const shape = frameShape(i.morph, { t, fx, look, settings: SETTINGS, still })
  render(ctx, cv.width, shape, {
    dpr: window.devicePixelRatio || 1,
    time: still ? 0 : t,
    colour,
    font,
    stroke: i.stroke === undefined ? SETTINGS.stroke : i.stroke / 100,
    fill: i.fill ? resolveColour(i.fill, colour) : undefined,
    jitter: still ? undefined : jitter,
  })
}

function tick(now: number) {
  raf = 0
  const still = reduced()
  if (!still && SETTINGS.boil > 0 && now - lastBoil > 1000 / SETTINGS.boil) {
    jitter = createJitter()
    lastBoil = now
  }
  let live = false
  insts.forEach((i) => {
    if (!i.visible) return
    stepMorph(i.morph, now)
    const moving = morphing(i.morph)
    const animated = i.motion && !still
    if (animated || moving || i.dirty) {
      draw(i, now)
      i.dirty = false
    }
    if (animated || moving) live = true
  })
  if (live) wake()
}

function wake() {
  if (!raf && insts.size) raf = requestAnimationFrame(tick)
}

function onPointer(e: PointerEvent) {
  pointer = [e.clientX, e.clientY]
  insts.forEach((i) => {
    if (!explicitLook(i)) i.dirty = true
  })
  wake()
}

function register(i: Inst) {
  if (!insts.size) window.addEventListener('pointermove', onPointer, { passive: true })
  insts.add(i)
  i.dirty = true
  wake()
}

function unregister(i: Inst) {
  insts.delete(i)
  if (!insts.size) {
    window.removeEventListener('pointermove', onPointer)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }
}

const dimension = (size?: number | string) => (size === undefined ? undefined : typeof size === 'number' ? `${size}px` : size)

export function Blob({ pose = 'blob', size, title, fill, lookX, lookY, motion = true, stroke, speaking = false, className, style, ...rest }: BlobProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [inst] = useState<Inst>(() => {
    const p = typeof pose === 'string' ? resolvePose(pose) : pose
    return {
      canvas: null,
      id: p.id,
      morph: createMorph(p),
      visible: true,
      dirty: true,
      phase: (hash(p.id) % 50) / 10,
      motion,
      speaking,
      fill,
      stroke,
      lookX,
      lookY,
    }
  })

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    inst.canvas = cv
    const fit = () => {
      const w = Math.round(cv.clientWidth * (window.devicePixelRatio || 1))
      if (w > 0 && cv.width !== w) {
        cv.width = w
        cv.height = w
      }
      inst.dirty = true
      wake()
    }
    fit()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    ro?.observe(cv)
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            inst.visible = entries[entries.length - 1].isIntersecting
            if (inst.visible) {
              inst.dirty = true
              wake()
            }
          })
    io?.observe(cv)
    register(inst)
    return () => {
      ro?.disconnect()
      io?.disconnect()
      unregister(inst)
      inst.canvas = null
    }
  }, [inst])

  useEffect(() => {
    inst.motion = motion
    inst.speaking = speaking
    inst.fill = fill
    inst.stroke = stroke
    inst.lookX = lookX
    inst.lookY = lookY
    inst.dirty = true
    wake()
  }, [inst, motion, speaking, fill, stroke, lookX, lookY])

  useEffect(() => {
    const id = typeof pose === 'string' ? resolvePoseId(pose) : pose.id
    if (id === inst.id) return
    inst.id = id
    const p = typeof pose === 'string' ? findPose(POSES, id) : pose
    if (reduced()) snap(inst.morph, p)
    else go(inst.morph, p, performance.now())
    inst.dirty = true
    wake()
  }, [inst, pose])

  const dim = dimension(size)
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: 'block', aspectRatio: '1', width: dim, height: dim, ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...rest}
    />
  )
}
