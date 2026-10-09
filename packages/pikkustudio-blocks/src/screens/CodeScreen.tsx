import { m } from '@/i18n/messages'
import { useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { CodeEditor } from '../blocks/CodeEditor'
import { CodeFiles } from '../blocks/CodeFiles'
import { Page } from '../blocks/Page'
import { SlimHead } from '../blocks/SlimHead'
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
      {file ? (
        <CodeEditor projectKey={key} file={file} onBack={() => set({ file: undefined, folder: parentOf(file) || undefined })} />
      ) : (
        <>
          <SlimHead crumb={projectName} title={m.code_screen__title()} />
          <CodeFiles projectKey={key} folder={folder ?? ''} inputRef={input} onFolder={(p) => set({ folder: p || undefined })} onFile={(p) => set({ file: p })} />
        </>
      )}
    </Page>
  )
}
