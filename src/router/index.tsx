import { createBrowserRouter, Navigate } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '../components/AppLayout'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import CreateOrganizationPage from '../pages/CreateOrganizationPage'
import ProductosPage from '../pages/ProductosPage'
import CategoriasPage from '../pages/CategoriasPage'
import BundlesPage from '../pages/BundlesPage'
import ProveedoresPage from '../pages/ProveedoresPage'
import PedidosPage from '../pages/PedidosPage'
import NotFoundPage from '../pages/NotFoundPage'
import SettingsPage from '../pages/SettingsPage'
import Inicio from '../pages/Inicio'
import MovimientosPage from '../pages/MovimientosPage'
import AlertasPage from '../pages/AlertasPage'
import AnaliticaResumenPage from '../pages/analytics/AnaliticaResumenPage'
import AnaliticaVentasRentabilidadPage from '../pages/analytics/AnaliticaVentasRentabilidadPage'
import AnaliticaInventarioPage from '../pages/analytics/AnaliticaInventarioPage'
import AnaliticaPreciosBundlesPage from '../pages/analytics/AnaliticaPreciosBundlesPage'
import AnaliticaProveedoresPage from '../pages/analytics/AnaliticaProveedoresPage'
import ProveedorDetailPage from '../pages/ProveedorDetailPage'
import ClientesPage from '../pages/ClientesPage'
import VentasPage from '../pages/VentasPage'
import ReportesPage from '../pages/ReportesPage'
import TareasPage from '../pages/TareasPage'
import BillingPage from '../pages/BillingPage'
import SettingsProfilePage from '../pages/settings/SettingsProfilePage'
import SettingsSecurityPage from '../pages/settings/SettingsSecurityPage'
import SettingsUsersPage from '../pages/settings/SettingsUsersPage'
import SettingsOrganizationPage from '../pages/settings/SettingsOrganizationPage'

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
