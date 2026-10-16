import { useContext } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useProjectKey } from '../lib/project'
import { ProjectRpcCtx } from '../lib/projectRpc'
import { faultOf } from './ErrorState'
import type { PickedElement } from './LiveAppFrame'
import { VariantWordingError, wordingWrites, type I18nApp } from '../lib/wordingWrite'

export const variantWording = (error: unknown) => error instanceof VariantWordingError

export const olderPikku = (error: unknown) => {
  const f = faultOf(error)
  if (variantWording(error) || /^No (JSX element|file) at/.test(f.message ?? '')) return false
  return f.status === 404 || /^NotFound/.test(f.name ?? '') || /updateJsxStyle|writeI18nLocale|getI18n|not found|no such function/i.test(f.message ?? '')
}

const sourceOf = (picked: PickedElement) => {
  const parts = picked.omId.split(':')
  const col = Number(parts.pop())
  const line = Number(parts.pop())
  const file = parts.join(':')
  if (!file || !Number.isInteger(line) || !Number.isInteger(col)) throw new Error(`The picked part has no source location (${picked.omId})`)
  return { path: picked.root ? `${picked.root}/${file}` : file, line, col }
}

export function useSaveLook() {
  const invoke = useContext(ProjectRpcCtx)
  const key = useProjectKey()
  return useMutation({
    mutationFn: ({ picked, styles }: { picked: PickedElement; styles: Record<string, string> }) =>
      invoke(key, 'console:updateJsxStyle', { ...sourceOf(picked), styles }),
  })
}

export function useSaveWording() {
  const invoke = useContext(ProjectRpcCtx)
  const key = useProjectKey()
  return useMutation({
    mutationFn: async ({ wordingKey, changes }: { wordingKey: string; changes: Record<string, string> }) => {
      const { apps } = (await invoke(key, 'console:getI18n')) as { apps: I18nApp[] }
      for (const write of wordingWrites(apps, wordingKey, changes)) await invoke(key, 'console:writeI18nLocale', write)
    },
  })
}
