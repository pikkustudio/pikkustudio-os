import { createContext, createElement, lazy, Suspense, useContext, useMemo, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import { SlotBoundary } from '../blocks/SlotBoundary'
import type { StudioSlots } from '../studio.slots'

/**
 * How a slot takes contributions:
 * - `single`: the highest-priority contribution replaces the core default.
 * - `list`: every contribution renders, highest priority first.
 * - `keyed`: the contribution whose `key` matches what the screen asks for, else the core default.
 * - `chain`: each contribution wraps the next one (`next`), the last wrapping the core default.
 */
export type SlotKind = 'single' | 'list' | 'keyed' | 'chain'

/** A declared slot. `props` exists only in the type: it is what the screen hands each contribution. */
export type SlotDecl<K extends SlotKind = SlotKind, P = unknown> = { kind: K; props?: P }

export type ChainProps = { next: ReactNode }

export const slot = {
  single: <P = Record<string, never>>(): SlotDecl<'single', P> => ({ kind: 'single' }),
  list: <P = Record<string, never>>(): SlotDecl<'list', P> => ({ kind: 'list' }),
  keyed: <P = Record<string, never>>(): SlotDecl<'keyed', P> => ({ kind: 'keyed' }),
  chain: <P = Record<string, never>>(): SlotDecl<'chain', P & ChainProps> => ({ kind: 'chain' }),
}

export const defineStudioSlots = <const T extends Record<string, SlotDecl>>(slots: T) => slots

export type SlotProps<D> = D extends SlotDecl<SlotKind, infer P> ? P : never

/** A contribution's component, always loaded lazily so an addon costs nothing until its slot renders. */
export type LazyComponent<P> = () => Promise<{ default: ComponentType<P> }>

export type SlotContributionOf<S extends Record<string, SlotDecl>> = {
  [K in keyof S & string]: {
    slot: K
    component: LazyComponent<SlotProps<S[K]>>
    /** Unique within a list slot. */
    id?: string
    /** Which key of a keyed slot this answers. */
    key?: string
    /** Higher renders first (list), wins (single) or wraps outermost (chain). Defaults to 0. */
    priority?: number
  }
}[keyof S & string]

/** A contribution as the generated registry hands it over, with the addon that made it. */
export type RegisteredContribution = {
  addon: string
  slot: string
  component: LazyComponent<any>
  id?: string
  key?: string
  priority?: number
}

const StudioSlotsCtx = createContext<readonly RegisteredContribution[]>([])

export const StudioSlotsProvider = StudioSlotsCtx.Provider

/** The contributions to one slot, highest priority first. */
export const useSlotContributions = (slot: string): RegisteredContribution[] => {
  const all = useContext(StudioSlotsCtx)
  return useMemo(() => all.filter((c) => c.slot === slot).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)), [all, slot])
}

/** Whether anything is contributed to a slot, for a screen that lays out differently when nothing is. */
export const useHasSlot = (slot: SlotName, key?: string) => useSlotContributions(slot).some((c) => key === undefined || c.key === key)

type SlotName = keyof StudioSlots & string
type SlotsOfKind<K extends SlotKind> = { [N in SlotName]: StudioSlots[N] extends SlotDecl<K, any> ? N : never }[SlotName]
type PropsOf<N extends SlotName> = SlotProps<StudioSlots[N]>

// One lazy component per contribution, made once, so a re-render never remounts an addon's component.
const loaded = new WeakMap<LazyComponent<any>, LazyExoticComponent<ComponentType<any>>>()
const lazyOf = (load: LazyComponent<any>) => {
  let component = loaded.get(load)
  if (!component) loaded.set(load, (component = lazy(load)))
  return component
}

// A contribution inside its own boundary: if it fails the screen shows `fallback` there, and `loading` until it loads.
const renderContribution = (c: RegisteredContribution, props: object, fallback: ReactNode, loading: ReactNode = fallback) =>
  createElement(SlotBoundary, {
    key: `${c.addon}:${c.id ?? c.key ?? ''}`,
    slot: c.slot,
    addon: c.addon,
    fallback,
    children: createElement(Suspense, { fallback: loading }, createElement(lazyOf(c.component), props)),
  })

const NONE: ComponentType<any> = () => null

/** A `single` slot as a component: the winning contribution, or `Default` (nothing when none is given). */
export const useSlot = <N extends SlotsOfKind<'single'>>(name: N, Default: ComponentType<PropsOf<N>> = NONE): ComponentType<PropsOf<N>> => {
  const top = useSlotContributions(name)[0]
  return useMemo(() => (top ? (props: PropsOf<N>) => renderContribution(top, props as object, createElement(Default as ComponentType<any>, props)) : Default), [top, Default])
}

/** A `list` slot as a component rendering every contribution, highest priority first. */
export const useSlotList = <N extends SlotsOfKind<'list'>>(name: N): ComponentType<PropsOf<N>> => {
  const all = useSlotContributions(name)
  return useMemo(() => (props: PropsOf<N>) => all.map((c) => renderContribution(c, props as object, null)), [all])
}

/** A `keyed` slot as a component: the contribution for `key`, or `Default`. */
export const useKeyedSlot = <N extends SlotsOfKind<'keyed'>>(name: N, key: string | undefined, Default: ComponentType<PropsOf<N>> = NONE): ComponentType<PropsOf<N>> => {
  const match = useSlotContributions(name).find((c) => c.key === key)
  return useMemo(() => (match ? (props: PropsOf<N>) => renderContribution(match, props as object, createElement(Default as ComponentType<any>, props)) : Default), [match, Default])
}

/**
 * A `chain` slot as a component: the highest-priority contribution wraps the next one through its `next` prop, and
 * the last wraps `children`. Nothing renders until the chain has loaded, so a wrapper never mounts its children twice; a
 * contribution that fails drops out and its `next` renders in its place.
 */
export const useChainSlot = <N extends SlotsOfKind<'chain'>>(name: N): ComponentType<Omit<PropsOf<N>, 'next'> & { children: ReactNode }> => {
  const all = useSlotContributions(name)
  return useMemo(
    () =>
      ({ children, ...props }: { children: ReactNode }) =>
        all.reduceRight<ReactNode>((next, c) => renderContribution(c, { ...props, next }, next, null), children),
    [all],
  ) as never
}
