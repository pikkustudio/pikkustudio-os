export const N = 96
export const K = 0.42
export const TAU = Math.PI * 2

export type Pt = [number, number]
export type BlobEye = { x: number; y: number; w: number; h: number }
export type BlobMarkText = '' | 'zzz' | '?' | '!' | '…'
export type BlobPoseId = 'dot' | 'seed' | 'bean' | 'blob' | 'tall' | 'think' | 'ask' | 'sleep' | 'alert'
export type BlobPoseAlias = 'listening' | 'thinking' | 'question' | 'sleeping'
export type BlobPoseName = BlobPoseId | BlobPoseAlias
export type BlobStateName = 'idle' | 'listening' | 'thinking' | 'speaking' | 'question' | 'sleeping'

export type BlobPose = {
  id: string
  name: string
  pts: Pt[]
  eyes: [BlobEye, BlobEye]
  extra: BlobMarkText
}

export type BlobShape = {
  pts: Pt[]
  eyes: BlobEye[]
  extra: string
  extraA: number
}

export type BlobSettings = { stroke: number; wob: number; boil: number; breathe: number; voice: number }
export type BlobLogo = { seed: number; wob: number; weight: number; dot: number; dx: number; dy: number; ring: number }
export type BlobData = {
  poses: BlobPose[]
  states: Record<BlobStateName, string>
  set: BlobSettings
  logo: BlobLogo
}

const polar = (f: (a: number) => number, sx = 1, sy = 1, dx = 0, dy = 0): Pt[] =>
  Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + (i / N) * TAU
    const r = f(a)
    return [Math.cos(a) * r * sx + dx, Math.sin(a) * r * sy + dy]
  })

const E = (x1: number, y1: number, x2: number, y2: number, w: number, h: number): [BlobEye, BlobEye] => [
  { x: x1, y: y1, w, h },
  { x: x2, y: y2, w, h },
]

const blobR = (a: number) => 0.56 + 0.05 * Math.sin(3 * a + 1) + 0.035 * Math.cos(2 * a + 0.4)

export const defaultPoses = (): BlobPose[] => [
  { id: 'dot', name: 'Dot', pts: polar(() => 0.03), eyes: E(0, 0, 0, 0, 0.03, 0.03), extra: '' },
  { id: 'seed', name: 'Seed', pts: polar(() => 0.17), eyes: E(0, 0, 0, 0, 0.065, 0.065), extra: '' },
  { id: 'bean', name: 'Bean', pts: polar((a) => 0.27 + 0.09 * Math.cos(2 * a - 0.9)), eyes: E(-0.1, -0.08, 0.1, 0.08, 0.035, 0.05), extra: '' },
  { id: 'blob', name: 'Blob', pts: polar(blobR), eyes: E(-0.15, -0.06, 0.15, -0.06, 0.04, 0.06), extra: '' },
  { id: 'tall', name: 'Listening', pts: polar(blobR, 0.82, 1.1), eyes: E(-0.14, -0.16, 0.14, -0.16, 0.045, 0.075), extra: '' },
  {
    id: 'think',
    name: 'Thinking',
    pts: polar((a) => 0.54 + 0.07 * Math.sin(2 * a + 2.2) + 0.03 * Math.sin(4 * a), 1.02, 0.95),
    eyes: E(-0.06, -0.2, 0.22, -0.22, 0.04, 0.05),
    extra: '…',
  },
  {
    id: 'ask',
    name: 'Question',
    pts: polar((a) => 0.52 + 0.06 * Math.sin(3 * a - 0.5), 0.9, 1.08, -0.05, 0.03),
    eyes: E(-0.17, -0.1, 0.1, -0.13, 0.04, 0.065),
    extra: '?',
  },
  {
    id: 'sleep',
    name: 'Sleeping',
    pts: polar((a) => 0.58 + 0.03 * Math.sin(2 * a), 1.2, 0.5, 0, 0.28),
    eyes: E(-0.2, 0.26, 0.16, 0.26, 0.065, 0.006),
    extra: 'zzz',
  },
  { id: 'alert', name: 'Alert', pts: polar((a) => 0.5 + 0.07 * Math.sin(9 * a)), eyes: E(-0.14, -0.05, 0.14, -0.05, 0.045, 0.075), extra: '!' },
]

