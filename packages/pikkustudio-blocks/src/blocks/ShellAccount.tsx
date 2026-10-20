import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { Link } from './Link'
import { Cloud, FolderOpen, Laptop, LogOut, ShieldCheck, User, Users, type LucideIcon } from 'lucide-react'
import { m } from '@/i18n/messages'
import { keep } from '../lib/links'
import { useProjectSlug } from '../lib/project'
import { useTeamProjects } from './TeamProjects'
import { useSignOut } from '../lib/onboarding'
import { useCopy } from '../lib/copy'
import { useCurrentTeam, useShellAccount } from '../lib/account'
import { LOCAL_TEAM, useTeamSlug } from '../lib/team'

// The foot of the shell rail: where the work lives (opens the workspace panel), then who is signed in.

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

export function ShellAccountView({
  icon: Icon,
  scope,
  scopeNote,
  name,
  note,
  expanded,
  onOpen,
  onAccount,
  collapsed,
  tile,
}: {
  icon: LucideIcon
  scope: I18nString
  scopeNote: I18nString
  name?: I18nString
  note: I18nString
  expanded: boolean
  onOpen: () => void
  onAccount: () => void
  collapsed?: boolean
  tile?: string
}) {
  const letters = name ? initials(name) : undefined
  const initial = letters ? asI18n(letters) : undefined
  if (collapsed)
    return (
      <>
        <button type="button" aria-expanded={expanded} onClick={onOpen} title={scope} aria-label={scope} className={`mx-auto grid size-10 place-items-center rounded-lg transition-colors duration-140 hover:bg-secondary ${expanded ? 'bg-secondary' : ''}`}>
          {tile ? <span className="grid size-8 place-items-center rounded-lg bg-primary text-[14px] font-bold text-primary-foreground">{asI18n(initials(tile))}</span> : <Icon className="size-5.5" />}
        </button>
        {name ? (
          <button type="button" onClick={onAccount} title={name} aria-label={name} className="mx-auto grid size-9 place-items-center rounded-full bg-indigo text-[13px] font-bold text-white">{initial}</button>
        ) : null}
      </>
    )
  return (
    <>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onOpen}
        className={`flex items-center gap-2.5 rounded-[14px] border border-border px-3 py-2.5 text-start transition-colors duration-140 hover:border-input hover:bg-secondary ${expanded ? 'border-input bg-secondary' : ''}`}
      >
        <Icon className="size-5 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[14px] leading-[1.3] font-bold">{scope}</b>
          <small className="block text-[13px] leading-[1.3] text-muted-foreground">{scopeNote}</small>
        </span>
      </button>
      {name ? (
        <button type="button" onClick={onAccount} className="flex items-center gap-2.5 rounded-[14px] bg-secondary p-2.5 text-start transition-colors duration-140 hover:bg-accent">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo text-[14px] font-bold text-white">{initial}</span>
          <div className="min-w-0">
            <b className="block truncate text-[14px] leading-[1.3]">{name}</b>
            <small className="block truncate text-[13px] leading-[1.3] text-muted-foreground">{note}</small>
          </div>
        </button>
      ) : null}
    </>
  )
}

type ShellAccountProps = { expanded: boolean; onOpen: () => void; onAccount: () => void; collapsed?: boolean }

// studio:account answers who is signed in. Without a signed-in user the work is on this computer; with one, the rail's
// foot names the team the work belongs to and the account.
export function ShellAccount({ expanded, onOpen, onAccount, collapsed }: ShellAccountProps) {
  const account = useShellAccount().data
  const team = useCurrentTeam()
  const local = useTeamSlug() === LOCAL_TEAM
  const user = account?.user
  const accountName = user?.name || account?.name
  const name = accountName ? asI18n(accountName) : undefined
  if (!user)
    return (
      <ShellAccountView icon={Laptop} scope={m.shell__scope_pc()} scopeNote={m.shell__scope_pc_note()} name={name} note={m.shell__workspace()} expanded={expanded} onOpen={onOpen} onAccount={onAccount} collapsed={collapsed} />
    )
  return (
    <ShellAccountView
      icon={local ? Laptop : Users}
      scope={local ? m.shell__scope_pc() : team ? asI18n(team.name) : m.shell__scope_team()}
      scopeNote={local ? m.shell__scope_pc_note() : team?.personal ? m.shell__scope_personal_note() : m.shell__scope_team_note()}
      name={name}
      note={user.email ? asI18n(user.email) : m.shell__workspace()}
      expanded={expanded}
      onOpen={onOpen}
      onAccount={onAccount}
      collapsed={collapsed}
      tile={!local && team && !team.personal ? team.name : undefined}
    />
  )
}

