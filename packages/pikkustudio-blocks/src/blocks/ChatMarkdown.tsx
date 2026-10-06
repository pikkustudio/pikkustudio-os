import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const REMARK_PLUGINS = [remarkGfm]

const COMPONENTS: Components = {
  p: ({ node: _n, ...p }) => <p className="text-pretty break-words" {...p} />,
  h1: ({ node: _n, ...p }) => <h3 className="mt-1 text-[18px] leading-[1.3] font-bold" {...p} />,
  h2: ({ node: _n, ...p }) => <h3 className="mt-1 text-[17px] leading-[1.3] font-bold" {...p} />,
  h3: ({ node: _n, ...p }) => <h4 className="mt-1 text-[16px] leading-[1.3] font-bold" {...p} />,
  h4: ({ node: _n, ...p }) => <h4 className="mt-1 text-[16px] leading-[1.3] font-semibold" {...p} />,
  ul: ({ node: _n, ...p }) => <ul className="flex list-disc flex-col gap-1 pl-5" {...p} />,
  ol: ({ node: _n, ...p }) => <ol className="flex list-decimal flex-col gap-1 pl-5" {...p} />,
  li: ({ node: _n, ...p }) => <li className="pl-0.5 break-words" {...p} />,
  a: ({ node: _n, ...p }) => <a className="font-semibold text-accent-foreground underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...p} />,
  blockquote: ({ node: _n, ...p }) => <blockquote className="border-l-2 border-border pl-3 text-muted-foreground" {...p} />,
  hr: ({ node: _n, ...p }) => <hr className="border-border" {...p} />,
  pre: ({ node: _n, ...p }) => <pre className="overflow-x-auto rounded-sm bg-secondary px-3 py-2.5 font-mono text-[13px] leading-[1.5] text-foreground [&_code]:bg-transparent [&_code]:p-0" {...p} />,
  code: ({ node: _n, ...p }) => <code className="rounded-sm bg-secondary px-1 py-0.5 font-mono text-[13px] break-words" {...p} />,
  table: ({ node: _n, ...p }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14px]" {...p} />
    </div>
  ),
  th: ({ node: _n, ...p }) => <th className="border border-border bg-secondary px-2 py-1 text-left font-semibold" {...p} />,
  td: ({ node: _n, ...p }) => <td className="border border-border px-2 py-1" {...p} />,
}

export function ChatMarkdown({ children }: { children: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
