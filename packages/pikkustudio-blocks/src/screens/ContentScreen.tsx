import { m } from '@/i18n/messages'
import { useState, type ReactNode } from 'react'
import { ChevronLeft, Globe, Lock, Upload } from 'lucide-react'
import { Button } from '../ui/button'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { absoluteLink, contentLevel, saveLink } from '../lib/content'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { EmptyState } from '../blocks/EmptyState'
import { QueryState } from '../blocks/QueryState'
import { Segmented } from '../blocks/Segmented'
import { RowStack } from '../blocks/RowCard'
import { ContentFolderRow } from '../blocks/ContentFolderRow'
import { ContentFileRow } from '../blocks/ContentFileRow'
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
  const [bucket, setBucket] = useState<string | null>(null)
  const [folder, setFolder] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadFailed, setUploadFailed] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [downloadFailed, setDownloadFailed] = useState(false)
  const overview = usePikkuQuery('contentOverview', {})
  const listing = usePikkuQuery('listContentFiles', { visibility: side, prefix: '' })
  const refresh = () => listing.refetch()
  const link = usePikkuMutation('contentDownloadUrl')
  const uploadUrl = usePikkuMutation('contentUploadUrl')
  const removeFile = usePikkuMutation('deleteContentFile', { onSuccess: refresh })
  const removeFolder = usePikkuMutation('deleteContentFolder', { onSuccess: refresh })

  const goTo = (nextBucket: string | null, nextFolder: string) => {
    setBucket(nextBucket)
    setFolder(nextFolder)
  }
  const pickSide = (next: string) => {
    setSide(next as Side)
    goTo(null, '')
  }
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
      goTo(target!, rest.join('/'))
      await refresh()
    } catch {
      setUploadFailed(true)
    }
  }

  const trail = bucket === null ? null : folder.includes('/') ? folder.split('/').slice(0, -1).join('/') : ''
  const back = () => {
    if (bucket === null) return
    if (folder === '') goTo(null, '')
    else goTo(bucket, trail ?? '')
  }
  const here = bucket === null ? m.content__all_folders() : [bucket, ...(folder ? folder.split('/') : [])].join(' / ')
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
      <Group title={here}>
        {bucket !== null ? (
          <div>
            <Button type="button" variant="back" size="back" onClick={back}>
              <ChevronLeft className="size-4.5" />
              {m.content__back()}
            </Button>
          </div>
        ) : null}
        <QueryState
          query={listing}
          skeleton={skeleton}
          empty={(data) =>
            !data.supported ? (
              <EmptyState layout="row" title={m.content__cannot_list_title()} text={m.content__cannot_list_text()} />
            ) : data.files.length === 0 && bucket === null ? (
              <EmptyState layout="row" title={isPublic ? m.content__nothing_public_title() : m.content__nothing_private_title()} text={m.content__nothing_text()}>
                <Button type="button" size="page" onClick={() => setUploading(true)}>
                  {m.content__add_a_file()}
                </Button>
              </EmptyState>
            ) : null
          }
        >
          {(data) => {
            const level = contentLevel(data.files, bucket, folder)
            const canCopy = isPublic
            const canDownload = overview.data?.canDownload ?? false
            return (
              <RowStack>
                {level.folders.map((item) => {
                  const owner = bucket === null ? ownerOf(item.name) : undefined
                  return (
                    <ContentFolderRow
                      key={item.path}
                      name={item.name}
                      count={item.count}
                      owner={bucket === null ? (owner ? m.content__kept_by_addon({ addon: owner.addon }) : m.content__kept_by_project()) : undefined}
                      removing={removeFolder.isPending}
                      onOpen={() => (bucket === null ? goTo(item.name, '') : goTo(bucket, item.path))}
                      onRemove={() => removeFolder.mutate({ visibility: side, bucket: bucket ?? item.name, prefix: bucket === null ? '' : `${item.path}/` })}
                    />
                  )
                })}
                {level.files.map((file) => (
                  <ContentFileRow
                    key={`${file.bucket}/${file.key}`}
                    name={file.name}
                    canDownload={canDownload}
                    canCopy={canCopy}
                    busy={link.isPending || removeFile.isPending}
                    copied={copied === `${file.bucket}/${file.key}`}
                    onDownload={() => download(file)}
                    onCopy={() => copy(file)}
                    onRemove={() => removeFile.mutate({ visibility: side, bucket: file.bucket, key: file.key })}
                  />
                ))}
                {level.folders.length === 0 && level.files.length === 0 ? <p className="px-1 text-px15 text-ink-2">{m.content__folder_empty()}</p> : null}
              </RowStack>
            )
          }}
        </QueryState>
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
          key={`${side}:${bucket}:${folder}`}
          isPublic={isPublic}
          folder={bucket === null ? '' : [bucket, folder].filter(Boolean).join('/')}
          uploading={uploadUrl.isPending}
          failed={uploadFailed}
          onUpload={upload}
          onClose={() => setUploading(false)}
        />
      ) : null}
    </Page>
  )
}
