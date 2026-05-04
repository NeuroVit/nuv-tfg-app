import { createBrowserRouter } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '../components/AppLayout'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ProductosPage from '../pages/ProductosPage'
import CategoriasPage from '../pages/CategoriasPage'
import BundlesPage from '../pages/BundlesPage'
import ProveedoresPage from '../pages/ProveedoresPage'
import PedidosPage from '../pages/PedidosPage'
import NotFoundPage from '../pages/NotFoundPage'
import SettingsPage from '../pages/SettingsPage'
import Inicio from '../pages/Inicio'

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
          { path: '/', element: <Inicio /> },
          { path: '/inicio', element: <Inicio /> },
          { path: '/dashboard', element: <Inicio /> },
          { path: '/productos', element: <ProductosPage /> },
          { path: '/categorias', element: <CategoriasPage /> },
          { path: '/bundles', element: <BundlesPage /> },
          { path: '/proveedores', element: <ProveedoresPage /> },
          { path: '/pedidos', element: <PedidosPage /> },
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
