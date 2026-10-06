import { m } from '@/i18n/messages'
import { useState, type ReactNode } from 'react'
import { Globe, Lock, Upload } from 'lucide-react'
import { Button } from '../ui/button'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { absoluteLink, saveLink } from '../lib/content'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { EmptyState } from '../blocks/EmptyState'
import { Segmented } from '../blocks/Segmented'
import { ContentTree } from '../blocks/ContentTree'
import { ContentAccess } from '../blocks/ContentAccess'
import { ContentUploadForm } from '../blocks/ContentUploadForm'

type Side = 'private' | 'public'

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {children}
  </section>
)

const skeleton = <div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />

export function ContentScreen() {
  const [side, setSide] = useState<Side>('private')
  const [stamp, setStamp] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadFailed, setUploadFailed] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [downloadFailed, setDownloadFailed] = useState(false)
  const overview = usePikkuQuery('contentOverview', {})
  const root = usePikkuQuery('listContentFolder', { visibility: side, path: '' })
  const refresh = async () => {
    await root.refetch()
    setStamp((n) => n + 1)
  }
  const link = usePikkuMutation('contentDownloadUrl')
  const uploadUrl = usePikkuMutation('contentUploadUrl')
  const removeFile = usePikkuMutation('deleteContentFile', { onSuccess: refresh })
  const removeFolder = usePikkuMutation('deleteContentFolder', { onSuccess: refresh })

  const pickSide = (next: string) => setSide(next as Side)
  const owners = overview.data?.owners ?? []
  const ownerOf = (name: string) => owners.find((o) => o.folder === name)
  const isPublic = side === 'public'

  const download = async (file: { bucket: string; key: string }) => {
    setDownloadFailed(false)
    try {
      const { url } = await link.mutateAsync({ visibility: side, bucket: file.bucket, key: file.key })
      const href = absoluteLink(url, window.location.origin)
      if (!(await saveLink(href, file.key.split('/').pop() ?? file.key))) window.open(href, '_blank', 'noopener')
    } catch {
      setDownloadFailed(true)
    }
  }
  const copy = async (file: { bucket: string; key: string }) => {
    const { url } = await link.mutateAsync({ visibility: side, bucket: file.bucket, key: file.key })
    await navigator.clipboard.writeText(absoluteLink(url, window.location.origin))
    const id = `${file.bucket}/${file.key}`
    setCopied(id)
    setTimeout(() => setCopied((now) => (now === id ? null : now)), 2500)
  }
  const upload = async (where: string, file: File) => {
    setUploadFailed(false)
    const [target, ...rest] = where.split('/')
    const key = [...rest, file.name].join('/')
    try {
      const signed = await uploadUrl.mutateAsync({ visibility: side, bucket: target!, key, contentType: file.type || 'application/octet-stream', size: file.size })
      const response = await fetch(signed.uploadUrl, { method: signed.uploadMethod, headers: { 'Content-Type': file.type || 'application/octet-stream', ...signed.uploadHeaders }, body: file })
      if (!response.ok) throw new Error('upload failed')
      setUploading(false)
      await refresh()
    } catch {
      setUploadFailed(true)
    }
  }

  const access = owners.filter((o) => o.grants.length > 0 || o.wholeStore)

  return (
    <Page gap="snug">
      <PageHead crumb={m.content__crumb()} title={m.content__title()} text={m.content__intro()} size="lead">
        <Button type="button" size="page" onClick={() => { setUploadFailed(false); setUploading(true) }}>
          <Upload className="size-4.5" />
          {m.content__add_a_file()}
        </Button>
      </PageHead>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented
          label={m.content__who_can_open()}
          value={side}
          onChange={pickSide}
          options={[
            ['private', <span key="p" className="inline-flex items-center gap-2"><Lock className="size-4" />{m.content__only_you()}</span>],
            ['public', <span key="u" className="inline-flex items-center gap-2"><Globe className="size-4" />{m.content__anyone_with_link()}</span>],
          ]}
        />
        <span className="text-px14 text-ink-2">{isPublic ? m.content__public_explained() : m.content__private_explained()}</span>
      </div>
      {downloadFailed ? (
        <p role="alert" className="text-px15 text-destructive-foreground">
          {m.content__download_failed()}
        </p>
      ) : null}
      <Group title={m.content__all_folders()}>
        {root.isError ? (
          <EmptyState layout="row" title={m.content_tree__failed()} text="">
            <Button type="button" size="page" onClick={() => root.refetch()}>{m.content_tree__try_again()}</Button>
          </EmptyState>
        ) : !root.data ? (
          skeleton
        ) : !root.data.supported ? (
          <EmptyState layout="row" title={m.content__cannot_list_title()} text={m.content__cannot_list_text()} />
        ) : root.data.folders.length === 0 && root.data.files.length === 0 ? (
          <EmptyState layout="row" title={isPublic ? m.content__nothing_public_title() : m.content__nothing_private_title()} text={m.content__nothing_text()}>
            <Button type="button" size="page" onClick={() => setUploading(true)}>{m.content__add_a_file()}</Button>
          </EmptyState>
        ) : (
          <ContentTree
            side={side}
            stamp={stamp}
            canDownload={overview.data?.canDownload ?? false}
            canCopy={isPublic}
            busy={link.isPending || removeFile.isPending}
            copied={copied}
            ownerOf={(name) => ownerOf(name)?.addon}
            onDownload={download}
            onCopy={copy}
            onRemoveFile={(file) => removeFile.mutate({ visibility: side, bucket: file.bucket, key: file.key })}
            onRemoveFolder={(bucket, prefix) => removeFolder.mutate({ visibility: side, bucket, prefix })}
          />
        )}
        {link.isError || removeFile.isError || removeFolder.isError ? (
          <p role="alert" className="text-px15 text-destructive-foreground">
            {m.content__did_not_work()}
          </p>
        ) : null}
      </Group>
      {access.length > 0 ? (
        <Group title={m.content__extra_access()}>
          <ContentAccess items={access} />
        </Group>
      ) : null}
      {uploading ? (
        <ContentUploadForm
          key={side}
          isPublic={isPublic}
          folder=""
          uploading={uploadUrl.isPending}
          failed={uploadFailed}
          onUpload={upload}
          onClose={() => setUploading(false)}
        />
      ) : null}
    </Page>
  )
}