export const DEFAULT_STATES: Record<BlobStateName, string> = {
  idle: 'blob',
  listening: 'tall',
  thinking: 'think',
  speaking: 'blob',
  question: 'ask',
  sleeping: 'sleep',
}

export const defaultSettings = (reduced = false): BlobSettings => ({ stroke: 0.014, wob: 0.007, boil: reduced ? 0 : 6, breathe: 0.02, voice: 0.7 })

export const DEFAULT_LOGO: BlobLogo = { seed: 11, wob: 0.05, weight: 0.1, dot: 0.2, dx: 0.2, dy: -0.16, ring: 0.74 }

export const defaultData = (reduced = false): BlobData => ({
  poses: defaultPoses(),
  states: { ...DEFAULT_STATES },
  set: defaultSettings(reduced),
  logo: { ...DEFAULT_LOGO },
})

export const POSES: BlobPose[] = defaultPoses()

const ALIASES: Record<BlobPoseAlias, BlobPoseId> = { listening: 'tall', thinking: 'think', question: 'ask', sleeping: 'sleep' }

export const resolvePoseId = (name: string) => (ALIASES as Record<string, string>)[name] ?? name

export const findPose = (poses: BlobPose[], name: string): BlobPose => {
  const id = resolvePoseId(name)
  return poses.find((p) => p.id === id) ?? poses.find((p) => p.id === 'blob') ?? poses[0]
}

export const resolvePose = (name: string): BlobPose => findPose(POSES, name)

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o))

export function resample(raw: Pt[]): Pt[] {
  const n = raw.length
  const L = [0]
  for (let i = 0; i < n; i++) {
    const a = raw[i]
    const b = raw[(i + 1) % n]
    L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const tot = L[n] || 1
  const out: Pt[] = []
  let j = 0
  for (let i = 0; i < N; i++) {
    const d = (i / N) * tot
    while (j < n - 1 && L[j + 1] < d) j++
    const a = raw[j]
    const b = raw[(j + 1) % n]
    const s = L[j + 1] - L[j] || 1
    const u = (d - L[j]) / s
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u])
  }
  return out
}

export function normalise(input: Pt[]): Pt[] {
  let p = input
  let A = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i]
    const b = p[(i + 1) % p.length]
    A += a[0] * b[1] - b[0] * a[1]
  }
  if (A < 0) p = p.slice().reverse()
  let t = 0
  p.forEach((q, i) => {
    if (q[1] < p[t][1]) t = i
  })
  return p.slice(t).concat(p.slice(0, t))
}

export function align(b: Pt[], a: Pt[]): Pt[] {
  let best = 0
  let bd = Infinity
  for (let s = 0; s < N; s++) {
    let d = 0
    for (let i = 0; i < N; i += 2) {
      const q = b[(i + s) % N]
      const p = a[i]
      d += (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
      if (d > bd) break
    }
    if (d < bd) {
      bd = d
      best = s
    }
  }
  return b.map((_, i) => b[(i + best) % N])
}

export const lerpP = (a: Pt[], b: Pt[], t: number): Pt[] => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t])

export const lerpE = (a: BlobEye[], b: BlobEye[], t: number): BlobEye[] =>
  a.map((e, i) => ({ x: e.x + (b[i].x - e.x) * t, y: e.y + (b[i].y - e.y) * t, w: e.w + (b[i].w - e.w) * t, h: e.h + (b[i].h - e.h) * t }))

export function crosses(p: Pt[]): boolean {
  const o = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  for (let i = 0; i < N; i++) {
    const a = p[i]
    const b = p[(i + 1) % N]
    for (let j = i + 2; j < N; j++) {
      if (i === 0 && j === N - 1) continue
      const c = p[j]
      const d = p[(j + 1) % N]
      if (o(a, b, c) * o(a, b, d) < -1e-12 && o(c, d, a) * o(c, d, b) < -1e-12) return true
    }
  }
  return false
}

export type MorphScan = { clean: true } | { clean: false; from: number; to: number }

