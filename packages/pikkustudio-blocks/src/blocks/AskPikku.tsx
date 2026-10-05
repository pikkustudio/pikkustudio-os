import { useContext } from 'react'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { PikkuDot } from './PikkuDot'

export function AskPikku({ label, prompt, size = 'compact' }: { label: string; prompt: string; size?: 'compact' | 'page' }) {
  const { say } = useContext(ShellCtx)
  return (
    <Button variant="bordered" size={size} type="button" onClick={() => say(prompt)}>
      <PikkuDot />
      {label}
    </Button>
  )
}
