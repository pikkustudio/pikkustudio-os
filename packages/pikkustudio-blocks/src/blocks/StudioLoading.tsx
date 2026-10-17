import { m } from '@/i18n/messages'
import { PikkuMark } from './PikkuMark'

export function StudioLoading() {
  return (
    <div role="status" aria-busy="true" className="grid h-dvh w-full place-items-center bg-background px-4" data-testid="studio-loading">
      <div className="flex flex-col items-center gap-4 text-center">
        <PikkuMark className="size-14 shrink-0 animate-pulse" />
        <p className="text-[17px] font-semibold text-ink-2">{m.studio_loading__label()}</p>
      </div>
    </div>
  )
}
