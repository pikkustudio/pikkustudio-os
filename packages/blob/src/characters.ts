import { N, TAU, normalise, resample, resolvePose, type BlobEye, type BlobPose, type Pt } from './core'

// x, y, size against the blob's own eye, and whether it is an open ring.
type Eye = [x: number, y: number, size?: number, ring?: boolean]
type Drawing = { label: string; pts: Pt[]; eyes: [Eye, Eye] }

const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 14): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]
  })

const rr = (x0: number, y0: number, x1: number, y1: number, r: number): Pt[] => [
  ...arc(x1 - r, y0 + r, r, r, -Math.PI / 2, 0, 6),
  ...arc(x1 - r, y1 - r, r, r, 0, Math.PI / 2, 6),
  ...arc(x0 + r, y1 - r, r, r, Math.PI / 2, Math.PI, 6),
  ...arc(x0 + r, y0 + r, r, r, Math.PI, Math.PI * 1.5, 6),
]

const rotate = (p: Pt[], deg: number): Pt[] => {
  const c = Math.cos((deg * Math.PI) / 180)
  const s = Math.sin((deg * Math.PI) / 180)
  return p.map(([x, y]) => [x * c - y * s, x * s + y * c])
}
const rotEye = (e: Eye, deg: number): Eye => [...rotate([[e[0], e[1]]], deg)[0], e[2], e[3]]

type Sdf = (x: number, y: number) => number
const circ = (cx: number, cy: number, r: number): Sdf => (x, y) => Math.hypot(x - cx, y - cy) - r
const box = (cx: number, cy: number, hx: number, hy: number, r = 0): Sdf => (x, y) => {
  const qx = Math.abs(x - cx) - hx + r
  const qy = Math.abs(y - cy) - hy + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}
const caps = (ax: number, ay: number, bx: number, by: number, r: number): Sdf => (x, y) => {
  const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - dx * t, py - dy * t) - r
}
const union = (...f: Sdf[]): Sdf => (x, y) => Math.min(...f.map((g) => g(x, y)))
const melt = (k: number, ...f: Sdf[]): Sdf => (x, y) =>
  f.map((g) => g(x, y)).reduce((a, b) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k
    return Math.min(a, b) - h * h * k * 0.25
  })

const fromSdf = (f: Sdf, ox = 0, oy = 0): Pt[] =>
  Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + (i / N) * TAU
    const dx = Math.cos(a), dy = Math.sin(a)
    let t = 0
    while (t < 3 && f(ox + dx * t, oy + dy * t) <= 0) t += 0.004
    return [ox + dx * t, oy + dy * t]
  })

const polar = (f: (a: number) => number): Pt[] =>
  Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + (i / N) * TAU
    return [Math.cos(a) * f(a), Math.sin(a) * f(a)]
  })

const star = (n: number, outer: number, inner: number): Pt[] =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i / (n * 2)) * TAU
    const r = i % 2 ? inner : outer
    return [Math.cos(a) * r, Math.sin(a) * r]
  })

const bust = (cx: number, cy: number, s: number) => union(circ(cx, cy - 0.38 * s, 0.4 * s), box(cx, cy + 0.42 * s, 0.82 * s, 0.4 * s, 0.38 * s))

