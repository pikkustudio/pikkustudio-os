import type { ReactNode } from 'react'

export function HintNote({ children }: { children: ReactNode }) {
  return <p className="rounded-[12px] bg-accent px-3 py-2.5 text-[13.5px] leading-[1.4] font-semibold text-accent-foreground">{children}</p>
}
