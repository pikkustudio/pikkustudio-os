import { createFileRoute } from '@tanstack/react-router'
import { ArtifactsExploreScreen } from '@pikkustudio/blocks/screens/ArtifactsExploreScreen'

export const Route = createFileRoute('/_studio/artifacts/explore/$uid/')({ component: ArtifactsExploreScreen })
