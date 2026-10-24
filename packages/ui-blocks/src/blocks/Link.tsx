import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { createLink, type LinkComponent } from '@tanstack/react-router'
import type { I18nProps } from '../lib/i18n-props'

const Anchor = forwardRef<HTMLAnchorElement, I18nProps<ComponentPropsWithoutRef<'a'>>>((props, ref) => <a ref={ref} {...props} />)
Anchor.displayName = 'Anchor'

const Created = createLink(Anchor)

/** TanStack's `Link` with its children and text attributes typed as translated copy; routes, params and search stay typed exactly as the router's own `Link`. */
export const Link: LinkComponent<typeof Anchor> = (props) => <Created {...props} />
