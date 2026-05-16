import { createBrowserRouter, Navigate } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '../components/AppLayout'
import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import CreateOrganizationPage from '@/features/organizaciones/pages/CreateOrganizationPage'
import ProductosPage from '@/features/productos/pages/ProductosPage'
import CategoriasPage from '@/features/categorias/pages/CategoriasPage'
import BundlesPage from '@/features/bundles/pages/BundlesPage'
import ProveedoresPage from '@/features/proveedores/pages/ProveedoresPage'
import PedidosPage from '@/features/pedidosproveedor/pages/PedidosPage'
import NotFoundPage from '../pages/NotFoundPage'
import SettingsPage from '@/features/settings/pages/SettingsPage'
import Inicio from '@/features/inicio/pages/Inicio'
import MovimientosPage from '@/features/inventario/pages/MovimientosPage'
import AlertasPage from '@/features/alertas/pages/AlertasPage'
import AnaliticaResumenPage from '@/features/analitica/pages/AnaliticaResumenPage'
import AnaliticaVentasRentabilidadPage from '@/features/analitica/pages/AnaliticaVentasRentabilidadPage'
import AnaliticaInventarioPage from '@/features/analitica/pages/AnaliticaInventarioPage'
import AnaliticaPreciosBundlesPage from '@/features/analitica/pages/AnaliticaPreciosBundlesPage'
import AnaliticaProveedoresPage from '@/features/analitica/pages/AnaliticaProveedoresPage'
import ProveedorDetailPage from '@/features/proveedores/pages/ProveedorDetailPage'
import ClientesPage from '@/features/clientes/pages/ClientesPage'
import VentasPage from '@/features/ventas/pages/VentasPage'
import ReportesPage from '@/features/reportes/pages/ReportesPage'
import TareasPage from '@/features/tareas/pages/TareasPage'
import BillingPage from '@/features/billing/pages/BillingPage'
import SettingsProfilePage from '@/features/settings/pages/SettingsProfilePage'
import SettingsSecurityPage from '@/features/settings/pages/SettingsSecurityPage'
import SettingsUsersPage from '@/features/settings/pages/SettingsUsersPage'
import SettingsOrganizationPage from '@/features/settings/pages/SettingsOrganizationPage'

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
        path: '/onboarding/organization',
        element: <CreateOrganizationPage />,
      },
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
          { path: '/proveedores/:id', element: <ProveedorDetailPage /> },
          { path: '/pedidos', element: <PedidosPage /> },
          { path: '/movimientos', element: <MovimientosPage /> },
          { path: '/alertas', element: <AlertasPage /> },
          { path: '/tareas', element: <TareasPage /> },
          { path: '/analitica', element: <Navigate to="/analitica/resumen" replace /> },
          { path: '/analitica/resumen', element: <AnaliticaResumenPage /> },
          { path: '/analitica/ventas-rentabilidad', element: <AnaliticaVentasRentabilidadPage /> },
          { path: '/analitica/inventario', element: <AnaliticaInventarioPage /> },
          { path: '/analitica/precios-bundles', element: <AnaliticaPreciosBundlesPage /> },
          { path: '/analitica/proveedores', element: <AnaliticaProveedoresPage /> },
          { path: '/usuarios', element: <Navigate to="/settings/users" replace /> },
          { path: '/clientes', element: <ClientesPage /> },
          { path: '/ventas', element: <VentasPage /> },
          { path: '/reportes', element: <ReportesPage /> },
          { path: '/billing', element: <BillingPage /> },
          { path: '/settings', element: <Navigate to="/settings/general" replace /> },
          { path: '/settings/profile', element: <SettingsProfilePage /> },
          { path: '/settings/organization', element: <SettingsOrganizationPage /> },
          { path: '/settings/users', element: <SettingsUsersPage /> },
          { path: '/settings/general', element: <SettingsPage /> },
          { path: '/settings/security', element: <SettingsSecurityPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
