import { createFileRoute } from '@tanstack/react-router'
import { SurfaceScreen } from '@pikkustudio/blocks/screens/SurfaceScreen'

export const Route = createFileRoute('/_studio/surface')({ component: SurfaceScreen })
