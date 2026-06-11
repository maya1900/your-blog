import { forwardRef } from 'react'
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  type LinkProps,
  type NavLinkProps,
} from 'react-router-dom'

/**
 * Project-wide Link / NavLink that default to `viewTransition`, so client-side
 * navigations are wrapped in document.startViewTransition — see the route
 * transition styles (`::view-transition-*(root)`) in index.css. Browsers
 * without the View Transitions API just navigate instantly.
 *
 * Pass `viewTransition={false}` to opt a single link out.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(props, ref) {
  return <RouterLink viewTransition ref={ref} {...props} />
})

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  function NavLink(props, ref) {
    return <RouterNavLink viewTransition ref={ref} {...props} />
  },
)
