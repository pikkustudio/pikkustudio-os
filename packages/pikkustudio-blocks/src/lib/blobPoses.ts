const N = 96
const TAU = Math.PI * 2
const K = 42

export type BlobPoseId = 'dot' | 'seed' | 'bean' | 'blob' | 'tall' | 'think' | 'ask' | 'sleep' | 'alert'
export type BlobPoseAlias = 'listening' | 'thinking' | 'question' | 'sleeping'
export type BlobPoseName = BlobPoseId | BlobPoseAlias

export type BlobEye = { x: number; y: number; w: number; h: number }
export type BlobExtra = '' | 'zzz' | '?' | '!' | '…'
export type BlobPoseData = {
  id: BlobPoseId
  label: string
  pts: ReadonlyArray<readonly [number, number]>
  eyes: readonly [BlobEye, BlobEye]
  extra: BlobExtra
}

const polar = (f: (a: number) => number, sx = 1, sy = 1, dx = 0, dy = 0) =>
  Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + (i / N) * TAU
    const r = f(a)
    return [Math.cos(a) * r * sx + dx, Math.sin(a) * r * sy + dy] as const
  })

const E = (x1: number, y1: number, x2: number, y2: number, w: number, h: number): [BlobEye, BlobEye] => [
  { x: x1, y: y1, w, h },
  { x: x2, y: y2, w, h },
]

const blobR = (a: number) => 0.56 + 0.05 * Math.sin(3 * a + 1) + 0.035 * Math.cos(2 * a + 0.4)

export const BLOB_POSES: Record<BlobPoseId, BlobPoseData> = {
  dot: { id: 'dot', label: 'Dot', pts: polar(() => 0.03), eyes: E(0, 0, 0, 0, 0.03, 0.03), extra: '' },
  seed: { id: 'seed', label: 'Seed', pts: polar(() => 0.17), eyes: E(0, 0, 0, 0, 0.065, 0.065), extra: '' },
  bean: {
    id: 'bean',
    label: 'Bean',
    pts: polar((a) => 0.27 + 0.09 * Math.cos(2 * a - 0.9)),
    eyes: E(-0.1, -0.08, 0.1, 0.08, 0.035, 0.05),
    extra: '',
  },
  blob: { id: 'blob', label: 'Blob', pts: polar(blobR), eyes: E(-0.15, -0.06, 0.15, -0.06, 0.04, 0.06), extra: '' },
  tall: {
    id: 'tall',
    label: 'Listening',
    pts: polar(blobR, 0.82, 1.1),
    eyes: E(-0.14, -0.16, 0.14, -0.16, 0.045, 0.075),
    extra: '',
  },
  think: {
    id: 'think',
    label: 'Thinking',
    pts: polar((a) => 0.54 + 0.07 * Math.sin(2 * a + 2.2) + 0.03 * Math.sin(4 * a), 1.02, 0.95),
    eyes: E(-0.06, -0.2, 0.22, -0.22, 0.04, 0.05),
    extra: '…',
  },
  ask: {
    id: 'ask',
    label: 'Question',
    pts: polar((a) => 0.52 + 0.06 * Math.sin(3 * a - 0.5), 0.9, 1.08, -0.05, 0.03),
    eyes: E(-0.17, -0.1, 0.1, -0.13, 0.04, 0.065),
    extra: '?',
  },
  sleep: {
    id: 'sleep',
    label: 'Sleeping',
    pts: polar((a) => 0.58 + 0.03 * Math.sin(2 * a), 1.2, 0.5, 0, 0.28),
    eyes: E(-0.2, 0.26, 0.16, 0.26, 0.065, 0.006),
    extra: 'zzz',
  },
  alert: {
    id: 'alert',
    label: 'Alert',
    pts: polar((a) => 0.5 + 0.07 * Math.sin(9 * a)),
    eyes: E(-0.14, -0.05, 0.14, -0.05, 0.045, 0.075),
    extra: '!',
  },
}

export const BLOB_POSE_IDS = Object.keys(BLOB_POSES) as BlobPoseId[]

const ALIASES: Record<BlobPoseAlias, BlobPoseId> = {
  listening: 'tall',
  thinking: 'think',
  question: 'ask',
  sleeping: 'sleep',
}

export const resolvePose = (name: BlobPoseName): BlobPoseData =>
  BLOB_POSES[(ALIASES as Record<string, BlobPoseId>)[name] ?? (name as BlobPoseId)] ?? BLOB_POSES.blob

