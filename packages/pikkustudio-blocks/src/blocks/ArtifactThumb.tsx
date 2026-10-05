type Shape = { x: number; y: number; w: number; h: number; fill: string; rx?: number }

const ink = 'fill-[#0E1F24]'
const line = 'fill-[#D5E2E6]'
const white = 'fill-white'
const coral = 'fill-[#FF6F61]'
const yellow = 'fill-[#FFC83D]'
const teal = 'fill-[#00767E]'
const petrol = 'fill-[#0C4F66]'
const sea = 'fill-[#0A6B5B]'
const blue = 'fill-[#2F6BDB]'
const tileColors = [coral, yellow, teal, petrol, sea, blue]
const field = `${white} stroke-[#70888F]`

function chrome(): Shape[] {
  return [
    { x: 0, y: 0, w: 320, h: 26, fill: 'fill-[#F6FAFB]' },
    { x: 0, y: 26, w: 320, h: 1, fill: line },
    { x: 34, y: 11, w: 46, h: 4, fill: ink, rx: 2 },
    ...[0, 1, 2].map((i) => ({ x: 260 - i * 44, y: 11, w: 34, h: 4, fill: 'fill-[#8AA6AF]', rx: 2 })),
  ]
}

function tiles(y: number, count: number, ch: number): Shape[] {
  const cw = 260 / 3
  const out: Shape[] = []
  for (let i = 0; i < count; i++) {
    const cx = 20 + (i % 3) * (cw + 10)
    const cy = y + Math.floor(i / 3) * (ch + 24)
    out.push({ x: cx, y: cy, w: cw, h: ch, fill: tileColors[i % 6], rx: 6 }, { x: cx, y: cy + ch + 4, w: cw * 0.8, h: 4, fill: ink, rx: 2 }, { x: cx, y: cy + ch + 11, w: cw * 0.5, h: 3, fill: line, rx: 2 })
  }
  return out
}

const button = (x: number, y: number, w: number, fill = teal): Shape[] => [
  { x, y, w, h: 18, fill, rx: 9 },
  { x: x + w * 0.3, y: y + 7, w: w * 0.4, h: 4, fill: white, rx: 2 },
]
const input = (y: number, w: number): Shape[] => [
  { x: 20, y, w, h: 16, fill: field, rx: 5 },
  { x: 26, y: y + 6, w: w * 0.35, h: 4, fill: line, rx: 2 },
]

const sketches: Record<'home' | 'classes' | 'book', Shape[]> = {
  home: [
    ...chrome(),
    { x: 20, y: 38, w: 280, h: 70, fill: yellow, rx: 12 },
    { x: 32, y: 52, w: 140, h: 9, fill: ink, rx: 3 },
    { x: 32, y: 66, w: 98, h: 4, fill: 'fill-[#7A5200]', rx: 2 },
    ...button(32, 84, 70, coral),
    ...tiles(126, 3, 30),
  ],
  classes: [...chrome(), { x: 20, y: 36, w: 112, h: 8, fill: ink, rx: 3 }, ...tiles(54, 6, 34)],
  book: [
    ...chrome(),
    { x: 20, y: 36, w: 140, h: 8, fill: ink, rx: 3 },
    ...input(60, 280),
    ...input(82, 280),
    ...input(104, 168),
    ...button(20, 136, 90),
  ],
}

export function ArtifactThumb({ kind, label }: { kind: 'home' | 'classes' | 'book'; label: string }) {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={label} className="block size-full">
      <rect width="320" height="200" className={white} />
      {sketches[kind].map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} className={s.fill} />
      ))}
      <circle cx="24" cy="13" r="5" className={coral} />
    </svg>
  )
}

export function ArtifactDocThumb() {
  return (
    <div className="flex h-[84%] w-[62%] flex-col gap-2 rounded-lg border border-input bg-card p-3.5 shadow-card">
      <i className="block h-2.5 w-[55%] rounded-sm bg-muted-foreground" />
      <i className="block h-1.75 rounded-sm bg-input" />
      <i className="block h-1.75 rounded-sm bg-input" />
      <i className="block h-1.75 w-[80%] rounded-sm bg-input" />
      <i className="block h-1.75 w-[65%] rounded-sm bg-input" />
    </div>
  )
}
