import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { HomePage } from './pages/Home'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { MePage } from './pages/Me'
import { AdminPlaceholder } from './pages/AdminPlaceholder'
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

      // User-only routes
      {
        element: <RequireAuth />,
        children: [{ path: '/me', element: <MePage /> }],
      },
    ],
  },

  // Admin-only standalone
  {
    element: <RequireAuth role="ADMIN" />,
    children: [{ path: '/admin', element: <AdminPlaceholder /> }],
  },

  { path: '*', element: <div className="p-10 text-center text-steel">页面未找到</div> },
])
