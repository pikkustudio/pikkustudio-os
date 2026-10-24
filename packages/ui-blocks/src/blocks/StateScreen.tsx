import type { ComponentProps } from 'react'
import { NextCard } from './NextCard'

export function StateScreen(props: ComponentProps<typeof NextCard>) {
  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-3xl">
        <NextCard {...props} />
      </div>
    </div>
  )
}
