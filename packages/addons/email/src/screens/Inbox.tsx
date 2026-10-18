import { m } from '@/i18n/messages'
import { Mail } from 'lucide-react'
import { Page } from '@pikkustudio/blocks/blocks/Page'
import { PageHead } from '@pikkustudio/blocks/blocks/PageHead'
import { NextCard } from '@pikkustudio/blocks/blocks/NextCard'
import { EmptyState } from '@pikkustudio/blocks/blocks/EmptyState'
import { buttonVariants } from '@pikkustudio/blocks/ui/button'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <rect x="130" y="100" width="80" height="58" rx="12" className="fill-w6" opacity="0.92" />
      <path d="M136 110l34 26 34-26" className="stroke-w2" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

export default function Inbox() {
  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb={m.email_screen__email()} title={m.email_screen__title()} text={m.email_screen__lead()} />
        <NextCard label={m.email_screen__email()} hue="sea" art={<Art />} title={m.email_screen__hero_title()} why={m.email_screen__hero_why()} />
        <EmptyState icon={Mail} title={m.email_screen__where_title()} text={m.email_screen__where_text()}>
          <a href="/projects" className={buttonVariants({ size: 'page' })}>
            {m.email_screen__open_projects()}
          </a>
        </EmptyState>
      </Page>
    </div>
  )
}
