import { asI18n } from '@pikku/react'
import { Link } from '@pikkustudio/blocks/blocks/Link'
import { ArrowRight, Puzzle } from 'lucide-react'
import { Page } from '@pikkustudio/blocks/blocks/Page'
import { PageHead } from '@pikkustudio/blocks/blocks/PageHead'
import { Badge } from '@pikkustudio/blocks/ui/badge'
import { useProjectName } from '@pikkustudio/blocks/lib/project'
import { m } from '@/i18n/messages'
import { installedAddons } from '@/addon-ui/registry'

export function AddonUisScreen() {
  const projectName = useProjectName()
  return (
    <Page gap="list">
      <PageHead
        crumb={projectName}
        title={m.addon_uis_screen__title()}
        text={m.addon_uis_screen__text()}
      />
      {installedAddons.length === 0 ? (
        <p className="text-ink-2">{m.addon_uis_screen__none()}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {installedAddons.map((ext) => (
            <section key={ext.name} className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4.5 py-4">
              <div className="flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Puzzle className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-semibold">{asI18n(ext.title)}</div>
                  <div className="text-[14px] text-muted-foreground">{asI18n(ext.name)}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {ext.screens.map((s) => (
                  <Link
                    key={s.path}
                    to={s.path as never}
                    search={((prev: object) => prev) as never}
                    className="grid grid-cols-[minmax(0,1fr)_auto_22px] items-center gap-4 rounded-xl border border-border px-4 py-3 no-underline transition-colors duration-140 hover:border-primary hover:bg-secondary"
                  >
                    <span className="font-medium">{asI18n(s.title)}</span>
                    <span className="flex gap-1.5">
                      {(s.scopes ?? []).map((scope) => (
                        <Badge key={scope}>{asI18n(scope)}</Badge>
                      ))}
                    </span>
                    <ArrowRight className="rtl:-scale-x-100 size-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}
