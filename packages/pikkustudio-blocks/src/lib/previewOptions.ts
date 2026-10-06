import { createContext, type ComponentType } from 'react'

export const PreviewOptionsCtx = createContext<ComponentType | null>(null)
