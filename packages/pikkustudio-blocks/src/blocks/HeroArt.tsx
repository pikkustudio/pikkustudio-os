import type { I18nNode } from '@pikku/react'
export type Art = 'arch' | 'bubbles' | 'bars' | 'laptop' | 'cloud' | 'window'

const screens: Partial<Record<Art, { x: number; y: number; w: number; h: number; r: number }>> = {
  laptop: { x: 98, y: 128, w: 214, h: 134, r: 10 },
  cloud: { x: 112, y: 92, w: 190, h: 119, r: 16 },
  window: { x: 82, y: 146, w: 236, h: 148, r: 10 },
}

function Shapes({ art }: { art: Art }) {
  if (art === 'arch')
    return (
      <>
        <circle cx="270" cy="150" r="98" className="fill-w5" />
        <circle cx="270" cy="150" r="116" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
        <path d="M130 400V300a110 110 0 0 1 220 0v100z" className="fill-w2" />
        <path d="M168 400V306a72 72 0 0 1 144 0v94z" className="fill-w1" />
        <circle cx="240" cy="330" r="9" className="fill-coral" />
      </>
    )
  if (art === 'laptop')
    return (
      <>
        <circle cx="205" cy="190" r="150" className="fill-w5" />
        <circle cx="205" cy="190" r="172" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
        <rect x="82" y="112" width="246" height="166" rx="20" className="fill-w2" />
        <rect x="98" y="128" width="214" height="134" rx="10" className="fill-w1" />
        <rect x="48" y="282" width="314" height="24" rx="12" className="fill-w6" />
        <rect x="166" y="282" width="78" height="9" rx="4.5" className="fill-w3" />
        <circle cx="352" cy="88" r="12" className="fill-coral" />
      </>
    )
  if (art === 'cloud')
    return (
      <>
        <circle cx="262" cy="130" r="100" className="fill-w5" />
        <circle cx="262" cy="130" r="118" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
        <rect x="104" y="84" width="206" height="135" rx="22" className="fill-w6" opacity="0.95" />
        <circle cx="96" cy="318" r="34" className="fill-w3" />
        <circle cx="196" cy="304" r="50" className="fill-w3" />
        <circle cx="286" cy="316" r="36" className="fill-w3" />
        <rect x="62" y="316" width="264" height="44" rx="22" className="fill-w3" />
        <circle cx="344" cy="250" r="12" className="fill-coral" />
      </>
    )
  if (art === 'window')
    return (
      <>
        <circle cx="280" cy="120" r="100" className="fill-w5" />
        <circle cx="280" cy="120" r="118" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
        <rect x="62" y="96" width="276" height="220" rx="24" className="fill-w6" />
        <circle cx="92" cy="121" r="7" className="fill-w3" />
        <circle cx="114" cy="121" r="7" className="fill-w3" />
        <circle cx="136" cy="121" r="7" className="fill-coral" />
        <rect x="160" y="113" width="150" height="16" rx="8" className="fill-w5" />
      </>
    )
  if (art === 'bubbles')
    return (
      <>
        <circle cx="240" cy="190" r="118" className="fill-w5" />
        <circle cx="130" cy="310" r="64" className="fill-w3" />
        <circle cx="130" cy="310" r="78" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
        <rect x="250" y="300" width="120" height="30" rx="15" className="fill-w6" />
        <rect x="250" y="342" width="80" height="30" rx="15" className="fill-w2" />
        <circle cx="352" cy="88" r="12" className="fill-coral" />
      </>
    )
  return (
    <>
      <rect x="70" y="80" width="260" height="56" rx="28" className="fill-w6" />
      <rect x="110" y="156" width="230" height="56" rx="28" className="fill-w5" />
      <rect x="70" y="232" width="190" height="56" rx="28" className="fill-w6" opacity="0.92" />
      <circle cx="330" cy="330" r="48" className="fill-coral" />
      <circle cx="330" cy="330" r="62" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
    </>
  )
}

export function HeroArt({ art, thumb }: { art: Art; thumb?: I18nNode }) {
  const t = screens[art]
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
      <circle cx="368" cy="48" r="248" className="fill-w1" />
      <circle cx="16" cy="408" r="231" className="fill-w2" />
      <circle cx="248" cy="440" r="160" className="fill-w3" opacity="0.55" />
      <Shapes art={art} />
      {thumb && t ? (
        <>
          <clipPath id="hero-thumb-clip">
            <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={t.r} />
          </clipPath>
          <g clipPath="url(#hero-thumb-clip)">
            <svg x={t.x} y={t.y} width={t.w} height={t.h} viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
              {thumb}
            </svg>
          </g>
        </>
      ) : null}
    </svg>
  )
}