export function scanMorph(a: BlobPose, b: BlobPose): MorphScan {
  const bb = align(b.pts, a.pts)
  let lo = -1
  let hi = -1
  for (let i = 0; i <= 40; i++) {
    if (crosses(lerpP(a.pts, bb, i / 40))) {
      if (lo < 0) lo = i
      hi = i
    }
  }
  return lo < 0 ? { clean: true } : { clean: false, from: Math.round(lo * 2.5), to: Math.round(hi * 2.5) }
}

export const backEase = (x: number) => {
  const c = 1.4
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2)
}

export const MORPH_MS = 650

export type IntroStep = [poseId: string, ms: number]

export const introSteps = (idle: string): IntroStep[] => [
  ['seed', 420],
  ['bean', 520],
  [idle, 700],
]

export const INTRO_DELAY_MS = 350

export function rng(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function logoPts(L: BlobLogo): Pt[] {
  const r = rng(L.seed)
  const H = Array.from({ length: 4 }, () => [r() - 0.5, r() * TAU] as const)
  return Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + (i / N) * TAU
    let w = 0
    H.forEach((h, k) => (w += h[0] * Math.sin((k + 2) * a + h[1])))
    const rr = L.ring * (1 + L.wob * 2 * w)
    return [Math.cos(a) * rr, Math.sin(a) * rr]
  })
}

const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
const f2 = (n: number) => +n.toFixed(2)

export function logoGeometry(L: BlobLogo) {
  const P = logoPts(L).map((p): Pt => [50 + p[0] * 50, 50 + p[1] * 50])
  const s = mid(P[N - 1], P[0])
  let d = `M${f2(s[0])} ${f2(s[1])}`
  for (let i = 0; i < N; i++) {
    const q = mid(P[i], P[(i + 1) % N])
    d += `Q${f2(P[i][0])} ${f2(P[i][1])} ${f2(q[0])} ${f2(q[1])}`
  }
  return {
    d: d + 'Z',
    strokeWidth: f2(L.weight * 100),
    dot: { cx: f2(50 + L.dx * 50), cy: f2(50 + L.dy * 50), r: f2(L.dot * 50) },
  }
}

export function logoSvg(L: BlobLogo, color = 'currentColor') {
  const g = logoGeometry(L)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${g.d}" fill="none" stroke="${color}" stroke-width="${g.strokeWidth}" stroke-linejoin="round"/><circle cx="${g.dot.cx}" cy="${g.dot.cy}" r="${g.dot.r}" fill="${color}"/></svg>`
}

export function exportData(d: BlobData): string {
  return JSON.stringify({
    version: 1,
    points: N,
    poses: d.poses.map((p) => ({ ...p, pts: p.pts.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]) })),
    states: d.states,
    settings: d.set,
    logo: d.logo,
  })
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const validPose = (p: unknown): p is BlobPose => {
  const q = p as BlobPose
  return (
    !!q &&
    typeof q.id === 'string' &&
    Array.isArray(q.pts) &&
    q.pts.length === N &&
    q.pts.every((t) => Array.isArray(t) && isNum(t[0]) && isNum(t[1])) &&
    Array.isArray(q.eyes) &&
    q.eyes.length === 2 &&
    q.eyes.every((e) => e && isNum(e.x) && isNum(e.y) && isNum(e.w) && isNum(e.h))
  )
}

export function importData(text: string, base: BlobData): BlobData | null {
  try {
    const o = JSON.parse(text)
    if (!o || !Array.isArray(o.poses) || !o.poses.length || !o.poses.every(validPose)) return null
    const poses: BlobPose[] = o.poses.map((p: BlobPose) => ({ id: p.id, name: typeof p.name === 'string' && p.name ? p.name : 'Pose', pts: p.pts, eyes: p.eyes, extra: p.extra ?? '' }))
    const states = { ...base.states, ...(o.states ?? {}) }
    ;(Object.keys(states) as BlobStateName[]).forEach((k) => {
      if (!poses.some((p) => p.id === states[k])) states[k] = poses[0].id
    })
    return { poses, states, set: { ...base.set, ...(o.settings ?? {}) }, logo: { ...base.logo, ...(o.logo ?? {}) } }
  } catch {
    return null
  }
}
