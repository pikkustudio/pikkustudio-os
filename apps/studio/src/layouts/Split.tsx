import type { I18nNode } from '@pikku/react'

export function Split({ main, side }: { main: I18nNode; side: I18nNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">{main}</div>
      <div className="flex min-w-0 flex-col gap-4">{side}</div>
    </div>
  )
}