function rng(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f2 = (n: number) => +n.toFixed(2)

function smoothPath(P: ReadonlyArray<readonly [number, number]>) {
  const n = P.length
  const m = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const s = m(P[n - 1], P[0])
  let d = `M${f2(s[0])} ${f2(s[1])}`
  for (let i = 0; i < n; i++) {
    const q = m(P[i], P[(i + 1) % n])
    d += `Q${f2(P[i][0])} ${f2(P[i][1])} ${f2(q[0])} ${f2(q[1])}`
  }
  return d + 'Z'
}

export const BLOB_FRAMES = 4
const WOB = 0.007 * K

type Jit = { ax: number; ay: number; px: number; py: number }
const JITTERS: Jit[][] = Array.from({ length: BLOB_FRAMES }, (_, f) => {
  const r = rng(101 + f * 17)
  return Array.from({ length: 5 }, () => ({ ax: r() - 0.5, ay: r() - 0.5, px: r() * TAU, py: r() * TAU }))
})

export type BlobGeometry = {
  paths: string[]
  eyes: ReadonlyArray<ReadonlyArray<{ cx: number; cy: number; rx: number; ry: number }>>
  mark: { x: number; y: number } | null
}

const cache = new Map<BlobPoseId, BlobGeometry>()

export function blobGeometry(name: BlobPoseName): BlobGeometry {
  const pose = resolvePose(name)
  const hit = cache.get(pose.id)
  if (hit) return hit
  const paths: string[] = []
  const eyes: Array<Array<{ cx: number; cy: number; rx: number; ry: number }>> = []
  for (let f = 0; f < BLOB_FRAMES; f++) {
    const J = JITTERS[f]
    const P = pose.pts.map((p, i) => {
      const a = (i / N) * TAU
      let jx = 0
      let jy = 0
      for (let h = 0; h < J.length; h++) {
        jx += J[h].ax * Math.sin((h + 2) * a + J[h].px)
        jy += J[h].ay * Math.sin((h + 2) * a + J[h].py)
      }
      return [50 + p[0] * K + jx * WOB, 50 + p[1] * K + jy * WOB] as const
    })
    paths.push(smoothPath(P))
    eyes.push(
      pose.eyes.map((e, i) => ({
        cx: f2(50 + e.x * K + (J[i]?.ax ?? 0) * WOB * 0.6),
        cy: f2(50 + e.y * K + (J[i]?.ay ?? 0) * WOB * 0.6),
        rx: f2(Math.max(e.w * K, 0.9)),
        ry: f2(Math.max(e.h * K, 0.7)),
      })),
    )
  }
  let mark: BlobGeometry['mark'] = null
  if (pose.extra) {
    let mx = -9
    let my = 9
    pose.pts.forEach((p) => {
      if (p[0] > mx) mx = p[0]
      if (p[1] < my) my = p[1]
    })
    mark = { x: f2(Math.min(50 + (mx * 0.75 + 0.1) * K, 86)), y: f2(Math.max(50 + (my + 0.02) * K, 16)) }
  }
  const g = { paths, eyes, mark }
  cache.set(pose.id, g)
  return g
}

const LOGO = { seed: 11, wob: 0.05, weight: 0.1, dot: 0.2, dx: 0.2, dy: -0.16, ring: 0.74 }

function buildLogo() {
  const r = rng(LOGO.seed)
  const H = Array.from({ length: 4 }, () => [r() - 0.5, r() * TAU] as const)
  const P = Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + (i / N) * TAU
    let w = 0
    H.forEach((h, k) => (w += h[0] * Math.sin((k + 2) * a + h[1])))
    const rr = LOGO.ring * (1 + LOGO.wob * 2 * w)
    return [50 + Math.cos(a) * rr * 50, 50 + Math.sin(a) * rr * 50] as const
  })
  return {
    d: smoothPath(P),
    strokeWidth: f2(LOGO.weight * 100),
    dot: { cx: f2(50 + LOGO.dx * 50), cy: f2(50 + LOGO.dy * 50), r: f2(LOGO.dot * 50) },
  }
}

export const BLOB_LOGO = buildLogo()

export const blobLogoSvg = (color = 'currentColor') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${BLOB_LOGO.d}" fill="none" stroke="${color}" stroke-width="${BLOB_LOGO.strokeWidth}" stroke-linejoin="round"/><circle cx="${BLOB_LOGO.dot.cx}" cy="${BLOB_LOGO.dot.cy}" r="${BLOB_LOGO.dot.r}" fill="${color}"/></svg>`
