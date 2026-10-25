import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_studio/artifacts/explore/$uid')({ component: Outlet })
