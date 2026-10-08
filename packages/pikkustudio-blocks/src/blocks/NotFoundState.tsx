import type { ReactNode } from 'react'
import { m } from '@/i18n/messages'
import { StateScreen } from './StateScreen'

function Art() {
  return (
    <>
      <circle cx="240" cy="30" r="110" className="fill-w1" />
      <circle cx="40" cy="185" r="95" className="fill-w2" />
      <circle cx="175" cy="135" r="52" className="fill-w3" />
      <circle cx="274" cy="172" r="8" className="fill-coral" />
      <path d="M96 92a10 10 0 0 1 10-10h26l10 12h46a10 10 0 0 1 10 10v50a10 10 0 0 1-10 10h-82a10 10 0 0 1-10-10z" className="fill-w6" opacity="0.92" />
      <circle cx="184" cy="132" r="24" className="fill-w2" />
      <circle cx="184" cy="132" r="24" fill="none" className="stroke-w6" strokeWidth="8" />
      <path d="M202 150l22 22" className="stroke-w6" strokeWidth="9" strokeLinecap="round" />
    </>
  )
}

export function NotFoundState({ what, text, children }: { what: string; text?: string; children?: ReactNode }) {
  return (
    <StateScreen label={m.not_found__title({ what })} hue="petrol" art={<Art />} title={m.not_found__title({ what })} why={text ?? m.not_found__text()}>
      {children ? <div className="mt-1 flex flex-wrap items-center gap-3">{children}</div> : null}
    </StateScreen>
  )
}
