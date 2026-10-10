import { Compass } from 'lucide-react'
import { useState } from 'react'
import { SetupColumn } from '../blocks/SetupsCompare'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { SidePanel } from '../blocks/SidePanel'
import { Button } from '../ui/button'
import { addToWishlist, createChangeset, idea, rowLabels, setups, toChangesetDraft, toWishlistEntry, type RowKey, type Setup } from '../mocks/setups'
import { toast } from '../lib/toast'
import { m } from '@/i18n/messages'

export function ExploreSetupsScreen() {
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [picked, setPicked] = useState<Setup | null>(null)
  const [busy, setBusy] = useState(false)

  const wish = async (s: Setup, row: RowKey) => {
    await addToWishlist(toWishlistEntry(s, row))
    setSaved((p) => new Set(p).add(`${s.id}:${row}`))
    toast(m.explore_setups_screen__saved_to_your_wishlist_from({ name: s.name }))
  }

  const confirm = async () => {
    if (!picked) return
    setBusy(true)
    await createChangeset(toChangesetDraft(picked))
    setBusy(false)
    toast(m.explore_setups_screen__change_ready({ title: toChangesetDraft(picked).title }))
    setPicked(null)
  }

  return (
    <Page gap="tight">
      <PageHead crumb={m.explore_hub__explore()} title={m.explore_setups_screen__title()} text={m.explore_setups_screen__text({ idea: idea.text, who: idea.who })} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {setups.map((s) => (
          <SetupColumn key={s.id} setup={s} saved={saved} onWish={(r) => wish(s, r)} onDo={() => setPicked(s)} />
        ))}
      </div>
      {picked ? (
        <SidePanel icon={Compass} label={m.explore_setups_screen__set_up_as({ name: picked.name })} title={m.explore_setups_screen__set_up_as({ name: picked.name })} sub={m.explore_setups_screen__this_creates_one_change_with()} onClose={() => setPicked(null)}>
          <ul className="flex flex-col gap-2">
            {(Object.keys(rowLabels) as RowKey[]).map((r) => (
              <li key={r} className="rounded-card border border-border bg-card px-3.5 py-3 shadow-card">
                <b className="block text-[15px]">{rowLabels[r].label}</b>
                <small className="text-[14px] text-ink-2">{rowLabels[r].hint}</small>
              </li>
            ))}
          </ul>
          <div className="flex gap-2.5">
            <Button size="page" onClick={confirm} disabled={busy}>{m.explore_setups_screen__create_the_change()}</Button>
            <Button variant="bordered" size="page" onClick={() => setPicked(null)}>{m.shell_layout__not_now()}</Button>
          </div>
        </SidePanel>
      ) : null}
    </Page>
  )
}
