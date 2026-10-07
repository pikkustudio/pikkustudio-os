export type ProjectLook = 'bakery' | 'kiln' | 'garden' | 'dog'

const looks: Record<ProjectLook, { bg: string; shapes: Array<{ cx: number; cy: number; r: number; fill: string }>; bars: string }> = {
  bakery: {
    bg: 'fill-[#FFD98A]',
    bars: 'fill-[#8A4B12]',
    shapes: [
      { cx: 250, cy: 40, r: 90, fill: 'fill-[#FFB347]' },
      { cx: 60, cy: 190, r: 80, fill: 'fill-[#F28B50]' },
      { cx: 160, cy: 110, r: 38, fill: 'fill-[#FFF1CF]' },
    ],
  },
  kiln: {
    bg: 'fill-[#F4C7B5]',
    bars: 'fill-[#7A2E1B]',
    shapes: [
      { cx: 70, cy: 30, r: 85, fill: 'fill-[#E8896B]' },
      { cx: 270, cy: 180, r: 90, fill: 'fill-[#C9573A]' },
      { cx: 170, cy: 120, r: 34, fill: 'fill-[#FBE3D8]' },
    ],
  },
  garden: {
    bg: 'fill-[#BFE3C0]',
    bars: 'fill-[#14532D]',
    shapes: [
      { cx: 260, cy: 150, r: 95, fill: 'fill-[#6FBF7B]' },
      { cx: 50, cy: 30, r: 70, fill: 'fill-[#9AD6A0]' },
      { cx: 160, cy: 105, r: 34, fill: 'fill-[#F7E27A]' },
    ],
  },
  dog: {
    bg: 'fill-[#C9D6F5]',
    bars: 'fill-[#233A7A]',
    shapes: [
      { cx: 240, cy: 40, r: 85, fill: 'fill-[#8FA9E8]' },
      { cx: 60, cy: 180, r: 80, fill: 'fill-[#A7B9EE]' },
      { cx: 160, cy: 110, r: 32, fill: 'fill-[#EEF2FD]' },
    ],
  },
}

export function ProjectThumbShapes({ look }: { look: ProjectLook }) {
  const l = looks[look]
  return (
    <>
      <rect width="320" height="200" className={l.bg} />
      {l.shapes.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} className={s.fill} />
      ))}
      <rect x="28" y="30" width="96" height="9" rx="4.5" className={l.bars} opacity="0.75" />
      <rect x="28" y="46" width="60" height="5" rx="2.5" className={l.bars} opacity="0.4" />
      <circle cx="60" cy="150" r="22" fill="none" className="stroke-white" strokeWidth="3" strokeDasharray="3 9" strokeLinecap="round" />
    </>
  )
}

export function ProjectThumb({ look, label }: { look: ProjectLook; label: string }) {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={label} className="block size-full" preserveAspectRatio="xMidYMid slice">
      <ProjectThumbShapes look={look} />
    </svg>
  )
}
