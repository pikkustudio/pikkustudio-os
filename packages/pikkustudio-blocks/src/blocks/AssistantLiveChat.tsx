import { asI18n, type I18nString } from '@pikku/react'
import { useContext, useMemo, useRef, useState, type ComponentProps } from 'react'
import { AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useAuiState } from '@assistant-ui/react'
import { PikkuApprovalContext, resolvePikkuToolStatus, usePikkuAgentRuntime, usePikkuApproval } from '@pikku/assistant-ui'
import { ArrowRight, Check, CircleAlert, Wrench } from 'lucide-react'
import { m } from '@/i18n/messages'
import { ProjectAgentApiCtx } from '../lib/chat'
import { Button } from '../ui/button'
import { AiSpinner } from './Spinner'
import { ChatMarkdown } from './ChatMarkdown'
import { PikkuDot } from './PikkuDot'

type Answer = 'ask' | 'working' | 'done' | 'declined'

function AskNote({ title, detail, state, yes, onYes, onNo }: { title: I18nString; detail?: string; state: Answer; yes: I18nString; onYes: () => void; onNo: () => void }) {
  const open = state === 'ask'
  return (
    <div role="group" aria-label={title} className={`flex flex-col gap-2.5 rounded-[16px] border-[1.5px] bg-card px-4 py-3 text-[15px] ${open ? 'border-warning' : 'border-border'}`}>
      <span className="flex items-start gap-2.5">
        {open ? <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning-foreground" aria-hidden="true" /> : <Check className="mt-0.5 size-5 shrink-0 text-ink-2" aria-hidden="true" />}
        <span className="min-w-0">
          <b className="block">{title}</b>
          {detail ? <span className="block break-words text-ink-2">{asI18n(detail)}</span> : null}
          {!open ? <span className="block text-ink-2">{state === 'declined' ? m.assistant_drawer__left_alone() : state === 'working' ? m.assistant_drawer__working_on_it() : m.assistant_drawer__done()}</span> : null}
        </span>
      </span>
      {open ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="default" size="compact" onClick={onYes}>
            {yes}
          </Button>
          <Button type="button" variant="ghost" size="compactTight" onClick={onNo}>
            {m.assistant_drawer__not_now()}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

const waitForPopup = (url: string) =>
  new Promise<boolean>((done) => {
    const popup = window.open(url, 'oauth-connect', 'width=600,height=700')
    if (!popup) return done(false)
    const timer = setInterval(() => popup.closed && (clearInterval(timer), done(true)), 500)
  })

type ToolProps = { toolCallId: string; toolName: string; result?: unknown; status: { type: string }; addResult?: (result: unknown) => void }

function ToolPart({ root, ...p }: ToolProps & { root: string }) {
  const status = resolvePikkuToolStatus(p.status, p.result)
  const { pendingApprovals, handleApproval } = usePikkuApproval()
  const [state, setState] = useState<Answer>('ask')
  const pending = pendingApprovals.find((x) => x.toolCallId === p.toolCallId)
  const link = (url?: string) => (url ? (url.startsWith('/') ? `${root}${url}` : url) : undefined)

  if (status.type === 'running')
    return (
      <p className="flex items-center gap-2 self-start text-[14px] font-semibold text-ink-2">
        <Wrench className="size-4" aria-hidden="true" />
        {m.assistant_drawer__looked_something_up()}
      </p>
    )

  if (status.type === 'missing-credential') {
    const url = link(status.payload.connectUrl) ?? `${root}/credentials/${status.payload.credentialName}/connect`
    return (
      <AskNote title={m.assistant_drawer__needs_connecting()} state={state} yes={m.assistant_drawer__connect()} onYes={() => void waitForPopup(url)} onNo={() => setState('declined')} />
    )
  }

  if (status.type !== 'requires-action') return null

  const credential = pending?.type === 'credential-request'
  const answer = async (approved: boolean) => {
    if (approved && credential) {
      const url = link(pending?.connectUrl)
      if (url && !(await waitForPopup(url))) return
    }
    setState(approved ? 'working' : 'declined')
    if (await handleApproval(p.toolCallId, approved)) p.addResult?.({ approved })
    if (approved) setState('done')
  }
  return (
    <AskNote
      title={credential ? m.assistant_drawer__needs_connecting() : m.assistant_drawer__wants_ok()}
      detail={credential ? undefined : pending?.reason}
      state={state}
      yes={credential ? m.assistant_drawer__connect() : m.assistant_drawer__approve()}
      onYes={() => void answer(true)}
      onNo={() => void answer(false)}
    />
  )
}

const bubbleMe = 'max-w-[88%] self-end rounded-[20px] rounded-se-md bg-accent px-4 py-2.5 text-[16px] leading-[1.45] text-foreground'

function UserMessage() {
  return (
    <div className={bubbleMe}>
      <MessagePrimitive.Content components={{ Text: ({ text }) => <>{asI18n(text)}</> }} />
    </div>
  )
}

function AssistantMessage({ root, name, hue, onFix }: { root: string; name: I18nString; hue: string; onFix: (text: I18nString) => void }) {
  const status = useAuiState((s) => s.message.status)
  const failed = status?.type === 'incomplete' && status.reason === 'error'
  return (
    <div data-hue={hue} className="flex max-w-[88%] flex-col gap-2 self-start rounded-[20px] rounded-ss-md bg-hero px-4 py-2.5 text-[16px] leading-[1.45] text-hero-ink">
      <MessagePrimitive.Content
        components={{
          Text: ({ text }) => <ChatMarkdown>{text}</ChatMarkdown>,
          tools: { Fallback: (props) => <ToolPart root={root} toolCallId={props.toolCallId} toolName={props.toolName} result={props.result} status={props.status} addResult={props.addResult as ToolProps['addResult']} /> },
        }}
      />
      {failed ? (
        <div role="alert" className="flex flex-col gap-2 rounded-[14px] bg-card px-3 py-2.5 text-[15px] text-foreground">
          <span className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning-foreground" aria-hidden="true" />
            {m.assistant_drawer__something_got_in_the_way()}
          </span>
          <Button type="button" variant="bordered" size="compact" className="self-start" onClick={() => onFix(m.assistant_drawer__fix_stuck({ name }))}>
            <PikkuDot />
            {m.assistant_drawer__fix_it()}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function AssistantLiveChat({ agentId, name, hue, hello, projectKey, onFix }: { agentId: string; name: I18nString; hue: string; hello: I18nString; projectKey: string; onFix: (text: I18nString) => void }) {
  const api = useContext(ProjectAgentApiCtx)(projectKey)
  const root = api.replace(/\/rpc\/agent$/, '')
  const thread = useRef(`try-${Math.random().toString(36).slice(2)}`)
  const { runtime, pendingApprovals, handleApproval } = usePikkuAgentRuntime({ api, agentName: agentId, threadId: thread.current, resourceId: 'studio-try', credentials: 'include' })
  const approval = useMemo(() => ({ pendingApprovals, handleApproval }), [pendingApprovals, handleApproval])
  const components = useMemo(
    () => ({ UserMessage, AssistantMessage: () => <AssistantMessage root={root} name={name} hue={hue} onFix={onFix} /> }),
    [root, name, hue, onFix],
  )

  return (
    <AssistantRuntimeProvider runtime={runtime as unknown as ComponentProps<typeof AssistantRuntimeProvider>['runtime']}>
      <PikkuApprovalContext.Provider value={approval}>
        <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
          <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-5" role="log" aria-label={m.assistant_drawer__chat_label({ name })}>
            <ThreadPrimitive.Empty>
              <div data-hue={hue} className="max-w-[88%] self-start rounded-[20px] rounded-ss-md bg-hero px-4 py-2.5 text-[16px] leading-[1.45] text-hero-ink">
                {hello.startsWith('Zzz') ? m.assistant_drawer__opening_sleepy() : m.assistant_drawer__opening({ hello })}
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages components={components} />
            <ThreadPrimitive.If running>
              <div className="flex items-center gap-2 self-start text-[15px] text-muted-foreground" role="status">
                <AiSpinner />
                {m.assistant_drawer__is_thinking({ name })}
              </div>
            </ThreadPrimitive.If>
          </ThreadPrimitive.Viewport>
          <ComposerPrimitive.Root className="flex items-end gap-2 border-t border-border px-5 pt-3.5 pb-4.5">
            <ComposerPrimitive.Input
              rows={1}
              aria-label={m.assistant_drawer__message_label({ name })}
              placeholder={m.assistant_drawer__write_as_a_visitor()}
              className="min-h-12 flex-1 resize-none rounded-full border-[1.5px] border-input bg-background px-4.5 py-3 text-[16px] text-foreground focus:border-primary focus:ring-4 focus:ring-accent focus:outline-none"
            />
            <ComposerPrimitive.Send aria-label={m.assistant_drawer__send()} className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
              <ArrowRight className="rtl:-scale-x-100 size-5.5" />
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </PikkuApprovalContext.Provider>
    </AssistantRuntimeProvider>
  )
}
