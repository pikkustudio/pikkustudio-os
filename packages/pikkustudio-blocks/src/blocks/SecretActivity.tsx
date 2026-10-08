import { asI18n, sep, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Badge } from '../ui/badge'

export interface ActivityEvent {
  at: string
  who: string
  action: string
  key: string | null
  outcome: string
}

const who = (name: string): I18nString => {
  if (name === 'admin') return m.secret_activity__studio()
  if (name.startsWith('project:')) return m.secret_activity__project({ name: name.slice('project:'.length) })
  return asI18n(name)
}

const did = (event: ActivityEvent): I18nString => {
  const refused = event.outcome !== 'success'
  switch (event.action) {
    case 'secret.read':
      return refused ? m.secret_activity__refused() : m.secret_activity__used()
    case 'secret.write':
      return refused ? m.secret_activity__could_not_save() : m.secret_activity__saved()
    case 'secret.delete':
      return m.secret_activity__removed()
    case 'token.mint':
      return m.secret_activity__given_access()
    default:
      return asI18n(event.action)
  }
}

const ago = (iso: string): I18nString => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return m.secret_activity__just_now()
  if (seconds < 3600) return m.secret_activity__min_ago({ n: Math.floor(seconds / 60) })
  if (seconds < 86400) return m.secret_activity__h_ago({ n: Math.floor(seconds / 3600) })
  const date = new Date(iso).toLocaleDateString()
  return asI18n(date)
}

export function SecretActivity({ events, intact }: { events: ActivityEvent[]; intact: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {intact ? (
        <Badge variant="pillOk" className="mb-1 self-start">
          <ShieldCheck />
          
          {m.secret_activity__this_record_has_not()}
        </Badge>
      ) : (
        <Badge variant="pillBad" className="mb-1 self-start">
          <ShieldAlert />
          
          {m.secret_activity__this_record_has_been()}
        </Badge>
      )}
      {events.length === 0 ? (
        <p className="text-px15 text-muted-foreground">{m.secret_activity__nothing_yet_each_time()}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {events.map((event, i) => (
            <li key={`${event.at}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-border bg-card px-3.5 py-2.5 text-[15px] shadow-card">
              <span className="min-w-0 flex-1">
                <b>{who(event.who)}</b>{sep(' ')}{did(event)}{sep(' ')}{event.key ? <b>{asI18n(event.key)}</b> : null}
              </span>
              <time dateTime={event.at} className="text-px14 text-muted-foreground">
                {ago(event.at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