// Every outline is one closed line; eyes are a pair, side by side, where a face would be.
const D: Record<string, Drawing> = {
  door: { label: 'a door', pts: [[-0.5, 0.95], [-0.5, -0.45], ...arc(0, -0.45, 0.5, 0.5, Math.PI, Math.PI * 2, 16), [0.5, 0.95]], eyes: [[-0.02, 0.1], [0.3, 0.1, 1.3, true]] },
  house: { label: 'a house', pts: [[-0.9, -0.05], [0, -0.9], [0.9, -0.05], [0.65, -0.05], [0.65, 0.85], [-0.65, 0.85], [-0.65, -0.05]], eyes: [[-0.18, 0.1], [0.18, 0.1]] },
  folder: { label: 'a folder', pts: [[-0.9, -0.6], [-0.35, -0.6], [-0.15, -0.4], [0.9, -0.4], [0.9, 0.7], [-0.9, 0.7]], eyes: [[-0.2, 0.05], [0.2, 0.05]] },
  stack: { label: 'stacked folders', pts: fromSdf(union(box(-0.2, -0.2, 0.65, 0.5, 0.18), box(0.2, 0.2, 0.65, 0.5, 0.18)), 0, 0), eyes: [[0, 0.15], [0.38, 0.15]] },
  mail: { label: 'an envelope', pts: [[-0.9, 0.55], [-0.9, -0.55], [0, 0.0], [0.9, -0.55], [0.9, 0.55]], eyes: [[-0.2, 0.28], [0.2, 0.28]] },
  inbox: { label: 'an inbox tray', pts: [[-0.9, 0.05], [-0.55, -0.7], [0.55, -0.7], [0.9, 0.05], [0.9, 0.7], [-0.9, 0.7]], eyes: [[-0.2, -0.15], [0.2, -0.15]] },
  bell: { label: 'a bell', pts: [...arc(0, -0.15, 0.6, 0.65, Math.PI, Math.PI * 2, 14), [0.62, 0.15], [0.9, 0.5], [0.22, 0.5], ...arc(0, 0.5, 0.22, 0.25, 0, Math.PI, 8), [-0.22, 0.5], [-0.9, 0.5], [-0.62, 0.15]], eyes: [[-0.2, -0.1], [0.2, -0.1]] },
  key: { label: 'a key', pts: [...arc(-0.45, 0, 0.5, 0.5, -0.32, -TAU + 0.32, 20), [0.4, 0.16], [0.4, 0.42], [0.62, 0.42], [0.62, 0.16], [0.9, 0.16], [0.9, -0.16], [0.02, -0.16]], eyes: [[-0.62, -0.05], [-0.3, -0.05]] },
  lock: { label: 'a padlock', pts: [[-0.7, 0.9], [-0.7, -0.1], [-0.4, -0.1], [-0.4, -0.4], ...arc(0, -0.4, 0.4, 0.5, Math.PI, Math.PI * 2, 12), [0.4, -0.1], [0.7, -0.1], [0.7, 0.9]], eyes: [[-0.2, 0.32], [0.16, 0.36, 1.9]] },
  shield: { label: 'a shield', pts: [[-0.85, -0.85], [-0.42, -0.8], [0, -0.9], [0.42, -0.8], [0.85, -0.85], [0.85, -0.2], ...arc(0, -0.2, 0.85, 1.15, 0, Math.PI / 2, 14).slice(1), ...arc(0, -0.2, 0.85, 1.15, Math.PI / 2, Math.PI, 14).slice(1, -1), [-0.85, -0.2]], eyes: [[-0.24, -0.32], [0.24, -0.32]] },
  cloud: { label: 'a cloud', pts: fromSdf(union(circ(-0.5, 0.2, 0.38), circ(-0.1, -0.1, 0.5), circ(0.42, 0.05, 0.4), box(0, 0.35, 0.8, 0.28, 0.28)), 0, 0.1), eyes: [[-0.2, 0.15], [0.18, 0.15]] },
  magnifier: { label: 'a magnifying glass', pts: fromSdf(union(circ(-0.2, -0.2, 0.62), caps(0.2, 0.2, 0.72, 0.72, 0.17)), -0.2, -0.2), eyes: [[-0.42, -0.22], [-0.05, -0.25, 1.7]] },
  doc: { label: 'a page', pts: [[-0.6, -0.9], [0.2, -0.9], [0.6, -0.5], [0.6, 0.9], [-0.6, 0.9]], eyes: [[-0.2, -0.05], [0.2, -0.05]] },
  receipt: { label: 'a receipt', pts: [[-0.65, -0.9], [0.65, -0.9], [0.65, 0.9], [0.43, 0.72], [0.22, 0.9], [0, 0.72], [-0.22, 0.9], [-0.43, 0.72], [-0.65, 0.9]], eyes: [[-0.2, -0.15], [0.2, -0.15]] },
  book: { label: 'an open book', pts: [[-0.95, -0.7], [-0.5, -0.78], [0, -0.6], [0.5, -0.78], [0.95, -0.7], [0.95, 0.6], [0.5, 0.68], [0, 0.5], [-0.5, 0.68], [-0.95, 0.6]], eyes: [[-0.2, -0.05], [0.2, -0.05]] },
  cylinder: { label: 'a database', pts: [...arc(0, -0.6, 0.7, 0.3, Math.PI, Math.PI * 2, 12), ...arc(0, 0.6, 0.7, 0.3, 0, Math.PI, 12)], eyes: [[-0.2, -0.05], [0.2, -0.05]] },
  bubble: {
    label: 'a speech bubble',
    pts: [...rr(-0.9, -0.75, 0.9, 0.3, 0.3).slice(0, 14), [-0.1, 0.3], [-0.45, 0.85], [-0.45, 0.3], ...rr(-0.9, -0.75, 0.9, 0.3, 0.3).slice(14)],
    eyes: [[-0.2, -0.25], [0.2, -0.25]],
  },
  bubbles: { label: 'two bubbles', pts: fromSdf(union(circ(-0.35, -0.2, 0.5), circ(0.4, 0.2, 0.5), caps(-0.5, 0.1, -0.7, 0.7, 0.1)), 0, 0), eyes: [[-0.5, -0.25], [-0.18, -0.25]] },
  sparkle: { label: 'a sparkle', pts: polar((a) => 0.32 + 0.64 * Math.pow(Math.abs(Math.cos(2 * a)), 2.4)), eyes: [[-0.1, -0.03, 0.8], [0.1, -0.03, 0.8]] },
  gear: { label: 'a gear', pts: polar((a) => 0.7 + 0.18 * Math.max(-1, Math.min(1, 2.5 * Math.cos(8 * a)))), eyes: [[-0.18, -0.05], [0.18, -0.05]] },
  cog: { label: 'a cog', pts: polar((a) => 0.72 + 0.18 * Math.max(-1, Math.min(1, 3 * Math.cos(6 * a)))), eyes: [[-0.18, -0.05], [0.18, -0.05]] },
  clock: { label: 'a stopwatch', pts: fromSdf(union(circ(0, 0.12, 0.74), box(0, -0.74, 0.16, 0.12, 0.05), box(0, -0.6, 0.07, 0.1), caps(0.5, -0.45, 0.64, -0.6, 0.08)), 0, 0.12), eyes: [[-0.2, 0.08], [0.2, 0.08]] },
  bars: { label: 'rising bars', pts: [[-0.9, 0.85], [-0.9, 0.2], [-0.45, 0.2], [-0.45, -0.15], [0, -0.15], [0, -0.5], [0.45, -0.5], [0.45, -0.9], [0.9, -0.9], [0.9, 0.85]], eyes: [[0.1, 0.25], [0.5, 0.1]] },
  gauge: { label: 'a speedometer', pts: [...arc(0, 0, 0.95, 0.95, Math.PI * 0.75, Math.PI * 2.25, 40), [0.3, 0.55], [0, 0.4], [-0.3, 0.55]], eyes: [[-0.25, -0.2], [0.25, -0.2, 1.5, true]] },
  rocket: { label: 'a rocket', pts: rotate([[0, -0.98], [0.22, -0.7], [0.32, -0.35], [0.32, 0.35], [0.72, 0.7], [0.72, 0.9], [0.3, 0.72], [0.18, 0.9], [-0.18, 0.9], [-0.3, 0.72], [-0.72, 0.9], [-0.72, 0.7], [-0.32, 0.35], [-0.32, -0.35], [-0.22, -0.7]], 30), eyes: [rotEye([-0.12, -0.2], 30), rotEye([0.14, -0.2], 30)] },
  play: { label: 'a play button', pts: [[-0.65, -0.85], [0.9, 0], [-0.65, 0.85]], eyes: [[-0.3, -0.05], [0.05, -0.05]] },
  card: { label: 'a card', pts: rr(-0.95, -0.6, 0.95, 0.6, 0.18), eyes: [[-0.2, -0.05], [0.2, -0.05]] },
  camera: { label: 'a camera', pts: [[-0.95, -0.45], [-0.42, -0.45], [-0.28, -0.72], [0.28, -0.72], [0.42, -0.45], [0.95, -0.45], [0.95, 0.72], [-0.95, 0.72]], eyes: [[-0.05, 0.14, 2.6, true], [0.62, -0.2, 0.8]] },
  badge: { label: 'a name badge', pts: fromSdf(union(box(0, 0.12, 0.9, 0.6, 0.16), box(0, -0.58, 0.22, 0.16, 0.06)), 0, 0.1), eyes: [[-0.2, 0.02], [0.2, 0.02]] },
  tag: { label: 'a price tag', pts: rotate([[-0.95, 0], [-0.5, -0.45], [0.9, -0.45], [0.9, 0.45], [-0.5, 0.45]], -25), eyes: [rotEye([-0.5, 0, 1.4, true], -25), rotEye([0.1, 0], -25)] },
  puzzle: { label: 'a puzzle piece', pts: fromSdf(union(box(-0.1, 0.1, 0.55, 0.55, 0.08), circ(-0.1, -0.55, 0.22), circ(0.5, 0.1, 0.22)), -0.1, 0.1), eyes: [[-0.3, 0.1], [0.08, 0.1]] },
  cube: { label: 'a cube', pts: [[0, -0.95], [0.8, -0.5], [0.8, 0.5], [0, 0.95], [-0.8, 0.5], [-0.8, -0.5]], eyes: [[-0.2, 0], [0.2, 0]] },
  brick: { label: 'a building block', pts: fromSdf(union(box(0, 0.2, 0.9, 0.5, 0.12), circ(-0.4, -0.42, 0.24), circ(0.4, -0.42, 0.24)), 0, 0.2), eyes: [[-0.2, 0.2], [0.2, 0.2]] },
  hammer: { label: 'a hammer', pts: rotate([[-0.8, -0.85], [0.75, -0.85], [0.75, -0.3], [0.2, -0.3], [0.2, 0.95], [-0.22, 0.95], [-0.22, -0.3], [-0.8, -0.3]], -25), eyes: [[-0.38, -0.48], [-0.05, -0.62]] },
  window: { label: 'a window', pts: rr(-0.95, -0.75, 0.95, 0.75, 0.2), eyes: [[-0.2, 0], [0.2, 0]] },
  squircle: { label: 'an app', pts: rr(-0.85, -0.85, 0.85, 0.85, 0.42), eyes: [[-0.2, -0.05], [0.2, -0.05]] },
  palette: { label: 'a paint palette', pts: polar((a) => 0.88 - 0.42 * Math.exp(-(((a - 0.9) / 0.3) ** 2)) + 0.04 * Math.sin(3 * a)), eyes: [[-0.35, -0.2], [0, -0.25]] },
  person: { label: 'a person', pts: fromSdf(bust(0, 0, 1), 0, 0), eyes: [[-0.14, -0.4], [0.14, -0.4]] },
  group: { label: 'a huddle', pts: fromSdf(melt(0.35, circ(-0.62, 0.22, 0.36), circ(0, -0.02, 0.56), circ(0.62, 0.22, 0.36)), 0, 0.05), eyes: [[-0.15, -0.1], [0.15, -0.1]] },
  robot: { label: 'a robot', pts: fromSdf(union(box(0, 0.1, 0.75, 0.6, 0.25), caps(0, -0.5, 0, -0.82, 0.08), circ(0, -0.86, 0.14)), 0, 0.1), eyes: [[-0.25, 0.05, 2, true], [0.25, 0.05, 2, true]] },
  flask: { label: 'a flask', pts: [[-0.25, -0.9], [0.25, -0.9], [0.25, -0.3], [0.8, 0.7], [0.7, 0.9], [-0.7, 0.9], [-0.8, 0.7], [-0.25, -0.3]], eyes: [[-0.2, 0.45], [0.2, 0.45]] },
  plug: { label: 'a plug', pts: fromSdf(union(box(0, 0.2, 0.5, 0.45, 0.22), box(-0.25, -0.45, 0.08, 0.35, 0.06), box(0.25, -0.45, 0.08, 0.35, 0.06), box(0, 0.8, 0.11, 0.25, 0.08)), 0, 0.2), eyes: [[-0.18, 0.15], [0.18, 0.15]] },
  switch: { label: 'a switch', pts: rr(-0.95, -0.45, 0.95, 0.45, 0.45), eyes: [[0.28, -0.03], [0.6, -0.03, 1.7, true]] },
  safe: { label: 'a safe', pts: [[-0.85, -0.85], [0.85, -0.85], [0.85, 0.7], [0.6, 0.7], [0.6, 0.9], [0.35, 0.9], [0.35, 0.7], [-0.35, 0.7], [-0.35, 0.9], [-0.6, 0.9], [-0.6, 0.7], [-0.85, 0.7]], eyes: [[-0.12, -0.08, 2.4, true], [0.45, -0.08, 0.8]] },
  keyhole: { label: 'a keyhole', pts: fromSdf(union(circ(0, -0.35, 0.5), box(0, 0.35, 0.3, 0.6, 0.08)), 0, -0.2), eyes: [[-0.18, -0.35], [0.18, -0.35]] },
  workflow: {
    label: 'a loop arrow',
    pts: [
      ...arc(0, 0.05, 0.85, 0.85, Math.PI * 0.72, Math.PI * 2.25, 40),
      [Math.cos(Math.PI * 2.25) * 1.08, 0.05 + Math.sin(Math.PI * 2.25) * 1.08],
      [Math.cos(Math.PI * 2.5) * 0.62, 0.05 + Math.sin(Math.PI * 2.5) * 0.62],
      [Math.cos(Math.PI * 2.25) * 0.18, 0.05 + Math.sin(Math.PI * 2.25) * 0.18],
      ...arc(0, 0.05, 0.42, 0.42, Math.PI * 2.25, Math.PI * 0.72, 30).slice(1),
      ...arc(Math.cos(Math.PI * 0.72) * 0.635, 0.05 + Math.sin(Math.PI * 0.72) * 0.635, 0.215, 0.215, Math.PI * 1.72, Math.PI * 0.72, 8).slice(1, -1),
    ],
    eyes: [[-0.13, -0.58], [0.13, -0.58]],
  },
  clipboard: { label: 'a clipboard', pts: [[-0.65, -0.8], [-0.25, -0.8], [-0.25, -0.95], [0.25, -0.95], [0.25, -0.8], [0.65, -0.8], [0.65, 0.9], [-0.65, 0.9]], eyes: [[-0.2, -0.15], [0.2, -0.15]] },
  star: { label: 'a star', pts: star(5, 0.98, 0.48), eyes: [[-0.13, -0.02], [0.13, -0.02]] },
  drop: { label: 'a sprout in a pot', pts: [[-0.45, 0.95], [0.45, 0.95], [0.6, 0.35], [0.08, 0.35], [0.08, -0.12], [0.35, -0.1], [0.62, -0.25], [0.82, -0.58], [0.5, -0.56], [0.25, -0.42], [0.08, -0.3], [0.08, -0.45], [-0.1, -0.72], [-0.48, -0.9], [-0.56, -0.6], [-0.36, -0.42], [-0.08, -0.36], [-0.08, 0.35], [-0.6, 0.35]], eyes: [[-0.2, 0.62], [0.2, 0.62]] },
  ticket: {
    label: 'a ticket',
    pts: [[-0.95, -0.55], [0.95, -0.55], [0.95, -0.2], ...arc(0.95, 0, 0.2, 0.2, -Math.PI / 2, -Math.PI * 1.5, 10), [0.95, 0.55], [-0.95, 0.55], [-0.95, 0.2], ...arc(-0.95, 0, 0.2, 0.2, Math.PI / 2, -Math.PI / 2, 10)],
    eyes: [[-0.2, -0.05], [0.2, -0.05]],
  },
  laptop: { label: 'a laptop', pts: [[-0.7, -0.75], [0.7, -0.75], [0.7, 0.35], [0.95, 0.35], [0.95, 0.7], [-0.95, 0.7], [-0.95, 0.35], [-0.7, 0.35]], eyes: [[-0.2, -0.2], [0.2, -0.2]] },
  frame: { label: 'a picture frame', pts: rr(-0.95, -0.7, 0.95, 0.7, 0.1), eyes: [[-0.2, 0], [0.2, 0]] },
  pencil: { label: 'a pencil', pts: rotate([[-0.98, 0], [-0.55, -0.32], [0.85, -0.32], [0.85, 0.32], [-0.55, 0.32]], -30), eyes: [rotEye([0.12, -0.02], -30), rotEye([0.45, -0.02], -30)] },
  bandage: { label: 'a plaster', pts: rotate(rr(-0.95, -0.38, 0.95, 0.38, 0.38), -25), eyes: [rotEye([-0.18, 0], -25), rotEye([0.18, 0], -25)] },
}

