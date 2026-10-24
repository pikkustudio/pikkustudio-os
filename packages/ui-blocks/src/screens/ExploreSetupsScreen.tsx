import { Compass } from 'lucide-react'
import { useState } from 'react'
import type { I18nString } from '@pikku/react'
import { usePikkuMutationStub, usePikkuQueryStub } from '@project/functions-sdk/pikku/api.gen'
import { rowLabels, SetupColumn, type RowKey, type Setup } from '../blocks/SetupsCompare'
import { AskPikku } from '../blocks/AskPikku'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { EmptyState } from '../blocks/EmptyState'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { SidePanel } from '../blocks/SidePanel'
import { Button } from '../ui/button'
import { toast } from '../lib/toast'
import { m } from '@/i18n/messages'

type Setups = { idea: { text: I18nString; who: I18nString }; setups: Setup[] }

const rows: RowKey[] = ['money', 'start', 'auto', 'screens']
const toWishlistEntry = (s: Setup, part: RowKey) => ({ kind: 'knowledge', tags: ['wishlist'], sourceSetup: s.id, part, title: m.explore_setups_screen__wishlist_title({ name: s.name, part: rowLabels()[part].label }) })
const toChangesetDraft = (s: Setup) => ({ title: m.explore_setups_screen__change_title({ name: s.name }), setup: s.id, parts: rows })

export function ExploreSetupsScreen() {
  const query = usePikkuQueryStub('studio:listSetups', { featureFlag: 'exploreSetups' })
  const wishlist = usePikkuMutationStub('studio:addToWishlist', { featureFlag: 'exploreSetups' })
  const changeset = usePikkuMutationStub('studio:createChangeset', { featureFlag: 'exploreSetups' })
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [picked, setPicked] = useState<Setup | null>(null)

  const wish = async (s: Setup, row: RowKey) => {
    await wishlist.mutateAsync(toWishlistEntry(s, row))
    setSaved((p) => new Set(p).add(`${s.id}:${row}`))
    toast(m.explore_setups_screen__saved_to_your_wishlist_from({ name: s.name }))
  }

  const confirm = async () => {
    if (!picked) return
    const draft = toChangesetDraft(picked)
    await changeset.mutateAsync(draft)
    toast(m.explore_setups_screen__change_ready({ title: draft.title }))
    setPicked(null)
  }

  return (
    <QueryState
      query={query as never}
      skeleton={<CardsSkeleton count={3} />}
      empty={(data: Setups) =>
        data.setups.length ? null : (
          <EmptyState layout="row" icon={Compass} title={m.explore_setups_screen__none_title()} text={m.explore_setups_screen__none_text()}>
            <AskPikku size="page" label={m.explore_setups_screen__none_action()} prompt={m.explore_setups_screen__none_say()} />
          </EmptyState>
        )
      }
    >
      {({ idea, setups }: Setups) => (
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
                {rows.map((r) => (
                  <li key={r} className="rounded-card border border-border bg-card px-3.5 py-3 shadow-card">
                    <b className="block text-[15px]">{rowLabels()[r].label}</b>
                    <small className="text-[14px] text-ink-2">{rowLabels()[r].hint}</small>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2.5">
                <Button size="page" onClick={confirm} disabled={changeset.isPending}>{m.explore_setups_screen__create_the_change()}</Button>
                <Button variant="bordered" size="page" onClick={() => setPicked(null)}>{m.shell_layout__not_now()}</Button>
              </div>
            </SidePanel>
          ) : null}
        </Page>
      )}
    </QueryState>
  )
}
