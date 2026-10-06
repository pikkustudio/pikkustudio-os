import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Cloud, FolderOpen, Laptop, LogOut, ShieldCheck, User, type LucideIcon } from 'lucide-react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { keep } from '../lib/links'
import { useAccount } from '../lib/onboarding'
import { useProjectSlug } from '../lib/project'
import { useSignOut } from '../lib/onboarding'

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
}: {
  icon: LucideIcon
  scope: string
  scopeNote: string
  name: string
  note: string
  expanded: boolean
  onOpen: () => void
  onAccount: () => void
}) {
  return (
    <>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onOpen}
        className={`flex items-center gap-2.5 rounded-[14px] border border-border px-3 py-2.5 text-left transition-colors duration-140 hover:border-input hover:bg-secondary ${expanded ? 'border-input bg-secondary' : ''}`}
      >
        <Icon className="size-5 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[14px] leading-[1.3] font-bold">{scope}</b>
          <small className="block text-[13px] leading-[1.3] text-muted-foreground">{scopeNote}</small>
        </span>
      </button>
      {name ? (
        <button type="button" onClick={onAccount} className="flex items-center gap-2.5 rounded-[14px] bg-secondary p-2.5 text-left transition-colors duration-140 hover:bg-accent">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo text-[14px] font-bold text-white">{initials(name)}</span>
          <div className="min-w-0">
            <b className="block truncate text-[14px] leading-[1.3]">{name}</b>
            <small className="block truncate text-[13px] leading-[1.3] text-muted-foreground">{note}</small>
          </div>
        </button>
      ) : null}
    </>
  )
}

export function LocalShellAccount({ expanded, onOpen, onAccount }: { expanded: boolean; onOpen: () => void; onAccount: () => void }) {
  const name = useAccount().data?.name ?? ''
  return (
    <ShellAccountView
      icon={Laptop}
      scope={m.shell__scope_pc()}
      scopeNote={m.shell__scope_pc_note()}
      name={name}
      note={m.shell__workspace()}
      expanded={expanded}
      onOpen={onOpen}
      onAccount={onAccount}
    />
  )
}

// The account panel. Where the work lives and who sees it differ by edition (a slot);
// the projects list and the rows themselves are shared.

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <h3 className="text-[18px] font-bold tracking-[-0.012em] text-balance">{title}</h3>
      {children}
    </section>
  )
}

export function PanelRow({ icon, title, text }: { icon: ReactNode; title: ReactNode; text: ReactNode }) {
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

export type WorkspaceAboutProps = { pikku: ReactNode }

export function LocalWorkspaceAbout({ pikku }: WorkspaceAboutProps) {
  return (
    <>
      <PanelSection title="Where it runs">
        <PanelRow icon={<Laptop className="size-5" />} title="This computer" text="Your work is stored here and works without the internet. It is not backed up anywhere else." />
      </PanelSection>
      <PanelSection title="Who can see what">
        <PanelRow icon={<User className="size-5" />} title="You" text="Everything, and you can change any of it." />
        <PanelRow icon={<ShieldCheck className="size-5" />} title="Nobody else" text="Not your team and not Fabric, unless you choose to share something." />
        {pikku}
      </PanelSection>
    </>
  )
}

type ListedProject = { key: string; slug: string; owner?: string; name: string; location: string }

export function WorkspaceProjects() {
  const current = useProjectSlug()
  const projects = usePikkuQuery('studio:listProjects', {}, {
    select: (d: { projects: ListedProject[] }) => d.projects.filter((p) => p.slug),
  } as never) as unknown as UseQueryResult<ListedProject[]>
  const items = projects.data ?? []
  return (
    <PanelSection title="Projects">
      {items.length ? (
        <ul className="flex flex-col gap-1">
          {items.map((p) => {
            const slug = p.slug
            return (
              <li key={p.key}>
                <Link
                  {...keep}
                  to="/overview"
                  search={((s: object) => ({ ...s, project: slug, panel: undefined })) as never}
                  aria-current={slug === current ? 'page' : undefined}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] font-semibold no-underline transition-colors duration-140 hover:bg-secondary aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                >
                  <FolderOpen className="size-4.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
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

export function LocalAccountName() {
  return <>{useAccount().data?.name ?? ''}</>
}

export function SignOutSection() {
  const signOut = useSignOut()
  return (
    <section className="flex flex-col gap-3.5">
      <button
        type="button"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate({})}
        className="flex items-center gap-3.5 rounded-lg text-left transition-colors duration-140 hover:bg-secondary disabled:opacity-60"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
          <LogOut className="size-5" />
        </span>
        <b className="text-[16px]">Sign out</b>
      </button>
    </section>
  )
}
