import { K, N, TAU, logoPts, type BlobLogo, type BlobShape, type Pt } from './core'

export type Jitter = Array<{ ax: number; ay: number; px: number; py: number }>

export const createJitter = (): Jitter =>
  Array.from({ length: 5 }, () => ({ ax: Math.random() - 0.5, ay: Math.random() - 0.5, px: Math.random() * TAU, py: Math.random() * TAU }))

export const FALLBACK_FONT = '"Fraunces", Georgia, serif'

export type RenderOptions = {
  dpr?: number
  time?: number
  wob?: number
  stroke?: number
  keep?: boolean
  colour?: string
  fill?: string
  font?: string
  jitter?: Jitter
}

const STILL: Jitter = Array.from({ length: 5 }, () => ({ ax: 0, ay: 0, px: 0, py: 0 }))

const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

function outline(ctx: CanvasRenderingContext2D, P: Pt[]) {
  ctx.beginPath()
  const s = mid(P[N - 1], P[0])
  ctx.moveTo(s[0], s[1])
  for (let i = 0; i < N; i++) {
    const q = mid(P[i], P[(i + 1) % N])
    ctx.quadraticCurveTo(P[i][0], P[i][1], q[0], q[1])
  }
  ctx.closePath()
}

export function render(ctx: CanvasRenderingContext2D, S: number, shape: BlobShape, o: RenderOptions = {}) {
  const c = S / 2
  const k = S * K
  const dpr = o.dpr ?? 1
  const J = o.jitter ?? STILL
  const lw = Math.max(1.4 * dpr, S * (o.stroke ?? 0.014))
  const wob = (o.wob ?? 0.007) * k
  const ink = o.colour ?? '#000'
  if (!o.keep) ctx.clearRect(0, 0, S, S)
  const P = shape.pts.map((p, i): Pt => {
    const a = (i / N) * TAU
    let jx = 0
    let jy = 0
    for (let h = 0; h < J.length; h++) {
      jx += J[h].ax * Math.sin((h + 2) * a + J[h].px)
      jy += J[h].ay * Math.sin((h + 2) * a + J[h].py)
    }
    return [c + p[0] * k + jx * wob, c + p[1] * k + jy * wob]
  })
  ctx.strokeStyle = ctx.fillStyle = ink
  ctx.lineWidth = lw
  ctx.lineJoin = ctx.lineCap = 'round'
  outline(ctx, P)
  if (o.fill) {
    ctx.fillStyle = o.fill
    ctx.fill()
    ctx.fillStyle = ink
  }
  ctx.stroke()
  shape.eyes.forEach((e, i) => {
    const j = J[i] ?? { ax: 0, ay: 0 }
    ctx.beginPath()
    ctx.ellipse(c + e.x * k + j.ax * wob * 0.6, c + e.y * k + j.ay * wob * 0.6, Math.max(e.w * k, lw * 0.6), Math.max(e.h * k, lw * 0.45), 0, 0, TAU)
    ctx.fill()
  })
  if (shape.extra && shape.extraA > 0.01) {
    let mx = -9
    let my = 9
    shape.pts.forEach((p) => {
      if (p[0] > mx) mx = p[0]
      if (p[1] < my) my = p[1]
    })
    const ex = Math.min(c + (mx * 0.75 + 0.1) * k, S * 0.86)
    const ey = Math.max(c + (my + 0.02) * k, S * 0.16)
    const t = o.time ?? 0
    const font = o.font ?? FALLBACK_FONT
    const a = Math.min(1, shape.extraA)
    ctx.globalAlpha = a
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (shape.extra === 'zzz') {
      for (let i = 0; i < 3; i++) {
        const f = (t * 0.35 + i / 3) % 1
        ctx.globalAlpha = a * Math.sin(f * Math.PI)
        ctx.font = `700 ${S * (0.07 + 0.06 * f)}px ${font}`
        ctx.fillText('z', ex + f * S * 0.1, ey - f * S * 0.16)
      }
    } else {
      ctx.font = `700 ${S * 0.2}px ${font}`
      ctx.fillText(shape.extra, ex, ey + Math.sin(t * 2.4) * S * 0.008)
    }
    ctx.globalAlpha = 1
  }
}

export function drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, L: BlobLogo, colour = '#000') {
  const h = size / 2
  const P = logoPts(L).map((p): Pt => [cx + p[0] * h, cy + p[1] * h])
  ctx.strokeStyle = ctx.fillStyle = colour
  ctx.lineWidth = Math.max(1, L.weight * size)
  ctx.lineJoin = ctx.lineCap = 'round'
  outline(ctx, P)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx + L.dx * h, cy + L.dy * h, Math.max(0.8, L.dot * h), 0, TAU)
  ctx.fill()
}
