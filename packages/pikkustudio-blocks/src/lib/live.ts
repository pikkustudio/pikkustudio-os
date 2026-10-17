import { useSlots } from './slots'

const none = () => {}

export const useLiveUpdates = (queryKeys: readonly string[]) => (useSlots().useLiveUpdates ?? none)(queryKeys)