const PAGE: Record<string, string> = {
  'front-doors': 'door', 'sign-in': 'ticket', overview: 'house', project: 'folder', projects: 'stack', workspaces: 'brick', emails: 'mail', inbox: 'inbox',
  'incoming-alerts': 'bell', secrets: 'lock', 'secret-access': 'keyhole', 'project-secrets': 'safe', permissions: 'key', security: 'shield', domains: 'cloud',
  review: 'magnifier', 'review-ui': 'window', 'review-fixes': 'bandage', logs: 'receipt', audit: 'doc', knowledge: 'book', content: 'cylinder',
  assistants: 'bubble', translations: 'bubbles', ai: 'sparkle', 'choose-ai': 'sparkle', settings: 'gear', 'project-settings': 'gear', 'queues': 'cog',
  'scheduled-tasks': 'clock', metrics: 'bars', 'studio-metrics': 'bars', performance: 'gauge', publish: 'rocket', resume: 'play', billing: 'card', plans: 'tag', versions: 'camera',
  addons: 'puzzle', 'add-ons': 'puzzle', artifacts: 'cube', build: 'hammer', surface: 'window', apps: 'squircle', design: 'palette', account: 'person', accounts: 'person',
  'your-name': 'badge', team: 'group', 'virtual-users': 'robot', lab: 'flask', connections: 'plug', switches: 'switch', checks: 'clipboard', scorers: 'star',
  workflows: 'workflow', 'new-project': 'drop', code: 'laptop', mocks: 'frame', changes: 'pencil', explore: 'sparkle',
}

