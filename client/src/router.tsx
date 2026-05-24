import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { HomePage } from './pages/Home'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { MePage } from './pages/Me'
import { WritePage } from './pages/Write'
import { ArticleDetailPage } from './pages/ArticleDetail'
import { CategoryIndexPage } from './pages/CategoryIndex'
import { CategoryArchivePage } from './pages/CategoryArchive'
import { TagIndexPage } from './pages/TagIndex'
import { TagArchivePage } from './pages/TagArchive'
import { SearchResultsPage } from './pages/SearchResults'
import { AboutPage } from './pages/About'
import { AuthorProfilePage } from './pages/AuthorProfile'
import { AdminDashboardPage } from './pages/admin/Dashboard'
import { AdminArticlesPage } from './pages/admin/Articles'
import { AdminCategoriesPage } from './pages/admin/Categories'
import { AdminTagsPage } from './pages/admin/Tags'
import { AdminUsersPage } from './pages/admin/Users'
import { AdminCommentsPage } from './pages/admin/Comments'
import { AdminAboutPage } from './pages/admin/About'
import { AdminSiteInfoPage } from './pages/admin/SiteInfo'
import { RequireAuth } from './components/RequireAuth'

export const router = createBrowserRouter([
  // Auth pages: standalone full-screen layout, no top nav
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Public + user pages share the PublicLayout (top nav + footer)
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/articles/:slug', element: <ArticleDetailPage /> },
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
          { path: '/me', element: <MePage /> },
          { path: '/write', element: <WritePage /> },
          { path: '/write/:id', element: <WritePage /> },
        ],
      },
    ],
  },

  // Admin-only — separate layout with sidebar
  {
    element: <RequireAuth role="ADMIN" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/admin/articles', element: <AdminArticlesPage /> },
          { path: '/admin/categories', element: <AdminCategoriesPage /> },
          { path: '/admin/tags', element: <AdminTagsPage /> },
          { path: '/admin/users', element: <AdminUsersPage /> },
          { path: '/admin/comments', element: <AdminCommentsPage /> },
          { path: '/admin/about', element: <AdminAboutPage /> },
          { path: '/admin/site', element: <AdminSiteInfoPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <div className="p-10 text-center text-steel">页面未找到</div> },
])
