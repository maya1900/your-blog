import { forwardRef } from 'react'
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  type LinkProps,
  type NavLinkProps,
} from 'react-router-dom'

/**
 * Project-wide Link / NavLink wrappers. Keep route navigations visually stable
 * by default; callers can still pass `viewTransition` for a specific link.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(props, ref) {
  return <RouterLink ref={ref} {...props} />
})

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  function NavLink(props, ref) {
    return <RouterNavLink ref={ref} {...props} />
  },
)
