import { m } from '@/i18n/messages'
import type { ReactNode } from 'react'
import { Bell, Globe, LogOut, Palette, User } from 'lucide-react'
import { AccountHero } from '../blocks/AccountHero'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { LocalAccountName } from '../blocks/ShellAccount'
import { Button } from '../ui/button'
import { useSlots } from '../lib/slots'
import { useAccount, useSignOut } from '../lib/onboarding'
import { languageName } from '../lib/i18n'
import { supportedLocales, useLocale, type Locale } from '@/i18n/config'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {children}
  </section>
)

export function AccountScreen() {
  const { locale, setLocale } = useLocale()
  const AccountName = useSlots().AccountName ?? LocalAccountName
  const name = useAccount().data?.name
  const hasName = !!name
  const signOut = useSignOut()
  return (
    <Page gap="snug">
      <PageHead crumb={m.account_screen__on_this_computer()} title={m.account_screen__title()} text={m.account_screen__lead()} size="lead" />
      <AccountHero name={name ?? undefined} />
      <div>
        <div className="flex min-w-0 flex-col gap-6.5">
          <Group title={m.account_screen__settings()}>
            <RowStack>
              <RowCard tile={<User className="size-5" />} title={m.account_screen__name()} caption={hasName ? <AccountName /> : m.account_screen__name_unset()}>
                <Dot tone="quiet">{m.account_screen__soon()}</Dot>
              </RowCard>
              <RowCard tile={<Globe className="size-5" />} title={m.account_screen__language()} caption={m.account_screen__language_text()}>
                <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                  <SelectTrigger shape="pill" aria-label={m.account_screen__language()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLocales.map((l) => (
                      <SelectItem key={l} value={l}>
                        {languageName(l)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </RowCard>
              <RowCard tile={<Bell className="size-5" />} title={m.account_screen__notify()} caption={m.account_screen__notify_text()}>
                <Dot tone="quiet">{m.account_screen__soon()}</Dot>
              </RowCard>
              <RowCard tile={<Palette className="size-5" />} title={m.account_screen__looks()} caption={m.account_screen__looks_text()}>
                <Dot tone="quiet">{m.account_screen__soon()}</Dot>
              </RowCard>
            </RowStack>
          </Group>
          <Group title={m.account_screen__signed_in()}>
            <RowCard tile={<LogOut className="size-5" />} title={m.account_screen__sign_out()} caption={m.account_screen__sign_out_text()}>
              <Button type="button" variant="bordered" size="compact" disabled={signOut.isPending} onClick={() => signOut.mutate({})}>
                {m.account_screen__sign_out()}
              </Button>
            </RowCard>
            {signOut.isError ? (
              <p role="alert" className="text-px15 text-destructive-foreground">
                {m.account_screen__sign_out_failed()}
              </p>
            ) : null}
          </Group>
        </div>
      </div>
    </Page>
  )
}