export const DRAWN_PAGES = Object.keys(PAGE)
export const drawingLabel = (key: string) => D[PAGE[key]]?.label

const inside = (p: Pt[], x: number, y: number) => {
  let c = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (p[i][1] > y !== p[j][1] > y && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c
  }
  return c
}

const fits = (p: Pt[], e: BlobEye, m: number) =>
  inside(p, e.x, e.y) &&
  Array.from({ length: 16 }, (_, i) => (i / 16) * TAU).every((a) => inside(p, e.x + Math.cos(a) * (e.w + m), e.y + Math.sin(a) * (e.h + m)))

// Eyes read as eyes only side by side: the pair is level-ish and a face's width apart.
function pair([a, b]: [BlobEye, BlobEye]): [BlobEye, BlobEye] {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
  const dx = b.x - a.x, dy = b.y - a.y
  const gap = Math.min(0.42 + a.w + b.w, Math.max(0.17 + a.w + b.w, Math.hypot(dx, dy)))
  const tilt = Math.max(-0.35, Math.min(0.35, Math.atan2(dy, Math.abs(dx) || 1e-6)))
  const ux = Math.cos(tilt) * (gap / 2), uy = Math.sin(tilt) * (gap / 2)
  return [
    { ...a, x: mx - ux, y: my - uy },
    { ...b, x: mx + ux, y: my + uy },
  ]
}

