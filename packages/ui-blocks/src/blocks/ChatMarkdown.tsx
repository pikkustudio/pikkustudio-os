import { asI18n, type I18nNode } from '@pikku/react'
import { Children, isValidElement, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { cn } from '../lib/utils'
import remarkGfm from 'remark-gfm'

/** The words inside rendered markdown come from the assistant, not from us, so each text piece is marked as outside data here, once. */
const outside = (children: ReactNode): I18nNode => {
  const parts: I18nNode[] = []
  for (const child of Children.toArray(children)) {
    if (typeof child === 'string') parts.push(asI18n(child))
    else if (typeof child === 'number' || isValidElement(child)) parts.push(child)
  }
  return parts
}

const REMARK_PLUGINS = [remarkGfm]

/** Raw HTML from the model stays off (react-markdown's default); links may only be web or mail, and images are never fetched. */
const SAFE_LINK = /^(https?:|mailto:)/i
const safeUrl = (url: string) => (SAFE_LINK.test(url.trim()) ? url : '')
const DISALLOWED = ['img']

const COMPONENTS: Components = {
  p: ({ children }) => <p className="text-pretty break-words">{outside(children)}</p>,
  h1: ({ children }) => <h3 className="mt-1 text-[18px] leading-[1.3] font-bold">{outside(children)}</h3>,
  h2: ({ children }) => <h3 className="mt-1 text-[17px] leading-[1.3] font-bold">{outside(children)}</h3>,
  h3: ({ children }) => <h4 className="mt-1 text-[16px] leading-[1.3] font-bold">{outside(children)}</h4>,
  h4: ({ children }) => <h4 className="mt-1 text-[16px] leading-[1.3] font-semibold">{outside(children)}</h4>,
  ul: ({ children }) => <ul className="flex list-disc flex-col gap-1 ps-5">{outside(children)}</ul>,
  ol: ({ children, start }) => <ol start={start} className="flex list-decimal flex-col gap-1 ps-5">{outside(children)}</ol>,
  li: ({ children }) => <li className="ps-0.5 break-words">{outside(children)}</li>,
  a: ({ children, href }) => <a href={href || undefined} className="font-semibold text-accent-foreground underline underline-offset-2" target="_blank" rel="noopener noreferrer">{outside(children)}</a>,
  blockquote: ({ children }) => <blockquote className="border-s-2 border-border ps-3 text-muted-foreground">{outside(children)}</blockquote>,
  hr: () => <hr className="border-border" />,
  pre: ({ children }) => <pre dir="ltr" className="[unicode-bidi:isolate] overflow-x-auto rounded-sm bg-secondary px-3 py-2.5 font-mono text-[13px] leading-[1.5] text-foreground [&_code]:bg-transparent [&_code]:p-0">{outside(children)}</pre>,
  code: ({ children, className }) => <code dir="ltr" className={cn(className, "[unicode-bidi:isolate] rounded-sm bg-secondary px-1 py-0.5 font-mono text-[13px] break-words")}>{outside(children)}</code>,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14px]">{outside(children)}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border bg-secondary px-2 py-1 text-start font-semibold">{outside(children)}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1">{outside(children)}</td>,
}

export function ChatMarkdown({ children }: { children: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS} urlTransform={safeUrl} disallowedElements={DISALLOWED} unwrapDisallowed>
        {children}
      </ReactMarkdown>
    </div>
  )
}