// The account panel. Where the work lives and who sees it differ by edition (a slot);
// the projects list and the rows themselves are shared.

export function PanelSection({ title, children }: { title: I18nString; children: I18nNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <h3 className="text-[18px] font-bold tracking-[-0.012em] text-balance">{title}</h3>
      {children}
    </section>
  )
}

export function PanelRow({ icon, title, text }: { icon: I18nNode; title: I18nNode; text: I18nNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">{icon}</span>
      <div className="min-w-0">
        <b className="block text-[16px]">{title}</b>
        <p className="text-[15px] text-ink-2 text-pretty">{text}</p>
      </div>
    </div>
  )
}

export type WorkspaceAboutProps = { pikku: I18nNode }

export function LocalWorkspaceAbout({ pikku }: WorkspaceAboutProps) {
  const copy = useCopy()
  return (
    <>
      <PanelSection title={m.shell_account__where_it_runs()}>
        <PanelRow icon={<Laptop className="size-5" />} title={m.shell_account__this_computer()} text={m.shell_account__your_work_is_stored_here()} />
      </PanelSection>
      <PanelSection title={m.shell_account__who_can_see_what()}>
        <PanelRow icon={<User className="size-5" />} title={m.content_tree__you()} text={m.shell_account__everything_and_you_can_change()} />
        <PanelRow icon={<ShieldCheck className="size-5" />} title={m.shell_account__nobody_else()} text={copy.nobodyElseText()} />
        {pikku}
      </PanelSection>
    </>
  )
}

export function WorkspaceProjects() {
  const current = useProjectSlug()
  const projects = useTeamProjects()
  const items = (projects.data ?? []).filter((p) => p.slug)
  return (
    <PanelSection title={m.shell_account__projects()}>
      {items.length ? (
        <ul className="flex flex-col gap-1">
          {items.map((p) => {
            const slug = p.slug
            const projectName = asI18n(p.name)
            return (
              <li key={p.key}>
                <Link
                  {...keep}
                  to="/home"
                  search={((s: object) => ({ ...s, project: slug, panel: undefined })) as never}
                  aria-current={slug === current ? 'page' : undefined}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] font-semibold no-underline transition-colors duration-140 hover:bg-secondary aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                >
                  <FolderOpen className="size-4.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{projectName}</span>
                  {p.location === 'local' ? null : <Cloud className="size-4 shrink-0 text-muted-foreground" />}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-[15px] text-ink-2">{m.shell__recent_empty()}</p>
      )}
      <Link {...keep} to="/projects" search={((s: object) => ({ ...s, panel: undefined })) as never} className="text-[15px] font-semibold text-accent-foreground">
        {m.shell__projects()}
      </Link>
    </PanelSection>
  )
}

export function AccountName() {
  const account = useShellAccount().data
  return <>{account?.user?.name || account?.name || ''}</>
}

export function SignOutSection() {
  const signOut = useSignOut()
  return (
    <section className="flex flex-col gap-3.5">
      <button
        type="button"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate({})}
        className="flex items-center gap-3.5 rounded-lg text-start transition-colors duration-140 hover:bg-secondary disabled:opacity-60"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
          <LogOut className="rtl:-scale-x-100 size-5" />
        </span>
        <b className="text-[16px]">{m.shell_account__sign_out()}</b>
      </button>
    </section>
  )
}