// Slides the pair, together, back inside the outline, as close to where it was drawn as it can.
function settle(p: Pt[], eyes: [BlobEye, BlobEye]): [BlobEye, BlobEye] {
  const ok = (e: [BlobEye, BlobEye]) => e.every((q) => fits(p, q, 0.05))
  if (ok(eyes)) return eyes
  for (let g = 1; g >= 0.7; g -= 0.1) {
    let best: [BlobEye, BlobEye] | null = null
    let bd = Infinity
    const [a, b] = eyes
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    for (let gx = -0.35; gx <= 0.35; gx += 0.015)
      for (let gy = -0.35; gy <= 0.35; gy += 0.015) {
        const d = Math.hypot(gx, gy)
        if (d >= bd) continue
        const q: [BlobEye, BlobEye] = [
          { ...a, x: mx + (a.x - mx) * g + gx, y: my + (a.y - my) * g + gy },
          { ...b, x: mx + (b.x - mx) * g + gx, y: my + (b.y - my) * g + gy },
        ]
        if (ok(q)) {
          bd = d
          best = q
        }
      }
    if (best) return best
  }
  return eyes
}

const chaikin = (p: Pt[], passes: number): Pt[] => {
  let q = p
  for (let k = 0; k < passes; k++)
    q = q.flatMap((a, i): Pt[] => {
      const b = q[(i + 1) % q.length]
      return [
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
      ]
    })
  return q
}

