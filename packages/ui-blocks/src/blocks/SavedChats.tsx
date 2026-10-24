import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { ArrowLeft, Lock, MessageSquare } from 'lucide-react'
import { m } from '@/i18n/messages'
import { getLocale } from '@/paraglide/runtime.js'
import { useSavedChat, useSavedChats } from '../lib/builder-chat'
import { FullTranscript } from './FullTranscript'
import { AiSpinner } from './Spinner'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { RowCard, RowStack } from './RowCard'

const when = (at: number): I18nString => asI18n(new Date(at).toLocaleString(getLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))

const bar = 'flex items-center gap-3 border-b border-border bg-secondary px-6 py-3 text-[14px] text-ink-2'
const back = 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 font-bold text-accent-foreground hover:bg-surface-3'

export function SavedChats({ projectKey, openId, onOpen, onClose, avatar }: { avatar: I18nNode; projectKey: string; openId: string | null; onOpen: (id: string | null) => void; onClose: () => void }) {
  const list = useSavedChats(projectKey, !openId)
  const chat = useSavedChat(projectKey, openId)

  if (openId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={bar}>
          <button type="button" onClick={() => onOpen(null)} className={back}>
            <ArrowLeft className="rtl:-scale-x-100 size-4.5" />
            {m.builder_chat__back_to_saved()}
          </button>
          <b className="min-w-0 flex-1 truncate text-foreground">{chat.data ? asI18n(chat.data.title) || m.builder_chat__untitled() : ''}</b>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4.5 overflow-auto px-6 py-5" tabIndex={0} aria-label={m.shell_layout__chat()} role="log">
          {chat.isError ? <ErrorState error={chat.error} onRetry={() => void chat.refetch()} retrying={chat.isFetching} /> : null}
          {chat.isPending && !chat.isError ? (
            <p className="flex items-center gap-2 text-[14px] text-muted-foreground" role="status">
              <AiSpinner />
              {m.builder_chat__saved_loading()}
            </p>
          ) : null}
          {chat.data ? <FullTranscript items={chat.data.items} busy={false} avatar={avatar} /> : null}
        </div>
        <p className="flex items-center gap-2 border-t border-border bg-card px-6 py-4 text-[14px] text-ink-2">
          <Lock className="size-4.5 shrink-0" />
          {m.builder_chat__read_only()}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={bar}>
        <button type="button" onClick={onClose} className={back}>
          <ArrowLeft className="rtl:-scale-x-100 size-4.5" />
          {m.builder_chat__back_to_chat()}
        </button>
        <b className="min-w-0 flex-1 truncate text-foreground">{m.builder_chat__saved_title()}</b>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-5">
        {list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} retrying={list.isFetching} /> : null}
        {list.isPending && !list.isError ? (
          <p className="flex items-center gap-2 text-[14px] text-muted-foreground" role="status">
            <AiSpinner />
            {m.builder_chat__saved_loading()}
          </p>
        ) : null}
        {list.data && !list.data.chats.length ? <EmptyState icon={MessageSquare} title={m.builder_chat__saved_empty_title()} text={m.builder_chat__saved_empty_text()} /> : null}
        {list.data?.chats.length ? (
          <>
            <RowStack>
              {list.data.chats.map((c) => (
                <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="cursor-pointer rounded-card text-start focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none">
                  <RowCard tile={<MessageSquare className="size-5" />} title={asI18n(c.title) || m.builder_chat__untitled()} caption={when(c.at)} />
                </button>
              ))}
            </RowStack>
            <p className="text-[14px] text-muted-foreground">{m.builder_chat__saved_in_project()}</p>
          </>
        ) : null}
      </div>
    </div>
  )
}
