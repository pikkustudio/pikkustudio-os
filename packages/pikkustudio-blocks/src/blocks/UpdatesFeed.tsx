import { asI18n, sep, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { History } from 'lucide-react'
import { Link } from './Link'
import { ErrorState } from './ErrorState'
import { keep } from '../lib/links'
import { ago } from '../lib/audit'
import { useUpdatesFeed, type UpdatesNote } from '../lib/updates'
import { groupByDay, type DayGroup, type FeedActor, type FeedItem, type Phrase } from '../lib/updates-feed'

const who = (actor: FeedActor): I18nString =>
  actor.kind === 'you' ? m.updates_feed__you() : actor.kind === 'app' ? m.updates_feed__your_app() : actor.kind === 'pikku' ? m.parts__pikku() : asI18n(actor.name)

const did: Record<Exclude<Phrase, 'unknown' | 'ai_own' | 'ai_fabric' | 'account_sign_in' | 'account_sign_out' | 'publish' | 'change_asked' | 'change_working' | 'change_needs_answer' | 'change_done'>, () => I18nString> = {
  secret_read: () => m.audit_screen__did_secret_read(),
  secret_write: () => m.audit_screen__did_secret_write(),
  secret_delete: () => m.audit_screen__did_secret_delete(),
  token_mint: () => m.audit_screen__did_token_mint(),
  create_user: () => m.audit_screen__did_create_user(),
  remove_user: () => m.audit_screen__did_remove_user(),
  ban_user: () => m.audit_screen__did_ban_user(),
  set_password: () => m.audit_screen__did_set_password(),
  sign_in_link: () => m.audit_screen__did_sign_in_link(),
  sign_out: () => m.audit_screen__did_sign_out(),
  switch: () => m.audit_screen__did_switch(),
  switch_reset: () => m.audit_screen__did_switch_reset(),
  group_create: () => m.audit_screen__did_group_create(),
  group_delete: () => m.audit_screen__did_group_delete(),
  group_change: () => m.audit_screen__did_group_change(),
  group_add: () => m.audit_screen__did_group_add(),
  group_remove: () => m.audit_screen__did_group_remove(),
  connection_set: () => m.audit_screen__did_connection_set(),
  connection_delete: () => m.audit_screen__did_connection_delete(),
}

export const sentence = (item: FeedItem): I18nString => {
  const by = who(item.actor)
  const name = item.subject ? asI18n(item.subject) : null
  switch (item.phrase) {
    case 'secret_read':
      if (name) return m.updates_feed__secret_read({ who: by, name })
      break
    case 'secret_write':
      if (name) return m.updates_feed__secret_write({ who: by, name })
      break
    case 'secret_delete':
      if (name) return m.updates_feed__secret_delete({ who: by, name })
      break
    case 'ai_own':
      return m.updates_feed__ai_own({ who: by })
    case 'ai_fabric':
      return m.updates_feed__ai_fabric({ who: by })
    case 'account_sign_in':
      return m.updates_feed__sign_in({ who: by })
    case 'account_sign_out':
      return m.updates_feed__sign_out({ who: by })
    case 'publish':
      return m.updates_feed__publish({ who: by })
    case 'change_asked':
      return m.updates_feed__change_asked({ who: by, name: name ?? m.updates_feed__a_change() })
    case 'change_working':
      return m.updates_feed__change_working({ who: by, name: name ?? m.updates_feed__a_change() })
    case 'change_needs_answer':
      return m.updates_feed__change_needs_answer({ who: by, name: name ?? m.updates_feed__a_change() })
    case 'change_done':
      return m.updates_feed__change_done({ who: by, name: name ?? m.updates_feed__a_change() })
    case 'unknown':
      return name ? m.updates_feed__changed_in({ name }) : m.updates_feed__changed()
  }
  return m.audit_screen__line({ who: by, did: did[item.phrase as keyof typeof did]() })
}

const heading: Record<DayGroup, () => I18nString> = {
  today: () => m.audit_screen__today(),
  yesterday: () => m.audit_screen__yesterday(),
  earlier: () => m.audit_screen__earlier(),
}

const noteText: Record<Exclude<UpdatesNote, null>, () => I18nString> = {
  unreadable: () => m.updates_feed__note_unreadable(),
  'not-running': () => m.updates_feed__note_not_running(),
  'no-addon': () => m.updates_feed__note_no_addon(),
  forbidden: () => m.updates_feed__note_forbidden(),
  other: () => m.updates_feed__note_unreadable(),
}

const HistoryLink = () => (
  <Link {...keep} to="/audit" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent-foreground underline-offset-2 hover:underline">
    <History className="size-4" />
    {m.updates_feed__open_history()}
  </Link>
)

export function UpdatesFeed({ projectKey }: { projectKey: string }) {
  const { items, note, failure, loading, now } = useUpdatesFeed(projectKey)

  if (loading && items.length === 0) {
    return (
      <div role="status" aria-busy="true" aria-label={m.onboarding_layout__loading_updates()} className="flex flex-col gap-2">
        <div className="h-5 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-secondary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="updates-feed">
      {failure ? <ErrorState error={failure.error} what={m.updates_feed__what_failed()} onRetry={() => failure.refetch()} retrying={failure.isFetching} /> : null}
      {note ? (
        <div className="flex flex-col items-start gap-1.5 text-[15px] text-ink-2" data-testid="updates-note">
          <p className="text-pretty">{noteText[note]()}</p>
          <HistoryLink />
        </div>
      ) : null}
      {items.length === 0 && !note && !failure ? <p className="text-[15px] text-muted-foreground">{m.updates_feed__nothing_yet()}</p> : null}
      {groupByDay(items, now).map(([day, list]) => (
        <section key={day} aria-label={heading[day]()} className="flex flex-col gap-1.5">
          <h4 className="text-[13px] font-bold text-muted-foreground">{heading[day]()}</h4>
          <ol className="ms-1.5 flex flex-col border-s-2 border-border">
            {list.map((item) => {
              const outcome = item.outcome === 'bad' ? m.audit_screen__did_not_work() : item.outcome === 'warn' && !item.phrase.startsWith('change_') ? m.audit_screen__not_allowed() : null
              return (
                <li key={item.id} className="relative flex flex-col gap-0.5 pb-3 ps-4.5 text-[15px] text-foreground">
                  <span className="absolute top-1.5 -start-1.75 size-3 rounded-full border-2 border-input bg-card" />
                  <span className="text-pretty">{sentence(item)}</span>
                  <span className="text-[13px] text-muted-foreground">
                    <time dateTime={item.at}>{ago(item.at, now)}</time>
                    {outcome ? <>{sep(' · ')}{outcome}</> : null}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      {items.length > 0 && projectKey ? <HistoryLink /> : null}
    </div>
  )
}
