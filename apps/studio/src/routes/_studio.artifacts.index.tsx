import { createFileRoute } from '@tanstack/react-router'
import { ArtifactsScreen } from '@pikkustudio/blocks/screens/ArtifactsScreen'

export const Route = createFileRoute('/_studio/artifacts/')({ component: ArtifactsScreen })
