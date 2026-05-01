import { createBrowserRouter } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '../components/AppLayout'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import DashboardPage from '../pages/DashboardPage'
import ProductosPage from '../pages/ProductosPage'
import CategoriasPage from '../pages/CategoriasPage'
import NotFoundPage from '../pages/NotFoundPage'
import SettingsPage from '../pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/productos', element: <ProductosPage /> },
          { path: '/categorias', element: <CategoriasPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
