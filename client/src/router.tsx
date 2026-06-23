import { lazy, Suspense, type ComponentType, type ReactElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { RequireAuth } from './components/RequireAuth'
import { HomePage } from './pages/Home'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { CategoryIndexPage } from './pages/CategoryIndex'
import { CategoryArchivePage } from './pages/CategoryArchive'
import { TagIndexPage } from './pages/TagIndex'
import { TagArchivePage } from './pages/TagArchive'
import { SearchResultsPage } from './pages/SearchResults'
import { AboutPage } from './pages/About'
import { AuthorProfilePage } from './pages/AuthorProfile'

function lazyNamed<T extends ComponentType<object>>(
  loader: () => Promise<Record<string, T>>,
  exportName: string,
) {
  return lazy(async () => {
    const mod = await loader()
    return { default: mod[exportName]! }
  })
}

const MePage = lazyNamed(() => import('./pages/Me'), 'MePage')
const WritePage = lazyNamed(() => import('./pages/Write'), 'WritePage')
const ArticleDetailPage = lazyNamed(() => import('./pages/ArticleDetail'), 'ArticleDetailPage')
const AdminLayout = lazyNamed(() => import('./layouts/AdminLayout'), 'AdminLayout')
const AdminDashboardPage = lazyNamed(() => import('./pages/admin/Dashboard'), 'AdminDashboardPage')
const AdminArticlesPage = lazyNamed(() => import('./pages/admin/Articles'), 'AdminArticlesPage')
const AdminCategoriesPage = lazyNamed(() => import('./pages/admin/Categories'), 'AdminCategoriesPage')
const AdminTagsPage = lazyNamed(() => import('./pages/admin/Tags'), 'AdminTagsPage')
const AdminUsersPage = lazyNamed(() => import('./pages/admin/Users'), 'AdminUsersPage')
const AdminCommentsPage = lazyNamed(() => import('./pages/admin/Comments'), 'AdminCommentsPage')
const AdminAboutPage = lazyNamed(() => import('./pages/admin/About'), 'AdminAboutPage')
const AdminSiteInfoPage = lazyNamed(() => import('./pages/admin/SiteInfo'), 'AdminSiteInfoPage')

function RouteLoading() {
  return (
    <div className="px-6 py-16 text-center text-steel font-mono text-sm">
      LOADING…
    </div>
  )
}

function withSuspense(element: ReactElement) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  // Auth pages: standalone full-screen layout, no top nav
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Public + user pages share the PublicLayout (top nav + footer)
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/articles/:slug', element: withSuspense(<ArticleDetailPage />) },
      { path: '/categories', element: <CategoryIndexPage /> },
      { path: '/categories/:slug', element: <CategoryArchivePage /> },
      { path: '/tags', element: <TagIndexPage /> },
      { path: '/tags/:name', element: <TagArchivePage /> },
      { path: '/search', element: <SearchResultsPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/users/:username', element: <AuthorProfilePage /> },

      // User-only routes
      {
        element: <RequireAuth />,
        children: [
          { path: '/me', element: withSuspense(<MePage />) },
          { path: '/write', element: withSuspense(<WritePage />) },
          { path: '/write/:id', element: withSuspense(<WritePage />) },
        ],
      },
    ],
  },

  // Admin-only — separate layout with sidebar
  {
    element: <RequireAuth role="ADMIN" />,
    children: [
      {
        element: withSuspense(<AdminLayout />),
        children: [
          { path: '/admin', element: withSuspense(<AdminDashboardPage />) },
          { path: '/admin/articles', element: withSuspense(<AdminArticlesPage />) },
          { path: '/admin/categories', element: withSuspense(<AdminCategoriesPage />) },
          { path: '/admin/tags', element: withSuspense(<AdminTagsPage />) },
          { path: '/admin/users', element: withSuspense(<AdminUsersPage />) },
          { path: '/admin/comments', element: withSuspense(<AdminCommentsPage />) },
          { path: '/admin/about', element: withSuspense(<AdminAboutPage />) },
          { path: '/admin/site', element: withSuspense(<AdminSiteInfoPage />) },
        ],
      },
    ],
  },

  { path: '*', element: <div className="p-10 text-center text-steel">页面未找到</div> },
])
