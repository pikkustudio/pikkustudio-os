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

const who = (name: string) => {
  if (name === 'admin') return 'Studio'
  if (name.startsWith('project:')) return `Project ${name.slice('project:'.length)}`
  return name
}

const did = (event: ActivityEvent) => {
  const refused = event.outcome !== 'success'
  switch (event.action) {
    case 'secret.read':
      return refused ? 'was refused' : 'used'
    case 'secret.write':
      return refused ? 'could not save' : 'saved'
    case 'secret.delete':
      return 'removed'
    case 'token.mint':
      return 'was given access for'
    default:
      return event.action
  }
}

const ago = (iso: string) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return new Date(iso).toLocaleDateString()
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
                <b>{who(event.who)}</b> {did(event)} {event.key ? <b>{event.key}</b> : null}
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
