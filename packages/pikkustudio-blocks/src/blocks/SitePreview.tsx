import { m } from '@/i18n/messages'
import { createContext, useContext, type CSSProperties, type ElementType, type MouseEvent, type ReactNode } from 'react'
import { cn } from '../lib/utils'
import type { Device, Kind, Mode, Styles, Translations } from '../types/designTypes'

export type SiteContent = {
  classes: { key: string; name: string; when: string; price: string }[]
  staff: { cls: string; day: string; people: number }[]
}

type Ctx = { mode: Mode; comp: Partial<Record<Kind, Styles>>; own: Record<string, Styles>; sel: string | null; tr: Translations }
const SiteCtx = createContext<Ctx>(null as never)

const edge = 'border-[color-mix(in_srgb,var(--s-ink)_12%,transparent)]'
const soft = 'border-[color-mix(in_srgb,var(--s-ink)_14%,transparent)]'

function El({ as: Tag = 'div', kind, name, id, i18n, plain, className, style, children }: { as?: ElementType; kind: Kind; name: string; id: string; i18n?: string; plain?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const { mode, comp, own, sel, tr } = useContext(SiteCtx)
  const pick = mode === 'element' || mode === 'component' || mode === 'chat'
  const on = sel === id
  const mark = pick
    ? on
      ? 'outline-3 outline-solid outline-offset-3 outline-[#2F6BDB]'
      : 'cursor-pointer hover:outline-2 hover:outline-dashed hover:outline-offset-3 hover:outline-(--s-acc)'
    : mode === 'translations' && i18n
      ? cn('cursor-text outline-offset-2 outline-[#2F6BDB]', on ? 'outline-3 outline-solid' : 'outline-2 outline-dashed')
      : ''
  return (
    <Tag data-el={kind} data-name={name} data-id={id} data-i18n={i18n} className={cn(mark, className)} style={{ ...(plain ? {} : comp[kind]), ...own[id], ...style }}>
      {i18n ? tr[i18n].en : children}
    </Tag>
  )
}

const heading = 'm-0 font-(family-name:--s-hf) font-extrabold text-balance tracking-[-0.015em]'
const h1 = `${heading} text-[46px] leading-[1.1] group-data-[device=phone]/wrap:text-[34px]`
const h2 = `${heading} text-[28px] leading-[1.1]`
const h3 = `${heading} text-[20px] leading-[1.1]`
const button =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-(--s-r) border-0 border-(--s-acc) bg-(--s-acc) px-6 py-3 text-[16px] font-bold text-(--s-on)'
const buttonAlt = 'border-2 border-[color-mix(in_srgb,var(--s-ink)_35%,transparent)] bg-transparent text-(--s-ink)'
const buttonSm = 'px-4.5 py-2.25 text-px15'
const navLink = 'm-0 text-px15 font-semibold group-data-[device=phone]/wrap:hidden'

function Logo({ children }: { children: string }) {
  return (
    <span className="mr-auto flex items-center gap-2 font-(family-name:--s-hf) text-[22px] font-extrabold">
      <i className="block size-5.5 rounded-full bg-(--s-acc) shadow-[8px_4px_0_-2px_var(--s-sup)]" />
      {children}
    </span>
  )
}

function Header({ children, name }: { children?: ReactNode; name: string }) {
  return (
    <header className={cn('flex items-center gap-5.5 border-b px-7 py-4', edge)}>
      <Logo>{name}</Logo>
      {children}
    </header>
  )
}

function ClassGrid({ content, id }: { content: SiteContent; id: string }) {
  return (
    <div className="grid grid-cols-[repeat(3,1fr)] gap-4 group-data-[device=phone]/wrap:grid-cols-1 group-data-[device=tablet]/wrap:grid-cols-2">
      {content.classes.map((c, i) => (
        <El key={c.key} kind="card" id={`${id}-card-${i}`} name={`Class card: ${c.name}`} className={cn('flex flex-col gap-2.5 rounded-[calc(var(--s-r)*1.2)] border bg-(--s-bg) p-4.5 [box-shadow:var(--s-sh)]', soft)}>
          <span className="inline-block self-start rounded-full bg-(--s-sup) px-2.5 py-0.75 text-px13 font-extrabold text-[#1E2328]">{c.price}</span>
          <El as="h3" kind="heading" id={`${id}-title-${i}`} name={`Class title: ${c.name}`} i18n={c.key} className={h3} />
          <div className="text-px14 opacity-75">{c.when}</div>
          <El as="button" kind="button" id={`${id}-book-${i}`} name="Button: Book a class" i18n="home.book" className={cn(button, buttonSm, 'mt-1 self-start')} />
        </El>
      ))}
    </div>
  )
}

export function SitePreview({
  device,
  page,
  vars,
  heroColor,
  mode,
  comp,
  own,
  sel,
  tr,
  content,
  reloadKey,
  onPick,
}: {
  device: Device
  page: string
  vars: CSSProperties
  heroColor?: string
  mode: Mode
  comp: Partial<Record<Kind, Styles>>
  own: Record<string, Styles>
  sel: string | null
  tr: Translations
  content: SiteContent
  reloadKey: number
  onPick: (node: HTMLElement) => void
}) {
  const click = (e: MouseEvent) => {
    e.preventDefault()
    const node = (e.target as HTMLElement).closest<HTMLElement>('[data-el]')
    if (!node || mode === 'theme' || mode === 'none') return
    if (mode === 'translations' && !node.dataset.i18n) return
    onPick(node)
  }
  const show = (p: string) => (page === p ? 'block' : 'hidden')
  return (
    <SiteCtx.Provider value={{ mode, comp, own, sel, tr }}>
      <div className="relative flex items-start justify-center overflow-auto rounded-card bg-surface-3 p-4.5">
        <div data-device={device === 'computer' ? undefined : device} className="group/wrap w-full max-w-full self-start transition-[max-width] duration-420 ease-[cubic-bezier(.16,1,.3,1)] data-[device=phone]:max-w-97.5 data-[device=tablet]:max-w-192">
          <div
            key={reloadKey}
            id="site"
            onClick={click}
            style={vars}
            className="animate-in overflow-hidden rounded-2xl bg-(--s-bg) font-(family-name:--s-bf) text-(--s-ink) shadow-lift duration-400 fade-in-30"
          >
            <div className={show('home')}>
              <Header name="Sunrise Bakery">
                <El as="a" kind="text" id="home-m1" name="Menu link: Classes" i18n="menu.classes" className={navLink} />
                <El as="a" kind="text" id="home-m2" name="Menu link: About us" i18n="menu.about" className={navLink} />
                <El as="a" kind="text" id="home-m3" name="Menu link: Contact" i18n="menu.contact" className={navLink} />
              </Header>
              <div style={heroColor ? { color: heroColor } : undefined} className="grid min-h-95 grid-cols-[1.2fr_0.8fr] group-data-open/shell:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] items-center gap-6 overflow-hidden rounded-[30px] px-7 py-12 [background:var(--s-hero)] group-data-[device=phone]/wrap:grid-cols-1">
                <div>
                  <El as="h1" kind="heading" id="home-h1" name="Main heading" i18n="home.title" className={h1} />
                  <El as="p" kind="text" id="home-intro" name="Introduction" i18n="home.intro" className="mt-3.5 mb-6 max-w-[46ch] text-[18px] opacity-90" />
                  <div className="flex flex-wrap items-center gap-3 py-3.5">
                    <El as="button" kind="button" id="home-b1" name="Button: Book a class" i18n="home.book" className={button} />
                    <El as="button" kind="button" id="home-b2" name="Button: See all classes" i18n="home.see" className={cn(button, buttonAlt)} />
                  </div>
                </div>
                <div className="relative h-50 overflow-hidden rounded-[calc(var(--s-r)*1.4)] bg-(--s-acc) group-data-[device=phone]/wrap:h-30">
                  <span className="absolute -top-7.5 -right-7.5 size-37.5 rounded-full bg-(--s-sup)" />
                  <span className="absolute bottom-[-40px] left-7.5 size-30 rounded-full bg-[color-mix(in_srgb,var(--s-bg)_80%,transparent)]" />
                </div>
              </div>
              <section className="flex flex-col gap-5 px-7 py-9">
                <El as="h2" kind="heading" id="home-h2" name="Section heading" i18n="menu.classes" className={h2} />
                <ClassGrid content={content} id="home" />
              </section>
              <El as="footer" kind="text" plain id="home-foot" name="Footer" i18n="footer.address" className={cn('border-t px-7 py-5.5 text-px14 opacity-80', edge)} />
            </div>
            <div className={show('classes')}>
              <Header name="Sunrise Bakery">
                <El as="a" kind="text" id="cl-m1" name="Menu link: Classes" i18n="menu.classes" className={navLink} />
              </Header>
              <section className="flex flex-col gap-5 px-7 py-9">
                <El as="h2" kind="heading" id="cl-h2" name="Page heading" i18n="menu.classes" className={h2} />
                <ClassGrid content={content} id="cl" />
              </section>
            </div>
            <div className={show('booking')}>
              <Header name="Sunrise Bakery" />
              <div className="flex max-w-130 flex-col gap-3.5 px-7 py-9">
                <El as="h2" kind="heading" id="bk-h2" name="Page heading" className={h2}>
                  
                  {m.site_preview__book_sourdough_basics()}
                </El>
                <input placeholder={m.site_preview__your_name()} aria-label={m.site_preview__your_name()} className="rounded-(--s-r) border-[1.5px] border-[color-mix(in_srgb,var(--s-ink)_30%,transparent)] bg-(--s-bg) px-3.5 py-3 text-(--s-ink)" />
                <input placeholder={m.site_preview__pick_a_day()} aria-label={m.site_preview__pick_a_day()} className="rounded-(--s-r) border-[1.5px] border-[color-mix(in_srgb,var(--s-ink)_30%,transparent)] bg-(--s-bg) px-3.5 py-3 text-(--s-ink)" />
                <El as="button" kind="button" id="bk-pay" name="Button: Pay and book" i18n="book.pay" className={button} />
              </div>
            </div>
            <div className={show('staff')}>
              <Header name="Sunrise Bakery staff">
                <El as="a" kind="text" id="st-m1" name="Menu link" className={navLink}>
                  
                  {m.site_preview__bookings()}
                </El>
              </Header>
              <section className="flex flex-col gap-5 px-7 py-9">
                <El as="h2" kind="heading" id="st-h2" name="Page heading" className={h2}>
                  
                  {m.site_preview__this_week_s_bookings()}
                </El>
                <El kind="card" id="st-card" name="Bookings card" className={cn('flex flex-col gap-2.5 rounded-[calc(var(--s-r)*1.2)] border bg-(--s-bg) p-4.5 [box-shadow:var(--s-sh)]', soft)}>
                  <table className="w-full border-collapse text-px15">
                    <tbody>
                      <tr>
                        {['Class', 'Day', 'People'].map((h) => (
                          <th key={h} className={cn('border-b px-3 py-2.5 text-left font-bold', edge)}>
                            {h}
                          </th>
                        ))}
                      </tr>
                      {content.staff.map((r) => (
                        <tr key={r.cls}>
                          <td className={cn('border-b px-3 py-2.5 text-left', edge)}>{r.cls}</td>
                          <td className={cn('border-b px-3 py-2.5 text-left', edge)}>{r.day}</td>
                          <td className={cn('border-b px-3 py-2.5 text-left', edge)}>{r.people}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <El as="button" kind="button" id="st-export" name="Button: Export list" className={cn(button, buttonSm, 'mt-1 self-start')}>
                    
                    {m.site_preview__export_list()}
                  </El>
                </El>
              </section>
            </div>
          </div>
        </div>
      </div>
    </SiteCtx.Provider>
  )
}
