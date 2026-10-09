import { m } from '@/i18n/messages'
import { useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { Button } from '../ui/button'
import { CodeEditor } from '../blocks/CodeEditor'
import { CodeFiles } from '../blocks/CodeFiles'
import { CodeHero } from '../blocks/CodeHero'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { parentOf } from '../lib/code'
import { useProjectKey, useProjectName } from '../lib/project'

export function CodeScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const navigate = useNavigate()
  const { file, folder } = useSearch({ strict: false }) as { file?: string; folder?: string }
  const input = useRef<HTMLInputElement>(null)
  const set = (patch: { file?: string; folder?: string }) => navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...patch })) as never })

  return (
    <Page gap="snug" width="full">
      <PageHead crumb={projectName} title={m.code_screen__title()} text={m.code_screen__text()} size="lead" />
      {file ? (
        <CodeEditor projectKey={key} file={file} onBack={() => set({ file: undefined, folder: parentOf(file) || undefined })} />
      ) : (
        <>
          <CodeHero title={m.code_hero__title()} why={m.code_hero__why()}>
            <Button variant="hero" size="pageLg" type="button" onClick={() => input.current?.focus()}>
              <Search className="size-4.5" />
              {m.code_hero__find()}
            </Button>
          </CodeHero>
          <CodeFiles projectKey={key} folder={folder ?? ''} inputRef={input} onFolder={(p) => set({ folder: p || undefined })} onFile={(p) => set({ file: p })} />
        </>
      )}
    </Page>
  )
}
