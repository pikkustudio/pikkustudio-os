import { describe, expect, test } from 'bun:test'
import { createElement, type ComponentType, type ReactNode } from 'react'
import { prerender } from 'react-dom/static'
import { StudioSlotsProvider, useChainSlot, useHasSlot, useKeyedSlot, useSlot, useSlotList, type RegisteredContribution } from './studio-slots'

const html = async (node: ReactNode) => {
  const { prelude } = await prerender(node as never)
  // Drop React's Suspense markers and text separators so the checks read as markup.
  return (await new Response(prelude).text()).replace(/<template[^>]*><\/template>/g, '').replace(/<!--[^>]*-->/g, '')
}

const contribution = (slot: string, render: (props: any) => ReactNode, more: Partial<RegisteredContribution> = {}): RegisteredContribution => ({
  addon: 'test',
  slot,
  component: async () => ({ default: render as ComponentType<any> }),
  ...more,
})

const within = (contributions: RegisteredContribution[], Screen: ComponentType) =>
  html(createElement(StudioSlotsProvider, { value: contributions }, createElement(Screen)))

const Default = () => <i>default</i>

describe('studio slots', () => {
  test('a single slot shows the core default when nothing is contributed', async () => {
    const Screen = () => {
      const Health = useSlot('overview.liveHealth', Default)
      return <Health />
    }
    expect(await within([], Screen)).toBe('<i>default</i>')
  })

  test('a single slot shows the highest-priority contribution', async () => {
    const Screen = () => {
      const Health = useSlot('overview.liveHealth', Default)
      return <Health />
    }
    const out = await within(
      [contribution('overview.liveHealth', () => <b>low</b>), contribution('overview.liveHealth', () => <b>high</b>, { priority: 2 })],
      Screen,
    )
    expect(out).toBe('<b>high</b>')
  })

  test('a list slot renders every contribution, highest priority first, from several addons', async () => {
    const Screen = () => {
      const Foot = useSlotList('shell.railFoot')
      return <div><Foot collapsed /></div>
    }
    const out = await within(
      [contribution('shell.railFoot', () => <span>a</span>, { addon: 'one', id: 'a' }), contribution('shell.railFoot', () => <span>b</span>, { addon: 'two', id: 'b', priority: 1 })],
      Screen,
    )
    expect(out).toBe('<div><span>b</span><span>a</span></div>')
  })

  test('a keyed slot answers only its key', async () => {
    const Screen = ({ kind }: { kind: string }) => {
      const Mode = useKeyedSlot('versions.releaseMode', kind, () => <i>none</i>)
      return <Mode />
    }
    const contributions = [contribution('versions.releaseMode', () => <b>stage mode</b>, { key: 'stage' })]
    expect(await within(contributions, () => <Screen kind="stage" />)).toBe('<b>stage mode</b>')
    expect(await within(contributions, () => <Screen kind="workspace" />)).toBe('<i>none</i>')
  })

  test('a failing contribution shows the core default in its place', async () => {
    const original = console.warn
    const errors = console.error
    console.warn = () => {}
    console.error = () => {}
    try {
      const Screen = () => {
        const Health = useSlot('overview.liveHealth', Default)
        return <Health />
      }
      const broken = contribution('overview.liveHealth', () => {
        throw new Error('boom')
      })
      // Server rendering has no error boundaries: it renders the slot's fallback and leaves the rest to the client.
      expect(await within([broken], Screen)).toBe('<i>default</i>')
    } finally {
      console.warn = original
      console.error = errors
    }
  })

  test('useHasSlot tells a screen whether anything is contributed', async () => {
    const Screen = () => <i>{String(useHasSlot('projects.card.extra'))}</i>
    expect(await within([], Screen)).toBe('<i>false</i>')
    expect(await within([contribution('projects.card.extra', () => null)], Screen)).toBe('<i>true</i>')
  })
})

describe('chain slots', () => {
  test('each contribution wraps the next and the last wraps the children', async () => {
    const contributions = [
      contribution('chain.test', ({ next }) => <u>{next}</u>, { priority: 1 }),
      contribution('chain.test', ({ next }) => <s>{next}</s>),
    ]
    const Screen = () => {
      const Chain = (useChainSlot as (name: string) => ComponentType<{ children: ReactNode }>)('chain.test')
      return <Chain><b>core</b></Chain>
    }
    expect(await within(contributions, Screen)).toBe('<u><s><b>core</b></s></u>')
  })
})
