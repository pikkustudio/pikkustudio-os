import { createFileRoute } from '@tanstack/react-router'
import { ArtifactScreen } from '@pikkustudio/blocks/screens/ArtifactScreen'

export const Route = createFileRoute('/_studio/artifacts/$id')({ component: ArtifactScreen })
