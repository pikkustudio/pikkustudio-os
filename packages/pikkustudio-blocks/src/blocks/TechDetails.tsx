import { asI18n, type I18nString } from '@pikku/react'

export function TechDetails({ rows }: { rows: Array<[I18nString, string]> }) {
  return (
    <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-xl bg-secondary px-4 py-3">
      {rows.map(([label, value]) => (
        <div key={label + value} className="contents">
          <dt className="text-px14 text-ink-2">{label}</dt>
          <dd className="m-0 min-w-0">
            <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(value)}</code>
          </dd>
        </div>
      ))}
    </dl>
  )
}
