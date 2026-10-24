import type { I18nNode, I18nString } from '@pikku/react'

export function WayIn({ icon, title, body, action }: { icon: I18nNode; title: I18nString; body: I18nString; action: I18nNode }) {
  return (
    <div className="grid grid-cols-way items-center gap-5 rounded-empty border bg-card px-7 py-6.5 shadow-card transition-all duration-240 ease-spring hover:-translate-y-0.5 hover:border-input hover:shadow-lift">
      <span className="grid size-14 place-items-center rounded-xl bg-indigo text-white [&_svg]:size-7">{icon}</span>
      <div>
        <h3 className="mb-1 text-px22 font-bold text-balance">{title}</h3>
        <p className="max-w-ch56 text-px16 text-pretty text-ink-2">{body}</p>
      </div>
      <div className="flex items-center gap-2">{action}</div>
    </div>
  )
}
