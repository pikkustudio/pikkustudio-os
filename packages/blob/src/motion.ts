import {
  MORPH_MS,
  N,
  align,
  backEase,
  clone,
  lerpE,
  lerpP,
  type BlobPose,
  type BlobShape,
  type BlobSettings,
} from './core'

export type BlobFx = 'idle' | 'speaking' | 'thinking' | 'sleeping' | 'lost'

export type Morph = {
  cur: BlobShape
  from: BlobShape | null
  to: BlobShape | null
  t0: number
  dur: number
  queue: Array<[BlobPose, number]>
}

const shapeOf = (p: BlobPose, a = p.extra ? 1 : 0): BlobShape => ({ pts: clone(p.pts), eyes: clone(p.eyes), extra: p.extra || '', extraA: a })

export const createMorph = (p: BlobPose): Morph => ({ cur: shapeOf(p), from: null, to: null, t0: 0, dur: 1, queue: [] })

export function snap(m: Morph, p: BlobPose) {
  m.cur = shapeOf(p)
  m.from = m.to = null
  m.queue = []
}

export function go(m: Morph, p: BlobPose, now: number, dur = MORPH_MS) {
  m.from = clone(m.cur)
  m.to = { pts: align(p.pts, m.from.pts), eyes: clone(p.eyes), extra: p.extra || '', extraA: 1 }
  m.t0 = now
  m.dur = dur
}

export function stepMorph(m: Morph, now: number) {
  const { from, to } = m
  if (!to || !from) return
  const x = Math.min(1, (now - m.t0) / m.dur)
  const e = backEase(x)
  m.cur.pts = lerpP(from.pts, to.pts, e)
  m.cur.eyes = lerpE(from.eyes, to.eyes, Math.min(1, x * 1.2))
  if (x < 0.5) {
    m.cur.extra = from.extra
    m.cur.extraA = from.extra ? from.extraA * (1 - 2 * x) : 0
  } else {
    m.cur.extra = to.extra
    m.cur.extraA = to.extra ? 2 * x - 1 : 0
  }
  if (x >= 1) {
    m.cur.pts = clone(to.pts)
    m.cur.extraA = to.extra ? 1 : 0
    m.from = m.to = null
    const q = m.queue.shift()
    if (q) go(m, q[0], now, q[1])
  }
}

export const morphing = (m: Morph) => !!m.to

export type FrameInput = {
  t: number
  fx: BlobFx
  look: [number, number]
  settings: Pick<BlobSettings, 'breathe' | 'voice'>
  still?: boolean
}

export function frameShape(m: Morph, f: FrameInput): BlobShape {
  const { t, fx, look, settings, still } = f
  const br = still ? 1 : 1 + Math.sin(t * 1.7) * settings.breathe
  let pts = m.cur.pts.map((p): [number, number] => [p[0] / Math.sqrt(br), p[1] * br])
  if (fx === 'speaking' && !still) {
    const amp = (0.5 + 0.5 * Math.sin(t * 3.1)) * (0.5 + 0.5 * Math.sin(t * 7.7 + 1)) * settings.voice * 0.09
    const src = pts
    pts = src.map((p, i): [number, number] => {
      const a = src[(i + N - 1) % N]
      const b = src[(i + 1) % N]
      const nx = b[1] - a[1]
      const ny = a[0] - b[0]
      const l = Math.hypot(nx, ny) || 1
      const w = Math.sin(i * 0.92 + t * 13) * amp
      return [p[0] + (nx / l) * w, p[1] + (ny / l) * w]
    })
  }
  let ox = 0
  let oy = 0
  let bl = 1
  if (fx === 'lost') {
    const s = Math.sin(t * 0.8)
    const scan = Math.sign(s) * Math.pow(Math.abs(s), 0.35)
    if (!still) {
      ox = scan * 0.07
      oy = -0.012 + Math.sin(t * 1.3) * 0.01
      const r = scan * 0.07
      const c = Math.cos(r), n = Math.sin(r)
      pts = pts.map(([x, y]): [number, number] => [x * c - y * n, x * n + y * c])
      if (t % 3.1 < 0.12) bl = 0.12
    } else {
      ox = 0.03
      oy = -0.01
    }
  } else if (fx === 'thinking') {
    if (!still) {
      ox = Math.cos(t * 1.6) * 0.02
      oy = Math.sin(t * 1.6) * 0.015
    }
  } else if (fx !== 'sleeping') {
    ox = Math.max(-1, Math.min(1, look[0])) * 0.035
    oy = Math.max(-1, Math.min(1, look[1])) * 0.03
    if (!still && t % 3.7 < 0.13) bl = 0.12
  }
  return {
    pts,
    eyes: m.cur.eyes.map((e) => ({ ...e, x: e.x + ox, y: e.y + oy, h: e.h * bl })),
    extra: m.cur.extra,
    extraA: m.cur.extraA,
  }
}