// The idle blob is about 1.2 across; a page shape sits a little larger so it reads, and keeps the blob's lean.
const SPAN = 1.5
const EYE = { w: 0.045, h: 0.068 }

export function drawnCharacter(key: string): BlobPose | null {
  const d = D[PAGE[key]]
  if (!d) return null
  const raw = resample(chaikin(d.pts, 1))
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  raw.forEach(([x, y]) => {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  })
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const f = SPAN / Math.max(x1 - x0, y1 - y0)
  const at = ([x, y]: Pt): Pt => {
    const a = Math.atan2(y - cy, x - cx)
    const w = 1 + 0.02 * Math.sin(3 * a + 1) + 0.015 * Math.cos(2 * a + 0.4)
    return [(x - cx) * f * w, (y - cy) * f * w]
  }
  const pts = normalise(raw.map(at))
  const eyes = settle(pts, pair(d.eyes.map(([x, y, size = 1, ring]) => {
    const [ex, ey] = at([x, y])
    return { x: ex, y: ey, w: EYE.w * size, h: EYE.h * (ring ? size * 0.66 : size), ring }
  }) as [BlobEye, BlobEye]))
  return { id: `char:${key}`, name: key, pts, eyes, extra: '' }
}

const MOOD: Record<string, string> = { 'not-found': 'lost' }

export const characterFor = (key: string): BlobPose => drawnCharacter(key) ?? (MOOD[key] ? resolvePose(MOOD[key]) : { ...resolvePose('blob'), id: `char:${key}` })
