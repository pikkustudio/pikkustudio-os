export type Art = 'arch' | 'bubbles' | 'bars'

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

export function HeroArt({ art }: { art: Art }) {
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
      <circle cx="368" cy="48" r="248" className="fill-w1" />
      <circle cx="16" cy="408" r="231" className="fill-w2" />
      <circle cx="248" cy="440" r="160" className="fill-w3" opacity="0.55" />
      <Shapes art={art} />
    </svg>
  )
}
