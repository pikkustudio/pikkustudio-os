import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_studio/artifacts')({ component: Outlet })
