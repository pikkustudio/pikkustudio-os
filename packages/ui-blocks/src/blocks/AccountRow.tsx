import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { UserRound } from 'lucide-react'
import { Button } from '../ui/button'
import { Dot, RowCard } from './RowCard'
import { accountName, joinedOn, type Account } from '../lib/accounts'

export function AccountRow({ account, onOpen }: { account: Account; onOpen: () => void }) {
  const joined = joinedOn(account.createdAt)
  const named = !!account.name?.trim()
  return (
    <RowCard
      flag={!!account.banned}
      tile={<UserRound className="size-5.5" />}
      title={asI18n(accountName(account))}
      caption={named ? asI18n(account.email) : undefined}
      note={joined ? m.accounts_row__joined({ date: asI18n(joined) }) : undefined}
    >
      <Dot tone={account.banned ? 'warn' : 'ok'}>{account.banned ? m.accounts_row__paused() : m.accounts_row__active()}</Dot>
      <Button type="button" variant="bordered" size="compact" onClick={onOpen}>
        {m.accounts_row__open()}
      </Button>
    </RowCard>
  )
}
