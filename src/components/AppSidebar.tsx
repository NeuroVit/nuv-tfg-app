import { NavLink } from 'react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  UserCircle2,
  UserSquare2,
  Users,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/movimientos', label: 'Movimientos', icon: Activity },
  { to: '/alertas', label: 'Alertas', icon: AlertTriangle },
  { to: '/analitica', label: 'Analítica', icon: BarChart3 },
  { to: '/clientes', label: 'Clientes', icon: UserSquare2 },
  { to: '/ventas', label: 'Ventas', icon: ReceiptText },
]

const settingsNavItems = [
  { to: '/settings/profile', label: 'Profile', icon: UserCircle2 },
  { to: '/settings/users', label: 'Users', icon: Users },
  { to: '/settings/general', label: 'General', icon: SlidersHorizontal },
  { to: '/settings/security', label: 'Security', icon: ShieldCheck },
]

type AppSidebarProps = {
  isSettingsRoute?: boolean
}

export function AppSidebar({ isSettingsRoute = false }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {isSettingsRoute ? (
              <NavLink to="/dashboard">
                {({ isActive }) => (
                  <SidebarMenuButton isActive={isActive} size="lg" tooltip="Volver a la app">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <ArrowLeft className="h-4 w-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">Volver a la app</span>
                      <span className="truncate text-xs text-muted-foreground">Regresar al dashboard</span>
                    </div>
                  </SidebarMenuButton>
                )}
              </NavLink>
            ) : (
              <SidebarMenuButton size="lg" className="cursor-default">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary text-[10px] font-semibold text-sidebar-primary-foreground">
                  NS
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">NeuralStock</span>
                  <span className="truncate text-xs text-muted-foreground">Logo próximamente</span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isSettingsRoute ? 'Ajustes' : 'Plataforma'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(isSettingsRoute ? settingsNavItems : navItems).map((item) => (
                <SidebarMenuItem key={item.to}>
                  <NavLink to={item.to}>
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
